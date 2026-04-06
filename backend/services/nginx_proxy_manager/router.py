from fastapi import APIRouter
from models import Action, Service

router = APIRouter(prefix="/services/nginx-proxy-manager", tags=["nginx-proxy-manager"])

def get_card() -> Service:
    return Service(name="Nginx Proxy Manager", status="unknown", icon="network", url="https://npm.server.apollox10.com")
