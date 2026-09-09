from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CompEntitlement
from datetime import datetime, timezone

ENTITLED_STATUSES = frozenset({"active", "trialing", "past_due"})

if TYPE_CHECKING:
    from app.models import Subscription, User


def active_comp_entitlement(db: Session, user_id) -> CompEntitlement | None:
    now = datetime.now(timezone.utc)
    return db.scalar(
        select(CompEntitlement)
        .where(CompEntitlement.user_id == user_id, CompEntitlement.expires_at > now)
        .order_by(CompEntitlement.expires_at.desc())
        .limit(1)
    )


def user_has_active_comp(user: "User", db: Session | None = None) -> bool:
    now = datetime.now(timezone.utc)
    if db is not None:
        return active_comp_entitlement(db, user.id) is not None
    comps = getattr(user, "comp_entitlements", None) or []
    return any(comp.expires_at > now for comp in comps)


def user_is_entitled(
    user: "User",
    subscription: "Subscription | None",
    db: Session | None = None,
) -> bool:
    if user.trial_active:
        return True
    if user_has_active_comp(user, db):
        return True
    if subscription is None:
        return False
    return subscription.status in ENTITLED_STATUSES
