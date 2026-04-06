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

from services.dockge import get_card as dockge_card
from services.dockge import router as dockge_router

from services.uptimekuma import get_card as uptimekuma_card
from services.uptimekuma import router as uptimekuma_router

from services.homeassistant import get_card as homeassistant_card
from services.homeassistant import router as homeassistant_router

from services.nextcloud import get_card as nextcloud_card
from services.nextcloud import router as nextcloud_router

from services.beszel import get_card as beszel_card
from services.beszel import router as beszel_router

from services.grafana import get_card as grafana_card
from services.grafana import router as grafana_router

from services.jenkins import get_card as jenkins_card
from services.jenkins import router as jenkins_router

from services.karakeep import get_card as karakeep_card
from services.karakeep import router as karakeep_router

from services.n8n import get_card as n8n_card
from services.n8n import router as n8n_router

from services.portainer import get_card as portainer_card
from services.portainer import router as portainer_router

from services.nginx_proxy_manager import get_card as npm_card
from services.nginx_proxy_manager import router as npm_router

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
app.include_router(dockge_router)
app.include_router(uptimekuma_router)
app.include_router(homeassistant_router)
app.include_router(nextcloud_router)
app.include_router(beszel_router)
app.include_router(grafana_router)
app.include_router(jenkins_router)
app.include_router(karakeep_router)
app.include_router(n8n_router)
app.include_router(portainer_router)
app.include_router(npm_router)

@app.get("/services", response_model=list[Service])
def get_services() -> list[Service]:
    return [
        fgn_card(),
        minecraft_card(),
        dockge_card(),
        uptimekuma_card(),
        homeassistant_card(),
        nextcloud_card(),
        beszel_card(),
        grafana_card(),
        jenkins_card(),
        karakeep_card(),
        n8n_card(),
        portainer_card(),
        npm_card(),
    ]
