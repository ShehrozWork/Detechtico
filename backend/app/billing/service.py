from __future__ import annotations

import logging
import time
from collections.abc import Generator
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import UUID

import stripe
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.billing.plans import plan_from_price_id, price_id_for, stripe_configured, stripe_missing_settings
from app.config import Settings, get_settings
from app.db import AdminSessionLocal
from app.errors import error
from app.models import Subscription, User

logger = logging.getLogger("detechtico.billing")

ACTIVE_STATUSES = frozenset({"active", "trialing"})
CHECKOUT_IDEMPOTENCY_BUCKET_SECONDS = 120


class ApplyResult(str, Enum):
    APPLIED = "applied"
    SKIPPED_STALE = "skipped_stale"


class SubscriptionItemsInvalid(Exception):
    """Subscription must have exactly one line item for plan mapping."""


def configure_stripe(settings: Settings | None = None) -> Settings:
    cfg = settings or get_settings()
    if not cfg.stripe_secret_key:
        raise error(503, "stripe_not_configured", "Stripe is not configured.")
    stripe.api_key = cfg.stripe_secret_key
    return cfg


def require_stripe_ready(settings: Settings | None = None) -> Settings:
    cfg = settings or get_settings()
    missing = stripe_missing_settings(cfg)
    if missing:
        raise error(
            503,
            "stripe_not_configured",
            "Billing is not configured. Missing: " + ", ".join(missing)
            + ". Set them in backend/.env and recreate the API container "
            + "(docker compose up -d --force-recreate api).",
        )
    configure_stripe(cfg)
    return cfg


def frontend_origin(settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    if not cfg.cors_origin_list:
        raise error(500, "server_error", "CORS_ORIGINS is not configured.")
    return cfg.cors_origin_list[0].rstrip("/")


def checkout_idempotency_key(user_id: UUID, plan_id: str, billing_period: str) -> str:
    bucket = int(time.time()) // CHECKOUT_IDEMPOTENCY_BUCKET_SECONDS
    return f"checkout:{user_id}:{plan_id}:{billing_period}:{bucket}"


def get_subscription_row(db: Session, user_id: UUID) -> Subscription | None:
    return db.get(Subscription, user_id)


def ensure_subscription_row_locked(db: Session, user_id: UUID) -> Subscription:
    db.execute(
        text(
            """
            INSERT INTO subscriptions (user_id, status, cancel_at_period_end)
            VALUES (:uid, 'none', false)
            ON CONFLICT (user_id) DO NOTHING
            """
        ),
        {"uid": str(user_id)},
    )
    return db.execute(
        select(Subscription).where(Subscription.user_id == user_id).with_for_update()
    ).scalar_one()


def _search_customer_by_metadata(user_id: UUID) -> str | None:
    try:
        result = stripe.Customer.search(query=f"metadata['user_id']:'{user_id}'", limit=1)
        data = result.data or []
        if data:
            return data[0].id
    except Exception:
        logger.warning("Stripe customer search failed for user %s", user_id, exc_info=True)
    return None


def get_or_create_customer(db: Session, user: User) -> str:
    require_stripe_ready()
    row = ensure_subscription_row_locked(db, user.id)
    if row.stripe_customer_id:
        return row.stripe_customer_id

    existing = _search_customer_by_metadata(user.id)
    if existing:
        row.stripe_customer_id = existing
        db.flush()
        return existing

    customer = stripe.Customer.create(
        email=user.email,
        name=user.name,
        metadata={"user_id": str(user.id)},
    )
    row.stripe_customer_id = customer.id
    db.flush()
    return customer.id


def create_checkout_session(
    db: Session,
    user: User,
    plan_id: str,
    billing_period: str,
) -> str:
    cfg = require_stripe_ready()
    row = ensure_subscription_row_locked(db, user.id)
    if row.status in ACTIVE_STATUSES and row.stripe_subscription_id:
        raise error(
            409,
            "already_subscribed",
            "You already have an active subscription. Manage it from Billing.",
        )

    price_id = price_id_for(plan_id, billing_period, cfg)
    customer_id = get_or_create_customer(db, user)
    origin = frontend_origin(cfg)
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        client_reference_id=str(user.id),
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/subscribe",
        metadata={"user_id": str(user.id), "plan_id": plan_id, "billing_period": billing_period},
        subscription_data={
            "metadata": {"user_id": str(user.id), "plan_id": plan_id, "billing_period": billing_period},
        },
        idempotency_key=checkout_idempotency_key(user.id, plan_id, billing_period),
    )
    if not session.url:
        raise error(502, "stripe_error", "Could not start checkout. Please try again.")
    return session.url


