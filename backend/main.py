from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import http_client
from models import Service
from services.free_games_notifier import get_card as fgn_card
from services.free_games_notifier import router as fgn_router
from services.minecraft import get_card as minecraft_card
from services.minecraft import router as minecraft_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    http_client.init()
    yield
    http_client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(minecraft_router)
app.include_router(fgn_router)


@app.get("/services", response_model=list[Service])
def get_services() -> list[Service]:
    return [
        minecraft_card(),
        fgn_card(),
    ]
