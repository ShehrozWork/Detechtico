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
from app.models import (
    EmailChangeChallenge,
    EmailChangeRevertToken,
    PasswordResetToken,
    RefreshToken,
    SignupChallenge,
    User,
)
from app.rate_limit import limiter
from app.schemas import (
    ChangePasswordRequest,
    ConfirmEmailChangeRequest,
    ConfirmSignupRequest,
    EmailChangeRequestedOut,
    ForgotPasswordRequest,
    LoginRequest,
    RequestEmailChangeRequest,
    ResetPasswordRequest,
    RevertEmailChangeRequest,
    SignupRequest,
    SignupRequestedOut,
    UpdateProfileRequest,
    UserOut,
    VerifyPasswordRequest,
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
    new_otp_code,
    new_refresh_token,
    password_meets_policy,
    set_auth_cookies,
    verify_password,
)
from app.deps import get_current_user
from app.services.mail import send_email_change_alert, send_email_change_otp, send_signup_otp

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_session(
    response: Response,
    db: Session,
    user: User,
    request: Request,
    persistent: bool = True,
) -> None:
    settings = get_settings()
    if (
        user.staff_role is None
        and user.email.lower() in settings.admin_bootstrap_email_set
    ):
        user.staff_role = "superadmin"
        db.flush()

    set_rls_user(db, user.id)
    raw = new_refresh_token()
    if user.is_staff:
        lifetime = timedelta(days=settings.admin_refresh_token_days)
        access_minutes = settings.admin_access_token_minutes
        access_max_age = settings.admin_access_token_minutes * 60
        refresh_max_age = settings.admin_refresh_token_days * 24 * 60 * 60
        # Staff sessions are always short-lived; ignore long-lived "remember me".
        persistent_cookie = True
    else:
        lifetime = (
            timedelta(days=settings.refresh_token_days)
            if persistent
            else timedelta(hours=12)
        )
        access_minutes = settings.access_token_minutes
        access_max_age = settings.access_token_minutes * 60 if persistent else None
        refresh_max_age = (
            settings.refresh_token_days * 24 * 60 * 60 if persistent else None
        )
        persistent_cookie = persistent

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
    set_auth_cookies(
        response,
        create_access_token(user.id, minutes=access_minutes),
        raw,
        persistent=persistent_cookie,
        access_max_age=access_max_age,
        refresh_max_age=refresh_max_age,
    )


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


@router.post("/signup", response_model=SignupRequestedOut)
def signup(payload: SignupRequest, request: Request, db: Session = Depends(get_db)) -> SignupRequestedOut:
    ip = client_ip(request)
    if not limiter.allow(f"signup:{ip}", 5, 60):
        raise RATE_LIMITED
    if not limiter.allow(f"signup-email:{payload.email}", 8, 600):
        raise RATE_LIMITED
    if not password_meets_policy(payload.password):
        raise error(
            400,
            "weak_password",
            "Password must be 12–128 characters and include at least one letter and one number.",
        )

    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise error(409, "email_taken", "An account with this email already exists.")

    now = datetime.now(timezone.utc)
    resend_cooldown = timedelta(seconds=60)
    latest = db.scalar(
        select(SignupChallenge)
        .where(SignupChallenge.email == payload.email)
        .order_by(SignupChallenge.created_at.desc())
    )
    if latest is not None and latest.created_at > now - resend_cooldown:
        wait = int((latest.created_at + resend_cooldown - now).total_seconds()) + 1
        raise error(
            429,
            "resend_cooldown",
            f"Please wait {wait} second{'s' if wait != 1 else ''} before requesting another code.",
        )

    pending = db.scalars(
        select(SignupChallenge).where(
            SignupChallenge.email == payload.email,
            SignupChallenge.consumed_at.is_(None),
            SignupChallenge.expires_at > now,
        )
    ).all()
    for challenge in pending:
        challenge.consumed_at = now

    otp = new_otp_code(6)
    db.add(
        SignupChallenge(
            email=payload.email,
            name=payload.name,
            password_hash=hash_password(payload.password),
            otp_hash=hash_token(otp),
            expires_at=now + timedelta(minutes=10),
        )
    )
    db.flush()
    send_signup_otp(payload.email, otp)
    return SignupRequestedOut(
        message="We sent a verification code to your email address.",
        email=payload.email,
        expires_in_seconds=600,
        resend_after_seconds=60,
    )


