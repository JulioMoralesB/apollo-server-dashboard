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


class Service(BaseModel):
    name: str
    status: str


services: list[Service] = [
    Service(name="Minecraft", status="online"),
    Service(name="Epic Games Bot", status="online"),
]


@app.get("/services", response_model=list[Service])
def get_services() -> list[Service]:
    return services
