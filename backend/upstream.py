import logging

import httpx

import http_client
from models import ActionResult

logger = logging.getLogger(__name__)


def _upstream_error(exc: httpx.HTTPStatusError) -> str:
    """Extract a human-readable error message from an upstream HTTP error response.

    Returns the 'detail' field from the JSON body prefixed with the status code,
    or just the status code string if JSON parsing fails or 'detail' is absent.
    """
    try:
        detail = exc.response.json().get("detail")
        if detail:
            return f"HTTP {exc.response.status_code}: {detail}"
    except Exception:
        pass
    return f"HTTP {exc.response.status_code}"


def call_upstream(
    url: str,
    method: str = "POST",
    label: str = "",
    headers: dict | None = None,
    body: dict | None = None,
) -> ActionResult:
    """Call an upstream service with any HTTP method and map exceptions to ActionResult."""
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
        response = client.request(method_upper, url, **kwargs)
        response.raise_for_status()
        return ActionResult(success=True)
    except httpx.HTTPStatusError as exc:
        logger.warning("%s %s%s -> HTTP %s: %s", method_upper, url, tag, exc.response.status_code, exc.response.text)
        return ActionResult(success=False, message=_upstream_error(exc))
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
