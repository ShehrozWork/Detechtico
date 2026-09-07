from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.billing.entitlements import user_is_entitled
from app.billing.service import (
    cancel_subscription_at_period_end,
    confirm_checkout_session,
    create_checkout_session,
    create_portal_session,
    get_subscription_row,
    resume_subscription,
)
from app.deps import get_current_user
from app.db import get_db
from app.errors import RATE_LIMITED
from app.middleware import client_ip
from app.models import User
from app.rate_limit import limiter
from app.schemas import (
    BillingStatusOut,
    CheckoutSessionOut,
    CheckoutSessionRequest,
    ConfirmSessionRequest,
    PortalSessionOut,
    UserOut,
)

router = APIRouter(prefix="/billing", tags=["billing"])


def _billing_limit(request: Request, user: User) -> None:
    ip = client_ip(request)
    if not limiter.allow(f"billing:{user.id}:{ip}", 10, 60):
        raise RATE_LIMITED


@router.post("/checkout-session", response_model=CheckoutSessionOut)
def checkout_session(
    payload: CheckoutSessionRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutSessionOut:
    _billing_limit(request, user)
    url = create_checkout_session(db, user, payload.plan_id, payload.billing_period)
    return CheckoutSessionOut(url=url)


@router.post("/portal-session", response_model=PortalSessionOut)
def portal_session(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortalSessionOut:
    _billing_limit(request, user)
    url = create_portal_session(db, user)
    return PortalSessionOut(url=url)


@router.post("/cancel-subscription", response_model=UserOut)
def cancel_subscription(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Schedule cancellation at period end; access continues until then."""
    _billing_limit(request, user)
    cancel_subscription_at_period_end(db, user)
    db.refresh(user)
    return user


@router.post("/resume-subscription", response_model=UserOut)
def resume_subscription_route(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """Undo a scheduled cancellation so the subscription renews."""
    _billing_limit(request, user)
    resume_subscription(db, user)
    db.refresh(user)
    return user


@router.post("/confirm-session", response_model=UserOut)
def confirm_session(
    payload: ConfirmSessionRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    _billing_limit(request, user)
    confirm_checkout_session(db, user, payload.session_id)
    db.refresh(user)
    return user


@router.get("/status", response_model=BillingStatusOut)
def billing_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BillingStatusOut:
    sub = get_subscription_row(db, user.id)
    return BillingStatusOut(
        plan_id=sub.plan_id if sub else None,
        subscription_status=sub.status if sub else "none",
        billing_period=sub.billing_period if sub else None,
        current_period_end=sub.current_period_end if sub else None,
        cancel_at_period_end=bool(sub.cancel_at_period_end) if sub else False,
        entitled=user_is_entitled(user, sub),
        trial_ends_at=user.trial_ends_at,
        trial_active=user.trial_active,
    )
