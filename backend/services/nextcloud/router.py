from fastapi import APIRouter
from models import Action, Service

router = APIRouter(prefix="/services/nextcloud", tags=["nextcloud"])

def get_card() -> Service:
    return Service(name="Nextcloud", status="unknown", icon="cloud", url="https://nextcloud.apollox10.com")
