from fastapi import APIRouter
from models import Service

router = APIRouter(prefix="/services/portainer", tags=["portainer"])

def get_card() -> Service:
    return Service(name="Portainer", status="unknown", icon="container", url="https://portainer.server.apollox10.com")
