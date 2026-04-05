import httpx

_client: httpx.Client | None = None


def init() -> None:
    global _client
    _client = httpx.Client(timeout=5)


def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get() -> httpx.Client:
    if _client is None:
        raise RuntimeError("HTTP client not initialized")
    return _client
