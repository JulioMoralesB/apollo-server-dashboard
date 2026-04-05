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


def post_to_upstream(
    url: str,
    label: str = "",
    headers: dict | None = None,
    body: dict | None = None,
) -> ActionResult:
    """POST to an upstream service URL and map exceptions to ActionResult.

    Args:
        url: Full URL to POST to.
        label: Optional context tag appended to log messages (e.g. "test webhook").
        headers: Optional HTTP headers to include in the request.
        body: Optional JSON body to send with the request.

    Returns:
        ActionResult with ``success=True`` when the upstream returns a 2xx response.
        ActionResult with ``success=False`` and a ``message`` describing the error
        when the upstream returns a non-2xx status or the request fails entirely.
    """
    client = http_client.get()
    tag = f" ({label})" if label else ""
    try:
        logger.info("POST %s%s", url, tag)
        kwargs: dict = {}
        if headers is not None:
            kwargs["headers"] = headers
        if body is not None:
            kwargs["json"] = body
        response = client.post(url, **kwargs)
        response.raise_for_status()
        return ActionResult(success=True)
    except httpx.HTTPStatusError as exc:
        logger.warning("POST %s%s -> HTTP %s: %s", url, tag, exc.response.status_code, exc.response.text)
        return ActionResult(success=False, message=_upstream_error(exc))
    except httpx.RequestError as exc:
        logger.warning("POST %s%s failed: %s", url, tag, exc)
        return ActionResult(success=False, message="Service unreachable: " + str(exc))
