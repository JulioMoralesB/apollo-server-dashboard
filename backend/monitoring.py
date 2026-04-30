import asyncio
import logging

import config_loader
import httpx
from yaml_models import YamlService

logger = logging.getLogger(__name__)

_status_cache: dict[str, str] = {}


def get_status(name: str) -> str:
    return _status_cache.get(name, "unknown")


async def _check_http(svc: YamlService) -> None:
    url = svc.monitor_url
    headers = dict(svc.monitor_headers) if svc.monitor_headers else {}
    try:
        async with httpx.AsyncClient(timeout=svc.monitor_timeout) as client:
            for attempt in range(svc.monitor_retries + 1):
                try:
                    resp = await client.get(url, headers=headers)
                    ok = resp.status_code == svc.monitor_expect_status
                    if ok and svc.monitor_expect_body:
                        ok = svc.monitor_expect_body in resp.text
                    _status_cache[svc.name] = "online" if ok else "offline"
                    logger.debug("Monitor %s -> %s", svc.name, _status_cache[svc.name])
                    return
                except httpx.RequestError as exc:
                    logger.warning(
                        "Monitor request failed for '%s' (attempt %d/%d): %s",
                        svc.name, attempt + 1, svc.monitor_retries + 1, exc,
                    )
                    if attempt < svc.monitor_retries:
                        await asyncio.sleep(1)
            _status_cache[svc.name] = "offline"
    except Exception as exc:
        logger.warning("Monitor check failed for '%s': %s", svc.name, exc)
        _status_cache[svc.name] = "offline"


async def _check_docker(svc: YamlService) -> None:
    try:
        from docker_client import get_container_status
        status = await asyncio.to_thread(get_container_status, svc.docker_container)
        _status_cache[svc.name] = status
        logger.debug("Docker monitor %s -> %s", svc.name, status)
    except Exception as exc:
        logger.warning("Docker check failed for '%s': %s", svc.name, exc)
        _status_cache[svc.name] = "unknown"


async def run_monitoring_loop() -> None:
    last_check: dict[str, float] = {}

    while True:
        services = config_loader.get_services()
        http_services = [
            s for s in services
            if s.monitor and not s.use_docker_health and s.monitor_url
        ]
        docker_services = [
            s for s in services
            if s.monitor and s.use_docker_health and s.docker_container
        ]

        now = asyncio.get_event_loop().time()
        pending = []
        for svc in http_services:
            if now - last_check.get(svc.name, 0) >= svc.monitor_interval:
                pending.append(_check_http(svc))
                last_check[svc.name] = now
        for svc in docker_services:
            if now - last_check.get(svc.name, 0) >= svc.monitor_interval:
                pending.append(_check_docker(svc))
                last_check[svc.name] = now
        if pending:
            await asyncio.gather(*pending, return_exceptions=True)
        await asyncio.sleep(10)
