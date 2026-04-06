from fastapi import APIRouter
from models import Service

router = APIRouter(prefix="/services/grafana", tags=["grafana"])

def get_card() -> Service:
    return Service(name="Grafana", status="unknown", icon="bar-chart", url="https://grafana.server.apollox10.com")
