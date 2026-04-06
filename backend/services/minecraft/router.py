from fastapi import APIRouter
from models import Action, Service

router = APIRouter(prefix="/services/minecraft", tags=["minecraft"])

_ACTIONS = [
    Action(label='AMP Dashboard', icon='external-link', href='https://amp.apollox10.com/'),
]

def get_card() -> Service:
    return Service(name="Minecraft", status="unknown", icon="pickaxe", url='https://amp.apollox10.com/', actions=_ACTIONS)
