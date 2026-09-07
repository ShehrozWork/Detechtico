from __future__ import annotations

from typing import TYPE_CHECKING

ENTITLED_STATUSES = frozenset({"active", "trialing", "past_due"})

if TYPE_CHECKING:
    from app.models import Subscription, User


def user_is_entitled(user: "User", subscription: "Subscription | None") -> bool:
    if user.trial_active:
        return True
    if subscription is None:
        return False
    return subscription.status in ENTITLED_STATUSES
