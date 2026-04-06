from fastapi import APIRouter
from models import Action, Service

router = APIRouter(prefix="/services/karakeep", tags=["karakeep"])

def get_card() -> Service:
    return Service(name="Karakeep", status="unknown", icon="bookmark", url="https://karakeep.server.apollox10.com")
