from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

services = [
    {"name": "Minecraft", "status": "online"},
    {"name": "Epic Games Bot", "status": "online"},
]


@app.get("/services")
def get_services():
    return services
