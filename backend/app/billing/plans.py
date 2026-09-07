from __future__ import annotations

from typing import Literal

from app.config import Settings, get_settings
from app.errors import error

PlanId = Literal["essential", "professional"]
BillingPeriod = Literal["monthly", "annual"]

CHECKOUT_PLAN_IDS: frozenset[str] = frozenset({"essential", "professional"})
CHECKOUT_PERIODS: frozenset[str] = frozenset({"monthly", "annual"})

# Marketing caps (enforcement deferred).
PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "essential": {"transactions_per_month": 10_000},
    "professional": {"transactions_per_month": 50_000},
}


def _price_map(settings: Settings | None = None) -> dict[tuple[str, str], str]:
    cfg = settings or get_settings()
    return {
        ("essential", "monthly"): cfg.stripe_price_essential_monthly,
        ("essential", "annual"): cfg.stripe_price_essential_annual,
        ("professional", "monthly"): cfg.stripe_price_professional_monthly,
        ("professional", "annual"): cfg.stripe_price_professional_annual,
    }


def price_id_for(plan_id: str, billing_period: str, settings: Settings | None = None) -> str:
    if plan_id not in CHECKOUT_PLAN_IDS or billing_period not in CHECKOUT_PERIODS:
        raise error(400, "invalid_plan", "Choose Essential or Professional (monthly or annual).")
    price_id = _price_map(settings).get((plan_id, billing_period), "")
    if not price_id:
        raise error(
            503,
            "stripe_not_configured",
            "Billing is not configured. Set Stripe Price IDs in the server environment.",
        )
    return price_id


def plan_from_price_id(
    stripe_price_id: str, settings: Settings | None = None
) -> tuple[str, str] | None:
    if not stripe_price_id:
        return None
    for (plan_id, period), price_id in _price_map(settings).items():
        if price_id and price_id == stripe_price_id:
            return plan_id, period
    return None


def stripe_configured(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    if not cfg.stripe_secret_key:
        return False
    return all(_price_map(cfg).values())


def stripe_missing_settings(settings: Settings | None = None) -> list[str]:
    cfg = settings or get_settings()
    missing: list[str] = []
    if not cfg.stripe_secret_key:
        missing.append("STRIPE_SECRET_KEY")
    labels = {
        ("essential", "monthly"): "STRIPE_PRICE_ESSENTIAL_MONTHLY",
        ("essential", "annual"): "STRIPE_PRICE_ESSENTIAL_ANNUAL",
        ("professional", "monthly"): "STRIPE_PRICE_PROFESSIONAL_MONTHLY",
        ("professional", "annual"): "STRIPE_PRICE_PROFESSIONAL_ANNUAL",
    }
    for key, value in _price_map(cfg).items():
        if not value:
            missing.append(labels[key])
    return missing
