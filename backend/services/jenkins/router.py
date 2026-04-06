from fastapi import APIRouter
from models import Service

router = APIRouter(prefix="/services/jenkins", tags=["jenkins"])

def get_card() -> Service:
    return Service(name="Jenkins", status="unknown", icon="git-branch", url="https://jenkins.server.apollox10.com")