@router.post("/signup/confirm", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def confirm_signup(
    payload: ConfirmSignupRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    ip = client_ip(request)
    if not limiter.allow(f"signup-confirm:{ip}", 10, 60):
        raise RATE_LIMITED
    if not limiter.allow(f"signup-confirm-email:{payload.email}", 10, 600):
        raise RATE_LIMITED

    now = datetime.now(timezone.utc)
    challenge = db.scalar(
        select(SignupChallenge)
        .where(
            SignupChallenge.email == payload.email,
            SignupChallenge.consumed_at.is_(None),
        )
        .order_by(SignupChallenge.created_at.desc())
    )
    if challenge is None or challenge.expires_at <= now:
        raise error(400, "otp_expired", "This code has expired. Request a new one.")

    if challenge.attempts >= 5:
        challenge.consumed_at = now
        raise error(400, "otp_locked", "Too many incorrect attempts. Request a new code.")

    if hash_token(payload.otp) != challenge.otp_hash:
        challenge.attempts += 1
        db.flush()
        remaining = max(0, 5 - challenge.attempts)
        raise error(
            400,
            "otp_invalid",
            f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    existing = db.scalar(select(User).where(User.email == challenge.email))
    if existing is not None:
        challenge.consumed_at = now
        raise error(409, "email_taken", "An account with this email already exists.")

    challenge.consumed_at = now
    user = User(
        email=challenge.email,
        name=challenge.name,
        password_hash=challenge.password_hash,
    )
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


@router.patch("/me", response_model=UserOut)
def update_profile(
    payload: UpdateProfileRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    ip = client_ip(request)
    if not limiter.allow(f"profile:{user.id}:{ip}", 10, 60):
        raise RATE_LIMITED

    user.name = payload.name
    db.flush()
    return user


@router.post("/verify-password", status_code=status.HTTP_204_NO_CONTENT)
def verify_current_password(
    payload: VerifyPasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
) -> Response:
    ip = client_ip(request)
    if not limiter.allow(f"verify-password:{user.id}:{ip}", 10, 60):
        raise RATE_LIMITED
    if not verify_password(payload.current_password, user.password_hash):
        raise error(400, "invalid_password", "Current password is incorrect.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/email-change/request", response_model=EmailChangeRequestedOut)
def request_email_change(
    payload: RequestEmailChangeRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EmailChangeRequestedOut:
    ip = client_ip(request)
    if not limiter.allow(f"email-change-req:{user.id}:{ip}", 10, 600):
        raise RATE_LIMITED
    if not verify_password(payload.current_password, user.password_hash):
        raise error(400, "invalid_password", "Current password is incorrect.")
    if payload.new_email == user.email:
        raise error(400, "same_email", "Enter a different email address.")

    taken = db.scalar(select(User).where(User.email == payload.new_email))
    if taken is not None:
        raise error(409, "email_taken", "An account with this email already exists.")

    now = datetime.now(timezone.utc)
    resend_cooldown = timedelta(seconds=60)
    latest = db.scalar(
        select(EmailChangeChallenge)
        .where(EmailChangeChallenge.user_id == user.id)
        .order_by(EmailChangeChallenge.created_at.desc())
    )
    if latest is not None and latest.created_at > now - resend_cooldown:
        wait = int((latest.created_at + resend_cooldown - now).total_seconds()) + 1
        raise error(
            429,
            "resend_cooldown",
            f"Please wait {wait} second{'s' if wait != 1 else ''} before requesting another code.",
        )

    pending = db.scalars(
        select(EmailChangeChallenge).where(
            EmailChangeChallenge.user_id == user.id,
            EmailChangeChallenge.consumed_at.is_(None),
            EmailChangeChallenge.expires_at > now,
        )
    ).all()
    for challenge in pending:
        challenge.consumed_at = now

    otp = new_otp_code(6)
    db.add(
        EmailChangeChallenge(
            user_id=user.id,
            new_email=payload.new_email,
            otp_hash=hash_token(otp),
            expires_at=now + timedelta(minutes=10),
        )
    )
    db.flush()
    send_email_change_otp(payload.new_email, otp)
    return EmailChangeRequestedOut(
        message="We sent a verification code to your new email address.",
        new_email=payload.new_email,
        expires_in_seconds=600,
        resend_after_seconds=60,
    )


@router.post("/email-change/confirm", response_model=UserOut)
def confirm_email_change(
    payload: ConfirmEmailChangeRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    ip = client_ip(request)
    if not limiter.allow(f"email-change-confirm:{user.id}:{ip}", 10, 600):
        raise RATE_LIMITED

    now = datetime.now(timezone.utc)
    challenge = db.scalar(
        select(EmailChangeChallenge)
        .where(
            EmailChangeChallenge.user_id == user.id,
            EmailChangeChallenge.consumed_at.is_(None),
        )
        .order_by(EmailChangeChallenge.created_at.desc())
    )
    if challenge is None or challenge.expires_at <= now:
        raise error(400, "otp_expired", "This code has expired. Request a new one.")

    if challenge.attempts >= 5:
        challenge.consumed_at = now
        raise error(400, "otp_locked", "Too many incorrect attempts. Request a new code.")

    if hash_token(payload.otp) != challenge.otp_hash:
        challenge.attempts += 1
        db.flush()
        remaining = max(0, 5 - challenge.attempts)
        raise error(
            400,
            "otp_invalid",
            f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    taken = db.scalar(
        select(User).where(User.email == challenge.new_email, User.id != user.id)
    )
    if taken is not None:
        challenge.consumed_at = now
        raise error(409, "email_taken", "An account with this email already exists.")

    previous_email = user.email
    new_email = challenge.new_email
    challenge.consumed_at = now
    user.email = new_email
    db.flush()

    revert_raw = new_refresh_token()
    db.add(
        EmailChangeRevertToken(
            user_id=user.id,
            previous_email=previous_email,
            new_email=new_email,
            token_hash=hash_token(revert_raw),
            expires_at=now + timedelta(hours=72),
        )
    )
    db.flush()

    settings = get_settings()
    origin = settings.cors_origin_list[0] if settings.cors_origin_list else "http://localhost:3000"
    revert_url = f"{origin.rstrip('/')}/revert-email?token={revert_raw}"
    try:
        send_email_change_alert(
            to_email=previous_email,
            new_email=new_email,
            revert_url=revert_url,
        )
    except Exception:
        # Email already changed; alert failure should not undo ownership proof.
        import logging

        logging.getLogger("detechtico.auth").exception(
            "Failed to send email-change alert to previous inbox for user %s",
            user.id,
        )

    return user


@router.post("/email-change/revert", response_model=UserOut)
def revert_email_change(
    payload: RevertEmailChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    ip = client_ip(request)
    if not limiter.allow(f"email-change-revert:{ip}", 10, 600):
        raise RATE_LIMITED

    now = datetime.now(timezone.utc)
    stored = db.scalar(
        select(EmailChangeRevertToken).where(
            EmailChangeRevertToken.token_hash == hash_token(payload.token)
        )
    )
    if stored is None or stored.used_at is not None or stored.expires_at <= now:
        raise error(400, "invalid_revert_token", "This revert link is invalid or has expired.")

    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise error(400, "invalid_revert_token", "This revert link is invalid or has expired.")

    # Only revert if the account is still on the new email from this change.
    if user.email != stored.new_email:
        stored.used_at = now
        raise error(
            400,
            "email_already_changed",
            "This email change can no longer be reverted automatically.",
        )

    conflict = db.scalar(
        select(User).where(User.email == stored.previous_email, User.id != user.id)
    )
    if conflict is not None:
        raise error(
            409,
            "email_taken",
            "The previous email is no longer available. Contact support.",
        )

    user.email = stored.previous_email
    stored.used_at = now
    set_rls_user(db, user.id)
    _revoke_all_refresh_tokens(db, user.id)
    db.flush()
    return user


@router.post("/change-password", response_model=UserOut)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    ip = client_ip(request)
    if not limiter.allow(f"change-password:{user.id}:{ip}", 5, 60):
        raise RATE_LIMITED
    if not verify_password(payload.current_password, user.password_hash):
        raise error(400, "invalid_password", "Current password is incorrect.")
    if not password_meets_policy(payload.new_password):
        raise error(
            400,
            "weak_password",
            "Password must be 12–128 characters and include at least one letter and one number.",
        )
    if payload.current_password == payload.new_password:
        raise error(400, "same_password", "Choose a new password different from your current one.")

    user.password_hash = hash_password(payload.new_password)
    _revoke_all_refresh_tokens(db, user.id)
    db.flush()
    # Keep this browser signed in; revoke other sessions only.
    _issue_session(response, db, user, request, persistent=True)
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
