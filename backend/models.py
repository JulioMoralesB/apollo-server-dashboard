from pydantic import BaseModel, ConfigDict


class Action(BaseModel):
    label: str
    icon: str
    href: str | None = None      # external link
    endpoint: str | None = None  # API action
    method: str | None = None    # GET, POST, …


class Service(BaseModel):

    name: str
    status: str
    actions: list[Action] | None = None
