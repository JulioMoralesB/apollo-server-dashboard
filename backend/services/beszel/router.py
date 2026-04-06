from fastapi import APIRouter
from models import Service

router = APIRouter(prefix="/services/beszel", tags=["beszel"])

def get_card() -> Service:
    return Service(name="Beszel", status="unknown", icon="server", url="https://beszel.server.apollox10.com")
