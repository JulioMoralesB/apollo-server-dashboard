"""Helper to call upstream services and wrap the result in an ActionResult."""
import json
import logging

import http_client
import httpx
from models import ActionResult

logger = logging.getLogger(__name__)

_MAX_BODY_CHARS = 50_000


def _extract_message(raw: str) -> str | None:
    """Pull a human-readable ``message`` out of a JSON object response body.

    Clients such as the Android widget surface ``ActionResult.message`` directly
    (e.g. as a toast) but never look at ``body`` — so an upstream service that
    replies with ``{"message": "..."}`` needs that string promoted here to reach
    them, even though the full raw body is already kept in ``ActionResult.body``.
    """
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except ValueError:
        return None
    if isinstance(parsed, dict):
        message = parsed.get("message")
        if isinstance(message, str):
            return message
    return None


def call_upstream(
    url: str,
    method: str = "POST",
    label: str = "",
    headers: dict | None = None,
    body: dict | None = None,
    timeout: float | None = None,
) -> ActionResult:
    """Call an upstream service with any HTTP method and return an ActionResult.

    Status code and response body are always captured and returned so the
    frontend can display them in the response viewer.
    """
    client = http_client.get()
    tag = f" ({label})" if label else ""
    method_upper = method.upper()
    try:
        logger.info("%s %s%s", method_upper, url, tag)
        kwargs: dict = {}
        if headers is not None:
            kwargs["headers"] = headers
        if body is not None:
            kwargs["json"] = body
        if timeout is not None:
            kwargs["timeout"] = timeout
        response = client.request(method_upper, url, **kwargs)
        status_code = response.status_code
        raw = response.text or ""
        response_body = raw[:_MAX_BODY_CHARS] if raw else None
        message = _extract_message(raw)
        if response.is_success:
            logger.info("%s %s%s -> HTTP %s", method_upper, url, tag, status_code)
            return ActionResult(
                success=True, status_code=status_code, body=response_body, message=message,
            )
        else:
            logger.warning(
                "%s %s%s -> HTTP %s: %s",
                method_upper, url, tag, status_code, raw[:500],
            )
            return ActionResult(
                success=False, status_code=status_code, body=response_body, message=message,
            )
    except httpx.RequestError as exc:
        logger.warning("%s %s%s failed: %s", method_upper, url, tag, exc)
        return ActionResult(success=False, message="Service unreachable: " + str(exc))


def post_to_upstream(
    url: str,
    label: str = "",
    headers: dict | None = None,
    body: dict | None = None,
) -> ActionResult:
    """Convenience wrapper that calls ``call_upstream`` with ``method="POST"``."""
    return call_upstream(url, method="POST", label=label, headers=headers, body=body)
