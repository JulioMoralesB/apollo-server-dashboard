import json
import logging
import os
import time

from dotenv import load_dotenv
import httpx
from fastapi import APIRouter

import http_client
from models import Action, Service, ActionResult

logger = logging.getLogger(__name__)

load_dotenv()

FREE_GAMES_NOTIFIER_URL = os.getenv(
    "FREE_GAMES_NOTIFIER_URL", "http://free-games-notifier:8000"
).rstrip("/")

FREE_GAMES_NOTIFIER_API_KEY = os.getenv("FREE_GAMES_NOTIFIER_API_KEY", "")

FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL = os.getenv("FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL", "")

_CACHE_TTL = 30  # seconds
_cache: dict = {}

router = APIRouter(prefix="/services/free-games-notifier", tags=["free-games-notifier"])


def _upstream_error(exc: httpx.HTTPStatusError) -> str:
    """Return the 'detail' field from the upstream JSON response, or a generic HTTP error."""
    try:
        detail = exc.response.json().get("detail")
        if detail:
            return str(f"HTTP {exc.response.status_code}: {detail}")
    except Exception:
        pass
    return f"HTTP {exc.response.status_code}"

_ACTIONS = [
    Action(label='Resend Notification', icon='send', endpoint='/services/free-games-notifier/resend', method='POST', confirm=True),
    Action(label='Resend Test Notification', icon='send-horizontal', endpoint='/services/free-games-notifier/resend/test', method='POST'),
]

@router.post("/resend")
def resend_notification() -> ActionResult:
    url = f"{FREE_GAMES_NOTIFIER_URL}/notify/discord/resend"
    client = http_client.get()
    try:
        logger.info("POST %s", url)
        response = client.post(url, headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY})
        response.raise_for_status()
        return ActionResult(success=True)
    except httpx.HTTPStatusError as exc:
        logger.warning("POST %s -> HTTP %s: %s", url, exc.response.status_code, exc.response.text)
        return ActionResult(success=False, message=_upstream_error(exc))
    except httpx.RequestError as exc:
        logger.warning("POST %s failed: %s", url, exc)
        return ActionResult(success=False, message="Service unreachable: " + str(exc))

@router.post("/resend/test")
def resend_test_notification() -> ActionResult:
    if not FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL:
        logger.warning("Test webhook URL not configured")
        return ActionResult(success=False, message="Test webhook URL not configured")

    url = f"{FREE_GAMES_NOTIFIER_URL}/notify/discord/resend"
    client = http_client.get()
    try:
        logger.info("POST %s (test webhook)", url)
        response = client.post(
            url,
            headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY},
            json={"webhook_url": FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL},
        )
        response.raise_for_status()
        return ActionResult(success=True)
    except httpx.HTTPStatusError as exc:
        logger.warning("POST %s (test webhook) -> HTTP %s: %s", url, exc.response.status_code, exc.response.text)
        return ActionResult(success=False, message=_upstream_error(exc))
    except httpx.RequestError as exc:
        logger.warning("POST %s (test webhook) failed: %s", url, exc)
        return ActionResult(success=False, message="Service unreachable: " + str(exc))
    

def _fetch_status() -> str:
    client = http_client.get()
    try:
        logger.debug("Checking Free Games Notifier health at %s/health", FREE_GAMES_NOTIFIER_URL)
        response = client.get(f"{FREE_GAMES_NOTIFIER_URL}/health", headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY})
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
    return Service(name="Free Games Notifier", status=status, icon="bell-ring", actions=_ACTIONS)
