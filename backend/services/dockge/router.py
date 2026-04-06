from fastapi import APIRouter
from models import Action, Service

router = APIRouter(prefix="/services/dockge", tags=["dockge"])

def get_card() -> Service:
    return Service(name="Dockge", status="unknown", icon="container", url='https://dockge.server.apollox10.com')
