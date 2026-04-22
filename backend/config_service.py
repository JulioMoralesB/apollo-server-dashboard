import logging
import re

from fastapi import APIRouter, HTTPException
from models import Action, ActionResult, Service
from monitoring import get_status
from upstream import call_upstream
from yaml_models import YamlService

import config_loader

logger = logging.getLogger(__name__)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def yaml_to_card(svc: YamlService) -> Service:
    actions: list[Action] = []
    if svc.actions:
        slug = _slug(svc.name)
        for action in svc.actions:
            if action.method.lower() == "href":
                actions.append(Action(label=action.label, icon=action.icon, href=action.endpoint))
            else:
                backend_path = f"/services/{slug}/actions/{_slug(action.label)}"
                actions.append(Action(
                    label=action.label,
                    icon=action.icon,
                    endpoint=backend_path,
                    method=action.method,
                    confirm=action.confirm,
                ))
    return Service(
        name=svc.name,
        status=get_status(svc.name),
        icon=svc.icon or "server",
        url=svc.url,
        actions=actions or None,
    )


def action_dispatcher(service_slug: str, action_slug: str) -> ActionResult:
    """Single handler for all action routes — reads live config on every call.

    This means adding, editing, or removing services with actions from the
    Admin UI takes effect immediately without a backend restart.
    """
    services = config_loader.get_services()

    svc = next((s for s in services if _slug(s.name) == service_slug), None)
    if svc is None:
        raise HTTPException(status_code=404, detail=f"Service '{service_slug}' not found")

    action = next(
        (a for a in (svc.actions or []) if _slug(a.label) == action_slug),
        None,
    )
    if action is None:
        raise HTTPException(status_code=404, detail=f"Action '{action_slug}' not found on service '{service_slug}'")

    if action.method.lower() == "href":
        raise HTTPException(status_code=400, detail="href actions are client-side navigation, not callable endpoints")

    if not svc.action_url:
        raise HTTPException(status_code=500, detail=f"Service '{svc.name}' has no action-url configured")

    upstream_url = svc.action_url.rstrip("/") + action.endpoint
    headers = dict(svc.action_headers) if svc.action_headers else None

    logger.info("Dispatch %s /services/%s/actions/%s -> %s", action.method.upper(), service_slug, action_slug, upstream_url)
    return call_upstream(upstream_url, method=action.method, label=action.label, headers=headers, body=action.body, timeout=svc.action_timeout)


def build_config_router() -> APIRouter:
    """Return a router with a single catch-all dispatcher for all action endpoints.

    Routes are no longer baked at startup — the dispatcher reads live config on
    every request, so config changes from the Admin UI take effect immediately.
    """
    router = APIRouter()
    router.add_api_route(
        "/services/{service_slug}/actions/{action_slug}",
        action_dispatcher,
        methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        response_model=ActionResult,
    )
    logger.info("Registered live-config action dispatcher at /services/{service_slug}/actions/{action_slug}")
    return router
