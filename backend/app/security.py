from __future__ import annotations

import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Response

from app.config import Settings, get_settings

ACCESS_COOKIE = "dt_access"
REFRESH_COOKIE = "dt_refresh"
REFRESH_COOKIE_PATH = "/auth"

_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)

_PASSWORD_POLICY = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{12,128}$")

# Constant-time dummy verify when the email does not exist.
_DUMMY_HASH = _password_hasher.hash(secrets.token_urlsafe(32))


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def dummy_password_verify(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


def password_meets_policy(password: str) -> bool:
    return bool(_PASSWORD_POLICY.fullmatch(password))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(user_id: UUID, settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "typ": "access",
        "iss": cfg.jwt_issuer,
        "aud": cfg.jwt_audience,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=cfg.access_token_minutes)).timestamp()),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, cfg.jwt_secret, algorithm="HS256")


def decode_access_token(token: str, settings: Settings | None = None) -> UUID:
    cfg = settings or get_settings()
    payload = jwt.decode(
        token,
        cfg.jwt_secret,
        algorithms=["HS256"],
        audience=cfg.jwt_audience,
        issuer=cfg.jwt_issuer,
        options={"require": ["exp", "iat", "nbf", "sub", "typ", "iss", "aud", "jti"]},
    )
    if payload.get("typ") != "access":
        raise jwt.InvalidTokenError("wrong token type")
    return UUID(payload["sub"])


def _cookie_common(cfg: Settings) -> dict[str, Any]:
    return {
        "httponly": True,
        "secure": cfg.cookie_secure,
        "samesite": cfg.cookie_samesite,
    }


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    persistent: bool = True,
) -> None:
    cfg = get_settings()
    common = _cookie_common(cfg)
    access_max_age = cfg.access_token_minutes * 60 if persistent else None
    refresh_max_age = cfg.refresh_token_days * 24 * 60 * 60 if persistent else None
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        **common,
        max_age=access_max_age,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        **common,
        max_age=refresh_max_age,
        path=REFRESH_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    cfg = get_settings()
    common = {
        "httponly": True,
        "secure": cfg.cookie_secure,
        "samesite": cfg.cookie_samesite,
    }
    response.delete_cookie(ACCESS_COOKIE, path="/", **common)
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, **common)
