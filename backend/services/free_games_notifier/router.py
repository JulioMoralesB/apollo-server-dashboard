import json
import logging
import os
import time

import httpx
from fastapi import APIRouter

import http_client
from models import Action, Service

logger = logging.getLogger(__name__)

FREE_GAMES_NOTIFIER_URL = os.getenv(
    "FREE_GAMES_NOTIFIER_URL", "http://free-games-notifier:8000"
).rstrip("/")

_CACHE_TTL = 30  # seconds
_cache: dict = {}

router = APIRouter(prefix="/services/free-games-notifier", tags=["free-games-notifier"])

_ACTIONS = [
    Action(label="Refresh", icon="↺", endpoint="/services/free-games-notifier/refresh", method="POST"),
]


@router.post("/refresh")
def refresh_status() -> Service:
    _cache.clear()
    return get_card()


def _fetch_status() -> str:
    client = http_client.get()
    try:
        response = client.get(f"{FREE_GAMES_NOTIFIER_URL}/health")
        response.raise_for_status()
        data = response.json()
        return "online" if data.get("status") == "healthy" else "offline"
    except httpx.HTTPStatusError as exc:
        logger.warning("Free Games Notifier returned HTTP %s", exc.response.status_code)
        return "offline"
    except httpx.RequestError as exc:
        logger.warning("Could not reach Free Games Notifier: %s", exc)
        return "offline"
    except json.JSONDecodeError as exc:
        logger.warning("Free Games Notifier returned non-JSON response: %s", exc)
        return "offline"


def get_card() -> Service:
    now = time.monotonic()
    cached = _cache.get("status")
    if cached is not None and now - cached[1] < _CACHE_TTL:
        status = cached[0]
    else:
        status = _fetch_status()
        _cache["status"] = (status, now)
    return Service(name="Free Games Notifier", status=status, actions=_ACTIONS)
