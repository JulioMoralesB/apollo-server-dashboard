from fastapi import APIRouter

from models import Service

router = APIRouter(prefix="/services/minecraft", tags=["minecraft"])

def get_card() -> Service:
    return Service(name="Minecraft", status="online", icon="pickaxe")
