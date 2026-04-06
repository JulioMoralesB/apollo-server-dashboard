from fastapi import APIRouter
from models import Action, Service

router = APIRouter(prefix="/services/homeassistant", tags=["homeassistant"])

def get_card() -> Service:
    return Service(name="Home Assistant", status="unknown", icon="home", url="https://homeassistant.apollox10.com")
