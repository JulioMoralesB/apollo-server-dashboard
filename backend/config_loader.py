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

_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BACKEND_DIR.parent
DEFAULT_CONFIG_PATH = _PROJECT_ROOT / "config" / "services.yaml"
EXAMPLE_PATH = _BACKEND_DIR / "services.example.yaml"

_services: list[YamlService] = []
_config_path: Path = DEFAULT_CONFIG_PATH

_ENV_VAR_RE = re.compile(r"\$\{(\w+)\}")


def _interpolate_inner(value: Any, missing: set[str]) -> Any:
    """Recursively substitute ${VAR_NAME} placeholders,
    collecting names of missing env vars.
    """
    if isinstance(value, str):
        def _replace(m: re.Match) -> str:
            var = m.group(1)
            env_val = os.getenv(var)
            if env_val is None:
                missing.add(var)
                return m.group(0)
            return env_val

        return _ENV_VAR_RE.sub(_replace, value)
    if isinstance(value, dict):
        return {k: _interpolate_inner(v, missing) for k, v in value.items()}
    if isinstance(value, list):
        return [_interpolate_inner(item, missing) for item in value]
    return value


def _interpolate(value: Any) -> Any:
    """Replace ${VAR_NAME} references with environment variable values.

    Raises ValueError listing all unresolved placeholders if any env vars are missing.
    """
    missing: set[str] = set()
    result = _interpolate_inner(value, missing)
    if missing:
        raise ValueError(
            "Undefined environment variable(s) referenced in config: "
            + ", ".join(sorted(missing))
        )
    return result


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
    except PermissionError as err:
        raise FileNotFoundError(
            f"No services.yaml found and could not create one automatically.\n"
            f"Create it manually:\n"
            f"  cp {EXAMPLE_PATH} {config_path}"
        ) from err


def load_config() -> None:
    global _config_path
    config_env = os.getenv("SERVICES_CONFIG")
    config_path = (
        Path(config_env.strip())
        if config_env and config_env.strip()
        else DEFAULT_CONFIG_PATH
    )
    _config_path = config_path

    if not config_path.exists():
        _bootstrap_config(config_path)

    if not config_path.is_file():
        raise ValueError(f"Configuration path '{config_path}' is not a file.")

    try:
        raw_text = config_path.read_text()
    except OSError as e:
        raise ValueError(f"Failed to read '{config_path}': {e}") from e

    try:
        raw = yaml.safe_load(raw_text)
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
            name = (
                item.get("name", f"item #{i}")
                if isinstance(item, dict)
                else f"item #{i}"
            )
            formatted_errors = []
            for err in e.errors():
                loc = err.get("loc", ())
                path = ".".join(str(part) for part in loc) if loc else "<root>"
                formatted_errors.append(f"    - {path}: {err['msg']}")
            errors.append(f"  Service '{name}':\n" + "\n".join(formatted_errors))

    if errors:
        logger.warning(
            "Skipping %d invalid service(s) from %s:\n%s",
            len(errors), config_path, "\n".join(errors),
        )

    global _services
    _services = services
    logger.info("Loaded %d service(s) from %s", len(_services), config_path)


def get_services() -> list[YamlService]:
    return list(_services)


def _to_yaml_dict(svc: YamlService) -> dict:
    raw = svc.model_dump(exclude_none=True)

    def _rename(obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k.replace("_", "-"): _rename(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_rename(item) for item in obj]
        return obj

    return _rename(raw)


def save_config(services: list[YamlService]) -> None:
    data = [_to_yaml_dict(svc) for svc in services]
    yaml_text = yaml.dump(
        data, default_flow_style=False, allow_unicode=True, sort_keys=False
    )
    _config_path.write_text(yaml_text)
    global _services
    _services = services
    logger.info("Saved %d service(s) to %s", len(_services), _config_path)
