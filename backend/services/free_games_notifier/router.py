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

_ACTIONS = [
    Action(label='Resend Notification', icon='send', endpoint='/services/free-games-notifier/resend', method='POST'),
    Action(label='Resend Test Notification', icon='send-horizontal', endpoint='/services/free-games-notifier/resend/test', method='POST'),
]

@router.post("/resend")
def resend_notification() -> ActionResult:
    client = http_client.get()
    try:
        response = client.post(f"{FREE_GAMES_NOTIFIER_URL}/notify/discord/resend", headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY})
        response.raise_for_status()
        return ActionResult(success=True)
    except httpx.HTTPStatusError as exc:
        logger.warning("Failed to resend notification: HTTP %s", exc.response.status_code)
        return ActionResult(success=False, message=f"HTTP {exc.response.status_code}")
    except httpx.RequestError as exc:
        logger.warning("Failed to resend notification: %s", exc)
        return ActionResult(success=False, message="Service unreachable: " + str(exc))

@router.post("/resend/test")
def resend_test_notification() -> ActionResult:
    if not FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL:
        logger.warning("Test webhook URL not configured")
        return ActionResult(success=False, message="Test webhook URL not configured")

    client = http_client.get()
    try:
        response = client.post(
            f"{FREE_GAMES_NOTIFIER_URL}/notify/discord/resend",
            headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY},
            json={"webhook_url": FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL},
        )
        response.raise_for_status()
        return ActionResult(success=True)
    except httpx.HTTPStatusError as exc:
        logger.warning("Failed to resend test notification: HTTP %s", exc.response.status_code)
        return ActionResult(success=False, message=f"HTTP {exc.response.status_code}")
    except httpx.RequestError as exc:
        logger.warning("Failed to resend test notification: %s", exc)
        return ActionResult(success=False, message="Service unreachable: " + str(exc))
    

def _fetch_status() -> str:
    client = http_client.get()
    try:
        print (f"Checking Free Games Notifier health at {FREE_GAMES_NOTIFIER_URL}/health")
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
    return Service(name="Free Games Notifier", status=status, actions=_ACTIONS)
