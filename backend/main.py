"""FastAPI application entry point: auth, lifespan, and top-level API routes."""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

import config_loader
import http_client
from auth import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    TokenPairResponse,
    authenticate,
    create_token_pair,
    refresh_access_token,
    verify_access_token,
)
from config_service import build_config_router, yaml_to_card
from dotenv import load_dotenv
from fastapi import FastAPI, Security
from fastapi.middleware.cors import CORSMiddleware
from models import Service, VersionResponse
from monitoring import run_monitoring_loop
from yaml_models import YamlService

load_dotenv()

logging.basicConfig(level=logging.INFO)

APP_VERSION = os.getenv("APP_VERSION", "dev")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown: load config, init HTTP client, start monitor."""
    config_loader.load_config()
    http_client.init()
    app.include_router(build_config_router())
    monitor_task = asyncio.create_task(run_monitoring_loop())
    yield
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass
    http_client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)


@app.post("/auth/login")
def login(credentials: LoginRequest) -> TokenPairResponse:
    """Validate username/password and issue an access + refresh token pair."""
    authenticate(credentials.username, credentials.password)
    return create_token_pair()


@app.post("/auth/refresh")
def refresh(payload: RefreshRequest) -> AccessTokenResponse:
    """Exchange a valid refresh token for a new access token."""
    return refresh_access_token(payload.refresh_token)


@app.get("/version")
def get_version() -> VersionResponse:
    """Return the running backend's version so the frontend can detect a stale build."""
    return VersionResponse(version=APP_VERSION)


@app.get("/services", dependencies=[Security(verify_access_token)])
def get_services() -> list[Service]:
    """Return all service cards with their current monitoring status."""
    return [yaml_to_card(svc) for svc in config_loader.get_services()]


@app.get("/config", dependencies=[Security(verify_access_token)])
def get_config() -> list[YamlService]:
    """Return the raw service definitions from the active config file."""
    return config_loader.get_services()


@app.put("/config", dependencies=[Security(verify_access_token)])
def put_config(services: list[YamlService]) -> list[YamlService]:
    """Replace the full service list and persist it to the config file."""
    config_loader.save_config(services)
    return config_loader.get_services()
