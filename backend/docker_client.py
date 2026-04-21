import logging

import docker
import docker.errors

logger = logging.getLogger(__name__)

_client: docker.DockerClient | None = None


def _get_client() -> docker.DockerClient:
    global _client
    if _client is None:
        _client = docker.from_env()
    return _client


def get_container_status(container_name: str) -> str:
    try:
        container = _get_client().containers.get(container_name)
        if container.status != "running":
            return "offline"
        health = container.attrs.get("State", {}).get("Health", {}).get("Status")
        if health is not None:
            return "online" if health == "healthy" else "offline"
        return "online"
    except docker.errors.NotFound:
        logger.warning("Container '%s' not found", container_name)
        return "unknown"
    except Exception as exc:
        logger.warning("Docker status check failed for '%s': %s", container_name, exc)
        return "unknown"
