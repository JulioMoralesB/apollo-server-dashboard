from fastapi import APIRouter
from models import Service

router = APIRouter(prefix="/services/uptimekuma", tags=["uptimekuma"])

def get_card() -> Service:
    return Service(name="Uptime Kuma", status="unknown", icon="activity", url="https://uptimekuma.apollox10.com")
