import json
import logging
import os
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger(__name__)

FREE_GAMES_NOTIFIER_URL = os.getenv(
    "FREE_GAMES_NOTIFIER_URL", "http://free-games-notifier:8000"
).rstrip("/")

_CACHE_TTL = 30  # seconds
_cache: dict = {}
_http_client: httpx.Client | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _http_client
    _http_client = httpx.Client(timeout=5)
    yield
    _http_client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


class Service(BaseModel):
    name: str
    status: str


def _fetch_free_games_notifier_status() -> str:
    try:
        response = _http_client.get(f"{FREE_GAMES_NOTIFIER_URL}/health")
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


def check_free_games_notifier() -> str:
    now = time.monotonic()
    cached = _cache.get("free_games_notifier")
    if cached is not None and now - cached[1] < _CACHE_TTL:
        return cached[0]
    status = _fetch_free_games_notifier_status()
    _cache["free_games_notifier"] = (status, now)
    return status


@app.get("/services", response_model=list[Service])
def get_services() -> list[Service]:
    return [
        Service(name="Minecraft", status="online"),
        Service(name="Free Games Notifier", status=check_free_games_notifier()),
    ]
