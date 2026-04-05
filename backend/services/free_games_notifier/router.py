import json
import logging
import os
import time

from dotenv import load_dotenv
import httpx
from fastapi import APIRouter

import http_client
from models import Action, Service, ActionResult
from upstream import post_to_upstream

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
    Action(label='View Dashboard', icon='dashboard', href='https://free-games.apollox10.com/dashboard/'),
    Action(label='Check E2E', icon='shield-check', endpoint='/services/free-games-notifier/check-e2e', method='POST', confirm=True),
    Action(label='Resend Notification', icon='send', endpoint='/services/free-games-notifier/resend', method='POST', confirm=True),
    Action(label='Check Test E2E', icon='shield-cog', endpoint='/services/free-games-notifier/check-e2e/test', method='POST'),
    Action(label='Resend Test Notification', icon='send-horizontal', endpoint='/services/free-games-notifier/resend/test', method='POST'),
    Action(label='GitHub Repo', icon='github', href='https://github.com/JulioMoralesB/free-games-notifier'),
]

@router.post("/check-e2e")
def check_e2e() -> ActionResult:
    return post_to_upstream(
        f"{FREE_GAMES_NOTIFIER_URL}/check",
        headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY},
    )


@router.post("/check-e2e/test")
def check_e2e_test() -> ActionResult:
    if not FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL:
        logger.warning("Test webhook URL not configured")
        return ActionResult(success=False, message="Test webhook URL not configured")
    return post_to_upstream(
        f"{FREE_GAMES_NOTIFIER_URL}/check",
        label="test webhook",
        headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY},
        body={"webhook_url": FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL},
    )


@router.post("/resend")
def resend_notification() -> ActionResult:
    return post_to_upstream(
        f"{FREE_GAMES_NOTIFIER_URL}/notify/discord/resend",
        headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY},
    )


@router.post("/resend/test")
def resend_test_notification() -> ActionResult:
    if not FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL:
        logger.warning("Test webhook URL not configured")
        return ActionResult(success=False, message="Test webhook URL not configured")
    return post_to_upstream(
        f"{FREE_GAMES_NOTIFIER_URL}/notify/discord/resend",
        label="test webhook",
        headers={"X-API-Key": FREE_GAMES_NOTIFIER_API_KEY},
        body={"webhook_url": FREE_GAMES_NOTIFIER_TEST_WEBHOOK_URL},
    )



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
