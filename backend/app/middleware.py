from __future__ import annotations

import re
from collections.abc import Callable
from urllib.parse import urlparse

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.config import Settings, get_settings
from app.rate_limit import limiter

MUTATING = {"POST", "PUT", "PATCH", "DELETE"}
_DEV_ORIGIN = re.compile(
    r"^https?://("
    r"localhost|127\.0\.0\.1"
    r"|192\.168\.\d{1,3}\.\d{1,3}"
    r"|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}"
    r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
    r")(:\d+)?$"
)


def origin_allowed(origin: str, settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    if origin in cfg.cors_origin_list:
        return True
    if cfg.is_production:
        return False
    if not _DEV_ORIGIN.match(origin):
        return False
    parsed = urlparse(origin)
    return parsed.port in {None, 3000, 3001}


def client_ip(request: Request) -> str:
    settings = get_settings()
    if settings.trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()[:64]
    return (request.client.host if request.client else "unknown")[:64]


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store"
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        if get_settings().is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains"
            )
        return response


class OriginGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method in MUTATING:
            origin = request.headers.get("origin")
            settings = get_settings()
            if not origin or not origin_allowed(origin, settings):
                return JSONResponse(
                    status_code=403,
                    content={"detail": {"code": "bad_origin", "message": "Invalid request origin."}},
                )
        return await call_next(request)


class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        ip = client_ip(request)
        if not limiter.allow(f"ip:{ip}", 120, 60):
            return JSONResponse(
                status_code=429,
                content={"detail": {"code": "rate_limited", "message": "Too many requests. Please wait and try again."}},
            )
        return await call_next(request)