def create_portal_session(db: Session, user: User) -> str:
    cfg = require_stripe_ready()
    row = get_subscription_row(db, user.id)
    if row is None or not row.stripe_customer_id:
        raise error(
            404,
            "no_stripe_customer",
            "No billing account yet. Subscribe to a plan first.",
        )
    origin = frontend_origin(cfg)
    portal = stripe.billing_portal.Session.create(
        customer=row.stripe_customer_id,
        return_url=f"{origin}/dashboard/billing",
    )
    if not portal.url:
        raise error(502, "stripe_error", "Could not open the billing portal.")
    return portal.url


def _sync_after_modify(db: Session, user_id: UUID, stripe_sub: Any, last_event: int | None) -> ApplyResult:
    event_created = max(int(time.time()), (last_event or 0) + 1)
    try:
        return apply_subscription_state(db, user_id, stripe_sub, event_created)
    except SubscriptionItemsInvalid as exc:
        raise error(409, "subscription_items_invalid", str(exc)) from exc


def cancel_subscription_at_period_end(db: Session, user: User) -> ApplyResult:
    """Keep access until current_period_end; do not renew afterward."""
    require_stripe_ready()
    row = ensure_subscription_row_locked(db, user.id)
    if not row.stripe_subscription_id or row.status not in ACTIVE_STATUSES:
        raise error(
            400,
            "no_active_subscription",
            "You do not have an active subscription to cancel.",
        )
    if row.cancel_at_period_end:
        return ApplyResult.SKIPPED_STALE

    stripe_sub = stripe.Subscription.modify(
        row.stripe_subscription_id,
        cancel_at_period_end=True,
    )
    return _sync_after_modify(db, user.id, stripe_sub, row.last_event_created_at)


def resume_subscription(db: Session, user: User) -> ApplyResult:
    """Undo a scheduled cancel-at-period-end."""
    require_stripe_ready()
    row = ensure_subscription_row_locked(db, user.id)
    if not row.stripe_subscription_id or row.status not in ACTIVE_STATUSES:
        raise error(
            400,
            "no_active_subscription",
            "You do not have an active subscription to resume.",
        )
    if not row.cancel_at_period_end:
        return ApplyResult.SKIPPED_STALE

    stripe_sub = stripe.Subscription.modify(
        row.stripe_subscription_id,
        cancel_at_period_end=False,
    )
    return _sync_after_modify(db, user.id, stripe_sub, row.last_event_created_at)


def _subscription_items(stripe_subscription: Any) -> list[Any]:
    items = getattr(stripe_subscription, "items", None)
    if items is None and isinstance(stripe_subscription, dict):
        items = stripe_subscription.get("items")
    if items is None:
        return []
    data = getattr(items, "data", None)
    if data is None and isinstance(items, dict):
        data = items.get("data")
    return list(data or [])


def _sub_attr(stripe_subscription: Any, name: str, default: Any = None) -> Any:
    if isinstance(stripe_subscription, dict):
        return stripe_subscription.get(name, default)
    return getattr(stripe_subscription, name, default)


def _period_end(stripe_subscription: Any) -> datetime | None:
    value = _sub_attr(stripe_subscription, "current_period_end")
    if value is None:
        return None
    return datetime.fromtimestamp(int(value), tz=timezone.utc)


