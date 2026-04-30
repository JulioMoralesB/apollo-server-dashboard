
import asyncio
import logging
import os
from contextlib import asynccontextmanager

import config_loader
import http_client
from config_service import build_config_router, yaml_to_card
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from models import Service
from monitoring import run_monitoring_loop
from yaml_models import YamlService

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
    app.include_router(build_config_router())
    monitor_task = asyncio.create_task(run_monitoring_loop())
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
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/services")
def get_services() -> list[Service]:
    return [yaml_to_card(svc) for svc in config_loader.get_services()]


@app.get("/config")
def get_config() -> list[YamlService]:
    return config_loader.get_services()


@app.put("/config")
def put_config(services: list[YamlService]) -> list[YamlService]:
    config_loader.save_config(services)
    return config_loader.get_services()
