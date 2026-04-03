import os

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

FREE_GAMES_NOTIFIER_URL = os.getenv(
    "FREE_GAMES_NOTIFIER_URL", "http://free-games-notifier:8000"
)


class Service(BaseModel):
    name: str
    status: str


def check_free_games_notifier() -> str:
    try:
        response = httpx.get(f"{FREE_GAMES_NOTIFIER_URL}/health", timeout=5)
        data = response.json()
        return "online" if data.get("status") == "healthy" else "offline"
    except Exception:
        return "offline"


@app.get("/services", response_model=list[Service])
def get_services() -> list[Service]:
    return [
        Service(name="Minecraft", status="online"),
        Service(name="Epic Games Bot", status=check_free_games_notifier()),
    ]
