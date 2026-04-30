"""Singleton httpx client shared across the application lifetime."""
import httpx

_client: httpx.Client | None = None


def init() -> None:
    """Create the shared httpx client. Called once at application startup."""
    global _client
    _client = httpx.Client(timeout=5)


def close() -> None:
    """Close and discard the shared client. Called at application shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get() -> httpx.Client:
    """Return the shared httpx client. Raises ``RuntimeError`` if not initialized."""
    if _client is None:
        raise RuntimeError("HTTP client not initialized")
    return _client
