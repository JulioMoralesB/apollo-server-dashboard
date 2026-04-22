import logging

import httpx

import http_client
from models import ActionResult

logger = logging.getLogger(__name__)

_MAX_BODY_CHARS = 50_000


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
        if response.is_success:
            logger.info("%s %s%s -> HTTP %s", method_upper, url, tag, status_code)
            return ActionResult(success=True, status_code=status_code, body=response_body)
        else:
            logger.warning("%s %s%s -> HTTP %s: %s", method_upper, url, tag, status_code, raw[:500])
            return ActionResult(success=False, status_code=status_code, body=response_body)
    except httpx.RequestError as exc:
        logger.warning("%s %s%s failed: %s", method_upper, url, tag, exc)
        return ActionResult(success=False, message="Service unreachable: " + str(exc))


def post_to_upstream(
    url: str,
    label: str = "",
    headers: dict | None = None,
    body: dict | None = None,
) -> ActionResult:
    return call_upstream(url, method="POST", label=label, headers=headers, body=body)
