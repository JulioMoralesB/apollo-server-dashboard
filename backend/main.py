import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
import os
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware

import asyncio

import http_client
import config_loader
from config_service import build_config_router, yaml_to_card
from models import Service
from monitoring import run_monitoring_loop

load_dotenv()

logging.basicConfig(level=logging.INFO)

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise RuntimeError("API_KEY environment variable is not set")


api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)


def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        logging.warning(f"Invalid API Key: {api_key}")
        print(f"Invalid API Key: {api_key}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    config_loader.load_config()
    http_client.init()
    services = config_loader.get_services()
    app.include_router(build_config_router(services))
    monitor_task = asyncio.create_task(run_monitoring_loop(services))
    yield
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass
    http_client.close()


app = FastAPI(lifespan=lifespan, dependencies=[Security(verify_api_key)])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/services", response_model=list[Service])
def get_services() -> list[Service]:
    return [yaml_to_card(svc) for svc in config_loader.get_services()]
