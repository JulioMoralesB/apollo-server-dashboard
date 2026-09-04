"""Build dashboard Service cards from YAML config and dispatch action calls."""
import logging
import re

import config_loader
import http_client
import httpx
from auth import verify_access_token
from fastapi import APIRouter, HTTPException, Security
from models import Action, ActionResult, Service
from monitoring import get_status
from upstream import call_upstream
from yaml_models import YamlService

logger = logging.getLogger(__name__)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def yaml_to_card(svc: YamlService) -> Service:
    """Convert a ``YamlService`` config entry into a frontend-ready ``Service`` card."""
    slug = _slug(svc.name)
    actions: list[Action] = []
    if svc.actions:
        for action in svc.actions:
            if action.method.lower() == "href":
                actions.append(Action(
                    label=action.label, icon=action.icon, href=action.endpoint,
                ))
            else:
                backend_path = f"/services/{slug}/actions/{_slug(action.label)}"
                actions.append(Action(
                    label=action.label,
                    icon=action.icon,
                    endpoint=backend_path,
                    method=action.method,
                    confirm=action.confirm,
                    show_response=action.show_response,
                ))
    return Service(
        name=svc.name,
        status=get_status(svc.name),
        icon=svc.icon or "server",
        url=svc.url,
        actions=actions or None,
        summary_endpoint=f"/services/{slug}/summary" if svc.summary_url else None,
    )


def _find_service(service_slug: str) -> YamlService:
    """Look up a configured service by its slug, reading live config on every call."""
    services = config_loader.get_services()
    svc = next((s for s in services if _slug(s.name) == service_slug), None)
    if svc is None:
        raise HTTPException(
            status_code=404, detail=f"Service '{service_slug}' not found"
        )
    return svc


def summary_dispatcher(service_slug: str) -> dict:
    """Live-fetch and pass through a service's own ``/api/summary``-shaped JSON.

    Each service defines its own summary contract — this proxies the raw
    response as-is rather than normalizing it into a shared schema, since a
    dashboard "summary" means something different per service.
    """
    svc = _find_service(service_slug)
    if not svc.summary_url:
        raise HTTPException(
            status_code=404,
            detail=f"Service '{svc.name}' has no summary-url configured",
        )

    client = http_client.get()
    try:
        response = client.get(svc.summary_url, headers=svc.summary_headers)
    except httpx.RequestError as exc:
        logger.warning("Summary fetch failed for '%s': %s", svc.name, exc)
        raise HTTPException(
            status_code=503, detail=f"Service unreachable: {exc}"
        ) from exc

    if response.is_success:
        return response.json()

    logger.warning(
        "Summary fetch for '%s' -> HTTP %s: %s",
        svc.name, response.status_code, response.text[:500],
    )
    # Never forward the upstream's own status code as-is: 401/403 are
    # reserved for *our* access token in this app's convention — authFetch
    # treats any 401/403 response, from any endpoint, as "refresh and retry",
    # so bubbling an upstream auth failure through unchanged would trigger a
    # silent-refresh loop against our own /auth/refresh forever.
    raise HTTPException(status_code=502, detail=response.text[:500])


def action_dispatcher(service_slug: str, action_slug: str) -> ActionResult:
    """Single handler for all action routes — reads live config on every call.

    This means adding, editing, or removing services with actions from the
    Admin UI takes effect immediately without a backend restart.
    """
    svc = _find_service(service_slug)

    action = next(
        (a for a in (svc.actions or []) if _slug(a.label) == action_slug),
        None,
    )
    if action is None:
        raise HTTPException(
            status_code=404,
            detail=f"Action '{action_slug}' not found on service '{service_slug}'",
        )

    if action.method.lower() == "href":
        raise HTTPException(
            status_code=400,
            detail="href actions are client-side navigation, not callable endpoints",
        )

    if not svc.action_url:
        raise HTTPException(
            status_code=500,
            detail=f"Service '{svc.name}' has no action-url configured",
        )

    upstream_url = svc.action_url.rstrip("/") + action.endpoint
    headers = dict(svc.action_headers) if svc.action_headers else None

    logger.info(
        "Dispatch %s /services/%s/actions/%s -> %s",
        action.method.upper(), service_slug, action_slug, upstream_url,
    )
    return call_upstream(
        upstream_url,
        method=action.method,
        label=action.label,
        headers=headers,
        body=action.body,
        timeout=svc.action_timeout,
    )


def build_config_router() -> APIRouter:
    """Return a router with a single catch-all dispatcher for all action endpoints.

    Routes are no longer baked at startup — the dispatcher reads live config on
    every request, so config changes from the Admin UI take effect immediately.
    """
    router = APIRouter(dependencies=[Security(verify_access_token)])
    router.add_api_route(
        "/services/{service_slug}/actions/{action_slug}",
        action_dispatcher,
        methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        response_model=ActionResult,
    )
    router.add_api_route(
        "/services/{service_slug}/summary",
        summary_dispatcher,
        methods=["GET"],
    )
    logger.info(
        "Registered live-config action dispatcher"
        " at /services/{service_slug}/actions/{action_slug}"
    )
    return router
