from __future__ import annotations

from collections.abc import Generator
from uuid import UUID

import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.billing.entitlements import user_is_entitled
from app.db import SessionLocal, get_db, set_rls_user
from app.errors import UNAUTHORIZED, error
from app.models import Subscription, User
from app.security import ACCESS_COOKIE, decode_access_token


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise UNAUTHORIZED
    try:
        user_id = decode_access_token(token)
    except (jwt.PyJWTError, ValueError):
        raise UNAUTHORIZED from None

    set_rls_user(db, user_id)
    user = db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.subscription),
            selectinload(User.comp_entitlements),
            selectinload(User.staff_totp),
        )
    )
    if user is None or not user.is_active:
        raise UNAUTHORIZED
    return user


def require_entitled(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    sub = db.get(Subscription, user.id)
    if not user_is_entitled(user, sub, db):
        raise error(
            403,
            "subscription_required",
            "Your trial has ended. Subscribe to Essential or Professional to continue.",
        )
    return user


def get_staff_user(user: User = Depends(get_current_user)) -> User:
    from app.admin.permissions import is_staff_role

    if not is_staff_role(user.staff_role):
        raise error(403, "forbidden", "Staff access required.")
    return user


def require_permission(permission: str):
    from app.admin.permissions import has_permission

    def _dep(user: User = Depends(get_staff_user)) -> User:
        if not has_permission(user.staff_role, permission):
            raise error(403, "forbidden", "You do not have permission for this action.")
        return user

    return _dep


def require_totp_enrolled(user: User = Depends(get_staff_user)) -> User:
    if not user.totp_enrolled:
        raise error(
            403,
            "totp_required",
            "Enroll two-factor authentication before using admin tools.",
        )
    return user


def require_step_up(
    request: Request,
    user: User = Depends(require_totp_enrolled),
) -> User:
    import jwt
    from app.security import STEP_UP_COOKIE, decode_step_up_token

    token = request.cookies.get(STEP_UP_COOKIE)
    if not token:
        raise error(
            403,
            "step_up_required",
            "Confirm your authenticator code to continue.",
        )
    try:
        step_user_id = decode_step_up_token(token)
    except (jwt.PyJWTError, ValueError):
        raise error(
            403,
            "step_up_required",
            "Confirm your authenticator code to continue.",
        ) from None
    if step_user_id != user.id:
        raise error(
            403,
            "step_up_required",
            "Confirm your authenticator code to continue.",
        )
    return user


def user_session(user_id: UUID) -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        set_rls_user(db, user_id)
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
