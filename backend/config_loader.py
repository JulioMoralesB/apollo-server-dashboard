import logging
import os
import re
import shutil
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from yaml_models import YamlService

logger = logging.getLogger(__name__)

DEFAULT_CONFIG_PATH = Path(__file__).parent / "services.yaml"
EXAMPLE_PATH = Path(__file__).parent / "services.example.yaml"

_services: list[YamlService] = []

_ENV_VAR_RE = re.compile(r"\$\{(\w+)\}")


def _interpolate(value: Any) -> Any:
    """Replace ${VAR_NAME} references with their environment variable values."""
    if isinstance(value, str):
        return _ENV_VAR_RE.sub(lambda m: os.getenv(m.group(1), m.group(0)), value)
    if isinstance(value, dict):
        return {k: _interpolate(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_interpolate(item) for item in value]
    return value


def _bootstrap_config(config_path: Path) -> None:
    """Copy services.example.yaml to config_path and raise with setup instructions."""
    try:
        config_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(EXAMPLE_PATH, config_path)
        raise FileNotFoundError(
            f"No services.yaml found — a template has been created at:\n"
            f"  {config_path}\n"
            "Edit it with your services and restart."
        )
    except PermissionError:
        raise FileNotFoundError(
            f"No services.yaml found and could not create one automatically.\n"
            f"Create it manually:\n"
            f"  cp {EXAMPLE_PATH} {config_path}"
        )


def load_config() -> None:
    config_path = Path(os.getenv("SERVICES_CONFIG", DEFAULT_CONFIG_PATH))

    if not config_path.exists():
        _bootstrap_config(config_path)

    try:
        raw = yaml.safe_load(config_path.read_text())
    except yaml.YAMLError as e:
        raise ValueError(f"Failed to parse '{config_path}': {e}") from e

    if not isinstance(raw, list):
        raise ValueError(
            f"'{config_path}' must be a YAML list of services, got {type(raw).__name__}"
        )

    services: list[YamlService] = []
    errors: list[str] = []

    for i, item in enumerate(raw):
        try:
            services.append(YamlService.model_validate(_interpolate(item)))
        except ValidationError as e:
            name = item.get("name", f"item #{i}") if isinstance(item, dict) else f"item #{i}"
            errors.append(f"  Service '{name}':\n" + "\n".join(f"    - {err['msg']}" for err in e.errors()))

    if errors:
        raise ValueError("Invalid service definitions in config:\n" + "\n".join(errors))

    global _services
    _services = services
    logger.info("Loaded %d service(s) from %s", len(_services), config_path)


def get_services() -> list[YamlService]:
    return _services
