from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.db import grant_app_role
from app.rls import apply_rls
from app.db import admin_engine
from app.routers.auth import router as auth_router
from app.routers.documents import router as documents_router
from app.routers.learning import router as learning_router
from app.routers.network import router as network_router
from app.routers.risk_settings import router as risk_settings_router
from app.routers.transactions import router as transactions_router
from app.services.jobs import recover_stale_jobs
from app.middleware import (
    GlobalRateLimitMiddleware,
    OriginGuardMiddleware,
    SecurityHeadersMiddleware,
)

logger = logging.getLogger("detechtico")
settings = get_settings()


def _validation_message(exc: RequestValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "Please check the submitted values and try again."
    location = errors[0].get("loc", ())
    if "email" in location:
        return "Enter a valid email address."
    if "password" in location:
        return "Password must be 12–128 characters and include a letter and a number."
    if "name" in location:
        return "Enter your name."
    if "accepted_terms" in location:
        return "You must accept the terms to create an account."
    return "Please check the submitted values and try again."


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    grant_app_role()
    apply_rls(admin_engine)
    recover_stale_jobs()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Detechtico API",
        version="1.0.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None if settings.is_production else "/redoc",
        openapi_url=None if settings.is_production else "/openapi.json",
        lifespan=lifespan,
        # Avoid 307 redirects to absolute http://host URLs (breaks Vercel HTTPS proxy).
        redirect_slashes=False,
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(GlobalRateLimitMiddleware)
    app.add_middleware(OriginGuardMiddleware)
    cors_kwargs: dict[str, object] = {
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        "allow_headers": ["Accept", "Content-Type"],
        "expose_headers": [],
        "max_age": 600,
    }
    if settings.is_production:
        cors_kwargs["allow_origins"] = settings.cors_origin_list
    else:
        cors_kwargs["allow_origins"] = settings.cors_origin_list
        cors_kwargs["allow_origin_regex"] = (
            r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?"
        )
    app.add_middleware(CORSMiddleware, **cors_kwargs)

    app.include_router(auth_router)
    app.include_router(documents_router)
    app.include_router(transactions_router)
    app.include_router(risk_settings_router)
    app.include_router(network_router)
    app.include_router(learning_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_: Request, exc: StarletteHTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail:
            return JSONResponse(status_code=exc.status_code, content={"detail": detail})
        message = detail if isinstance(detail, str) else "Request failed."
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": {"code": "http_error", "message": message}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "detail": {
                    "code": "invalid_input",
                    "message": _validation_message(exc),
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(_: Request, exc: Exception):
        logger.exception("Unhandled server error")
        return JSONResponse(
            status_code=500,
            content={
                "detail": {
                    "code": "server_error",
                    "message": "Something went wrong. Please try again.",
                }
            },
        )

    return app


app = create_app()
