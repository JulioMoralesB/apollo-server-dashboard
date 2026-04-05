from pydantic import BaseModel


class Action(BaseModel):
    label: str
    icon: str
    href: str | None = None      # external link
    endpoint: str | None = None  # API action
    method: str | None = None    # GET, POST, …
    confirm: bool = False


class Service(BaseModel):

    name: str
    status: str
    icon: str | None = None
    actions: list[Action] | None = None


class ActionResult(BaseModel):
    success: bool
    message: str | None = None