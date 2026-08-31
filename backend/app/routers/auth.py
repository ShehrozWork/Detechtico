from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db, set_rls_user
from app.errors import INVALID_CREDENTIALS, RATE_LIMITED, UNAUTHORIZED, error
from app.middleware import client_ip
from app.models import PasswordResetToken, RefreshToken, User
from app.rate_limit import limiter
from app.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserOut,
)
from app.security import (
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    clear_auth_cookies,
    create_access_token,
    decode_access_token,
    dummy_password_verify,
    hash_password,
    hash_token,
    new_refresh_token,
    password_meets_policy,
    set_auth_cookies,
    verify_password,
)
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_session(
    response: Response,
    db: Session,
    user: User,
    request: Request,
    persistent: bool = True,
) -> None:
    set_rls_user(db, user.id)
    raw = new_refresh_token()
    settings = get_settings()
    lifetime = (
        timedelta(days=settings.refresh_token_days)
        if persistent
        else timedelta(hours=12)
    )
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw),
            expires_at=datetime.now(timezone.utc) + lifetime,
            user_agent=(request.headers.get("user-agent") or "")[:512] or None,
            ip=client_ip(request),
        )
    )
    db.flush()
    set_auth_cookies(response, create_access_token(user.id), raw, persistent=persistent)


def _unauthorized_cleared() -> JSONResponse:
    response = JSONResponse(
        status_code=401,
        content={"detail": {"code": "unauthorized", "message": "Please sign in again."}},
    )
    clear_auth_cookies(response)
    return response


def _revoke_all_refresh_tokens(db: Session, user_id) -> None:
    now = datetime.now(timezone.utc)
    tokens = db.scalars(
        select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
    ).all()
    for token in tokens:
        token.revoked_at = now


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> User:
    ip = client_ip(request)
    if not limiter.allow(f"signup:{ip}", 3, 60):
        raise RATE_LIMITED
    if not password_meets_policy(payload.password):
        raise error(
            400,
            "weak_password",
            "Password must be 12–128 characters and include at least one letter and one number.",
        )

    user = User(email=payload.email, name=payload.name, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise error(409, "email_taken", "An account with this email already exists.") from exc

    _issue_session(response, db, user, request)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> User:
    ip = client_ip(request)
    if not limiter.allow(f"login:{ip}", 5, 60) or not limiter.allow(f"login-email:{payload.email}", 5, 300):
        raise RATE_LIMITED

    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        dummy_password_verify(payload.password)
        raise INVALID_CREDENTIALS
    if not user.is_active or not verify_password(payload.password, user.password_hash):
        raise INVALID_CREDENTIALS

    _issue_session(response, db, user, request, persistent=payload.remember)
    return user


@router.post("/refresh", response_model=UserOut)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> User | JSONResponse:
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise UNAUTHORIZED

    token_hash = hash_token(raw)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    now = datetime.now(timezone.utc)

    if stored is None:
        raise UNAUTHORIZED

    set_rls_user(db, stored.user_id)
    stored = db.get(RefreshToken, stored.id)
    if stored is None:
        raise UNAUTHORIZED

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise UNAUTHORIZED

    if stored.revoked_at is not None:
        _revoke_all_refresh_tokens(db, stored.user_id)
        return _unauthorized_cleared()

    if stored.expires_at <= now:
        stored.revoked_at = now
        raise UNAUTHORIZED

    stored.revoked_at = now
    persistent = stored.expires_at - now > timedelta(days=1)
    _issue_session(response, db, user, request, persistent=persistent)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> Response:
    user_id = None
    access = request.cookies.get(ACCESS_COOKIE)
    if access:
        try:
            user_id = decode_access_token(access)
        except Exception:
            user_id = None

    raw_refresh = request.cookies.get(REFRESH_COOKIE)
    if raw_refresh:
        stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_refresh)))
        if stored is not None:
            user_id = stored.user_id

    if user_id is not None:
        set_rls_user(db, user_id)
        _revoke_all_refresh_tokens(db, user_id)

    clear_auth_cookies(response)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> Response:
    ip = client_ip(request)
    if not limiter.allow(f"forgot:{ip}", 3, 60):
        raise RATE_LIMITED

    user = db.scalar(select(User).where(User.email == payload.email))
    if user is not None and user.is_active:
        raw = new_refresh_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_token(raw),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
        )
        settings = get_settings()
        if not settings.is_production:
            origin = settings.cors_origin_list[0] if settings.cors_origin_list else "http://localhost:3000"
            import logging

            logging.getLogger("detechtico.auth").warning(
                "Password reset link for %s: %s/reset-password?token=%s",
                user.email,
                origin,
                raw,
            )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)) -> Response:
    ip = client_ip(request)
    if not limiter.allow(f"reset:{ip}", 5, 60):
        raise RATE_LIMITED
    if not password_meets_policy(payload.password):
        raise error(
            400,
            "weak_password",
            "Password must be 12–128 characters and include at least one letter and one number.",
        )

    stored = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(payload.token)))
    now = datetime.now(timezone.utc)
    if stored is None or stored.used_at is not None or stored.expires_at <= now:
        raise error(400, "invalid_reset_token", "This reset link is invalid or has expired.")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise error(400, "invalid_reset_token", "This reset link is invalid or has expired.")

    stored.used_at = now
    user.password_hash = hash_password(payload.password)
    set_rls_user(db, user.id)
    _revoke_all_refresh_tokens(db, user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
