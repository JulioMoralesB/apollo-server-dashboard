"""Pydantic models that mirror the services.yaml schema, including validation."""
from typing import Any

from pydantic import BaseModel, model_validator


class YamlAction(BaseModel):
    """A single action entry as defined in services.yaml."""
    label: str
    icon: str
    endpoint: str
    method: str
    body: dict[str, Any] | None = None
    confirm: bool = False
    show_response: bool = False

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_keys(cls, data: Any) -> Any:
        """Convert kebab-case YAML keys to snake_case before field assignment."""
        if not isinstance(data, dict):
            return data
        return {k.replace("-", "_"): v for k, v in data.items()}


class YamlService(BaseModel):
    """A service defined in services.yaml with its monitor and action config."""
    name: str
    icon: str | None = None
    url: str | None = None
    action_url: str | None = None
    action_headers: dict[str, str] | None = None
    action_timeout: int = 30
    docker_container: str | None = None
    monitor: bool = False
    monitor_interval: int = 60
    monitor_timeout: int = 5
    monitor_retries: int = 3
    monitor_url: str | None = None
    monitor_headers: dict[str, str] | None = None
    monitor_expect_status: int = 200
    monitor_expect_body: str | None = None
    use_docker_health: bool = False
    actions: list[YamlAction] | None = None

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_keys(cls, data: Any) -> Any:
        """Convert kebab-case YAML keys to snake_case before field assignment."""
        if not isinstance(data, dict):
            return data
        return {k.replace("-", "_"): v for k, v in data.items()}

    @model_validator(mode="after")
    def validate_monitor_config(self) -> "YamlService":
        """Ensure required monitor fields are present based on the monitor type."""
        if self.monitor:
            if self.use_docker_health and not self.docker_container:
                raise ValueError(
                    f"Service '{self.name}': 'docker-container' is required"
                    " when 'use-docker-health' is true"
                )
            if not self.use_docker_health and not self.monitor_url:
                raise ValueError(
                    f"Service '{self.name}': 'monitor-url' is required when"
                    " 'monitor' is true and 'use-docker-health' is false"
                )
        return self
