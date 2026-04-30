"""Pydantic response models returned by the API to the frontend."""
from pydantic import BaseModel


class Action(BaseModel):
    """A single action button displayed on a service card."""
    label: str
    icon: str
    href: str | None = None      # external link
    endpoint: str | None = None  # API action
    method: str | None = None    # GET, POST, …
    confirm: bool = False
    show_response: bool = False  # show API response body after action


class Service(BaseModel):
    """A service card as rendered on the dashboard, including live status."""

    name: str
    status: str
    icon: str | None = None
    url: str | None = None
    actions: list[Action] | None = None


class ActionResult(BaseModel):
    """Result of an action call returned to the frontend after execution."""

    success: bool
    message: str | None = None
    status_code: int | None = None
    body: str | None = None