from fastapi import APIRouter
from models import Service

router = APIRouter(prefix="/services/n8n", tags=["n8n"])

def get_card() -> Service:
    return Service(name="n8n", status="unknown", icon="zap", url="https://n8n.server.apollox10.com")