def apply_subscription_state(
    db: Session,
    user_id: UUID,
    stripe_subscription: Any,
    event_created: int,
) -> ApplyResult:
    row = ensure_subscription_row_locked(db, user_id)
    if row.last_event_created_at is not None and event_created <= row.last_event_created_at:
        return ApplyResult.SKIPPED_STALE

    status = str(_sub_attr(stripe_subscription, "status") or "none")
    sub_id = _sub_attr(stripe_subscription, "id")
    customer = _sub_attr(stripe_subscription, "customer")
    if isinstance(customer, dict):
        customer = customer.get("id")
    elif customer is not None and not isinstance(customer, str):
        customer = getattr(customer, "id", customer)

    items = _subscription_items(stripe_subscription)
    is_terminal = status in {"canceled", "incomplete_expired", "unpaid"}

    if not is_terminal and len(items) != 1:
        price_ids = []
        for item in items:
            price = getattr(item, "price", None) if not isinstance(item, dict) else item.get("price")
            if isinstance(price, dict):
                price_ids.append(price.get("id"))
            elif price is not None:
                price_ids.append(getattr(price, "id", None))
        logger.error(
            "subscription_items_invalid sub=%s count=%s prices=%s",
            sub_id,
            len(items),
            price_ids,
        )
        raise SubscriptionItemsInvalid(
            f"Expected exactly 1 subscription item, got {len(items)} for {sub_id}"
        )

    plan_id = row.plan_id
    billing_period = row.billing_period
    stripe_price_id = row.stripe_price_id

    if len(items) == 1:
        item = items[0]
        price = getattr(item, "price", None) if not isinstance(item, dict) else item.get("price")
        price_id = None
        if isinstance(price, str):
            price_id = price
        elif isinstance(price, dict):
            price_id = price.get("id")
        elif price is not None:
            price_id = getattr(price, "id", None)
        if price_id:
            mapped = plan_from_price_id(price_id)
            if mapped is None:
                logger.warning("Unknown Stripe price id %s on subscription %s", price_id, sub_id)
            else:
                plan_id, billing_period = mapped
            stripe_price_id = price_id

    row.stripe_subscription_id = str(sub_id) if sub_id else row.stripe_subscription_id
    if customer:
        row.stripe_customer_id = str(customer)
    row.status = status
    row.plan_id = plan_id
    row.billing_period = billing_period
    row.stripe_price_id = stripe_price_id
    row.current_period_end = _period_end(stripe_subscription)
    row.cancel_at_period_end = bool(_sub_attr(stripe_subscription, "cancel_at_period_end") or False)
    row.last_event_created_at = event_created
    db.flush()
    return ApplyResult.APPLIED


def normalize_subscription_id(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value or None
    if isinstance(value, dict):
        sid = value.get("id")
        return str(sid) if sid else None
    sid = getattr(value, "id", None)
    return str(sid) if sid else None


def subscription_id_from_event(event: Any) -> str | None:
    event_type = event["type"] if isinstance(event, dict) else event.type
    data = event["data"] if isinstance(event, dict) else event.data
    obj = data["object"] if isinstance(data, dict) else data.object

    if event_type in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        return normalize_subscription_id(obj["id"] if isinstance(obj, dict) else obj.id)

    if event_type in {
        "checkout.session.completed",
        "invoice.paid",
        "invoice.payment_failed",
    }:
        sub = obj["subscription"] if isinstance(obj, dict) else getattr(obj, "subscription", None)
        return normalize_subscription_id(sub)

    return None


def retrieve_subscription(subscription_id: str) -> Any:
    return stripe.Subscription.retrieve(subscription_id)


def find_user_id_by_customer(db: Session, customer_id: str) -> UUID | None:
    row = db.scalar(select(Subscription).where(Subscription.stripe_customer_id == customer_id))
    return row.user_id if row else None


def confirm_checkout_session(db: Session, user: User, session_id: str) -> ApplyResult:
    require_stripe_ready()
    session = stripe.checkout.Session.retrieve(session_id)
    customer_id = normalize_subscription_id(getattr(session, "customer", None))
    ref = getattr(session, "client_reference_id", None)
    row = get_subscription_row(db, user.id)
    owned_customer = row.stripe_customer_id if row else None

    if ref and str(ref) != str(user.id):
        raise error(403, "forbidden", "This checkout session does not belong to you.")
    if customer_id and owned_customer and customer_id != owned_customer:
        raise error(403, "forbidden", "This checkout session does not belong to you.")
    if customer_id and not owned_customer:
        locked = ensure_subscription_row_locked(db, user.id)
        if locked.stripe_customer_id and locked.stripe_customer_id != customer_id:
            raise error(403, "forbidden", "This checkout session does not belong to you.")
        if not locked.stripe_customer_id:
            locked.stripe_customer_id = customer_id
            db.flush()

    subscription_id = normalize_subscription_id(getattr(session, "subscription", None))
    if not subscription_id:
        raise error(400, "checkout_incomplete", "Checkout is not complete yet.")

    stripe_sub = retrieve_subscription(subscription_id)
    event_created = int(getattr(session, "created", None) or time.time())
    try:
        return apply_subscription_state(db, user.id, stripe_sub, event_created)
    except SubscriptionItemsInvalid as exc:
        raise error(409, "subscription_items_invalid", str(exc)) from exc


def admin_db_session() -> Generator[Session, None, None]:
    """Admin DB session for webhooks (superuser bypasses FORCE RLS for customer lookup)."""
    db = AdminSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
