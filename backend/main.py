import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
import os
from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader   
from fastapi.middleware.cors import CORSMiddleware

import http_client
from models import Service
from services.free_games_notifier import get_card as fgn_card
from services.free_games_notifier import router as fgn_router
from services.minecraft import get_card as minecraft_card
from services.minecraft import router as minecraft_router

load_dotenv()

logging.basicConfig(level=logging.INFO)

API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise RuntimeError("API_KEY environment variable is not set")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
        )

@asynccontextmanager
async def lifespan(app: FastAPI):
    http_client.init()
    yield
    http_client.close()


app = FastAPI(lifespan=lifespan, dependencies=[Security(verify_api_key)])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(minecraft_router)
app.include_router(fgn_router)


@app.get("/services", response_model=list[Service])
def get_services() -> list[Service]:
    return [
        fgn_card(),
        minecraft_card(),
    ]
