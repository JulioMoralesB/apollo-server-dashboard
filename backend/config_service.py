import logging
import re

from fastapi import APIRouter
from models import Action, ActionResult, Service
from monitoring import get_status
from upstream import call_upstream
from yaml_models import YamlService

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


def _make_handler(url: str, method: str, label: str, headers: dict | None, body: dict | None, timeout: float):
    def handler() -> ActionResult:
        return call_upstream(url, method=method, label=label, headers=headers, body=body, timeout=timeout)
    return handler


def build_config_router(services: list[YamlService]) -> APIRouter:
    router = APIRouter()
    for svc in services:
        if not svc.actions:
            continue
        slug = _slug(svc.name)
        for action in svc.actions:
            if action.method.lower() == "href":
                continue
            if not svc.action_url:
                logger.warning(
                    "Service '%s' action '%s' has method '%s' but no action-url — skipping",
                    svc.name, action.label, action.method,
                )
                continue
            upstream_url = svc.action_url.rstrip("/") + action.endpoint
            path = f"/services/{slug}/actions/{_slug(action.label)}"
            headers = dict(svc.action_headers) if svc.action_headers else None
            handler = _make_handler(upstream_url, action.method, action.label, headers, action.body, svc.action_timeout)
            router.add_api_route(path, handler, methods=[action.method.upper()], response_model=ActionResult)
            logger.info("Registered %s %s -> %s (timeout=%ss)", action.method.upper(), path, upstream_url, svc.action_timeout)
    return router
