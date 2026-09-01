"""Username/password login and JWT access/refresh token handling.

Single-user auth: credentials come from DASHBOARD_USER/DASHBOARD_PASSWORD env
vars, compared with bcrypt. Login issues a short-lived access token and a
long-lived refresh token so background clients (the dashboard's own polling,
and non-interactive clients like home-screen widgets) can silently renew
access without ever re-prompting for credentials, as long as the refresh
token itself is still valid.
"""
import os
import time
import uuid

import bcrypt
import jwt
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

DASHBOARD_USER = os.getenv("DASHBOARD_USER")
DASHBOARD_PASSWORD = os.getenv("DASHBOARD_PASSWORD")
JWT_SECRET = os.getenv("JWT_SECRET")

if not DASHBOARD_USER or not DASHBOARD_PASSWORD:
    raise RuntimeError(
        "DASHBOARD_USER and DASHBOARD_PASSWORD environment variables must be set"
    )
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is not set")

_PASSWORD_HASH = bcrypt.hashpw(DASHBOARD_PASSWORD.encode(), bcrypt.gensalt())

ACCESS_TOKEN_TTL_SECONDS = 15 * 60
REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60
JWT_ALGORITHM = "HS256"

bearer_scheme = HTTPBearer(auto_error=True)


class LoginRequest(BaseModel):
    """Username/password submitted to ``POST /auth/login``."""

    username: str
    password: str


class RefreshRequest(BaseModel):
    """Refresh token submitted to ``POST /auth/refresh``."""

    refresh_token: str


class AccessTokenResponse(BaseModel):
    """A freshly issued access token."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_TTL_SECONDS


class TokenPairResponse(AccessTokenResponse):
    """An access token plus the refresh token used to renew it."""

    refresh_token: str


def authenticate(username: str, password: str) -> None:
    """Validate credentials against DASHBOARD_USER/DASHBOARD_PASSWORD.

    Raises 401 on any mismatch. Always runs the bcrypt comparison even when
    the username is already wrong, so a bad username can't be distinguished
    from a bad password by response timing.
    """
    valid_user = username == DASHBOARD_USER
    valid_password = bcrypt.checkpw(password.encode(), _PASSWORD_HASH)
    if not (valid_user and valid_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )


def _create_token(token_type: str, ttl_seconds: int) -> str:
    now = int(time.time())
    payload = {
        "sub": DASHBOARD_USER,
        "type": token_type,
        "iat": now,
        "exp": now + ttl_seconds,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_token_pair() -> TokenPairResponse:
    """Issue a fresh access + refresh token pair after a successful login."""
    return TokenPairResponse(
        access_token=_create_token("access", ACCESS_TOKEN_TTL_SECONDS),
        refresh_token=_create_token("refresh", REFRESH_TOKEN_TTL_SECONDS),
    )


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired"
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc


def refresh_access_token(refresh_token: str) -> AccessTokenResponse:
    """Exchange a valid, non-expired refresh token for a new access token.

    No username/password required — this is what lets a background client
    (the dashboard's polling loop, or a non-interactive widget) silently stay
    logged in without ever showing a login prompt, as long as the refresh
    token itself hasn't expired.
    """
    payload = _decode(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not a refresh token"
        )
    return AccessTokenResponse(
        access_token=_create_token("access", ACCESS_TOKEN_TTL_SECONDS)
    )


def verify_access_token(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
) -> None:
    """FastAPI dependency: verify the bearer token is a live, unexpired access token."""
    payload = _decode(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not an access token"
        )
