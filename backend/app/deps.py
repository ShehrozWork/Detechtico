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
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise UNAUTHORIZED
    try:
        user_id = decode_access_token(token)
    except (jwt.PyJWTError, ValueError):
        raise UNAUTHORIZED from None

    set_rls_user(db, user_id)
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UNAUTHORIZED
    return user


def require_entitled(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
    sub = db.get(Subscription, user.id)
    if not user_is_entitled(user, sub):
        raise error(
            403,
            "subscription_required",
            "Your trial has ended. Subscribe to Essential or Professional to continue.",
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
