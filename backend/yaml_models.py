from typing import Any
from pydantic import BaseModel, model_validator


class YamlAction(BaseModel):
    label: str
    icon: str
    endpoint: str
    method: str
    body: dict[str, Any] | None = None
    confirm: bool = False


class YamlService(BaseModel):
    name: str
    icon: str | None = None
    url: str | None = None
    action_url: str | None = None
    action_headers: dict[str, str] | None = None
    docker_container: str | None = None
    monitor: bool = False
    monitor_interval: int = 60
    monitor_timeout: int = 5
    monitor_retries: int = 3
    monitor_url: str | None = None
    monitor_expect_status: int = 200
    monitor_expect_body: str | None = None
    use_docker_health: bool = False
    actions: list[YamlAction] | None = None

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_keys(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        return {k.replace("-", "_"): v for k, v in data.items()}

    @model_validator(mode="after")
    def validate_monitor_url(self) -> "YamlService":
        if self.monitor and not self.use_docker_health and not self.monitor_url:
            raise ValueError(
                f"Service '{self.name}': 'monitor-url' is required when 'monitor' is true and 'use-docker-health' is false"
            )
        return self
