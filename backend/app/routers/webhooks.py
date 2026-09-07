from __future__ import annotations

import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Request, Response
from sqlalchemy.exc import IntegrityError
from starlette.responses import JSONResponse

from app.billing.service import (
    ApplyResult,
    SubscriptionItemsInvalid,
    apply_subscription_state,
    configure_stripe,
    find_user_id_by_customer,
    normalize_subscription_id,
    retrieve_subscription,
    subscription_id_from_event,
)
from app.config import get_settings
from app.db import AdminSessionLocal, set_rls_user
from app.models import StripeWebhookEvent

logger = logging.getLogger("detechtico.webhooks")

router = APIRouter(tags=["webhooks"])

IGNORABLE_WITHOUT_SUB = frozenset({"checkout.session.expired"})

# Events that must resolve to a Stripe Subscription id.
SUBSCRIPTION_EVENTS = frozenset(
    {
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.paid",
        "invoice.payment_failed",
    }
)


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request) -> Response:
    settings = get_settings()
    if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
        return JSONResponse(
            status_code=503,
            content={"detail": {"code": "stripe_not_configured", "message": "Stripe webhook is not configured."}},
        )

    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    if not sig:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "missing_signature", "message": "Missing Stripe-Signature header."}},
        )

    configure_stripe(settings)
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "invalid_payload", "message": "Invalid webhook payload."}},
        )
    except stripe.SignatureVerificationError:
        return JSONResponse(
            status_code=400,
            content={"detail": {"code": "invalid_signature", "message": "Invalid Stripe signature."}},
        )

    event_id = event["id"]
    event_type = event["type"]
    event_created = int(event["created"])

    db = AdminSessionLocal()
    try:
        db.add(
            StripeWebhookEvent(
                event_id=event_id,
                type=event_type,
                event_created=event_created,
                processed_at=datetime.now(timezone.utc),
            )
        )
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            return Response(status_code=200)

        if event_type == "checkout.session.expired":
            db.commit()
            return Response(status_code=200)

        subscription_id = subscription_id_from_event(event)
        if not subscription_id:
            # stripe listen forwards many event types; only fail on ones we handle.
            if event_type not in SUBSCRIPTION_EVENTS:
                db.commit()
                return Response(status_code=200)
            logger.error("Missing subscription id for event type=%s id=%s", event_type, event_id)
            db.rollback()
            return JSONResponse(
                status_code=500,
                content={"detail": {"code": "missing_subscription", "message": "Could not resolve subscription."}},
            )

        stripe_sub = retrieve_subscription(subscription_id)
        customer_id = normalize_subscription_id(getattr(stripe_sub, "customer", None))
        if not customer_id:
            logger.error("Subscription %s has no customer", subscription_id)
            db.rollback()
            return JSONResponse(
                status_code=500,
                content={"detail": {"code": "missing_customer", "message": "Subscription has no customer."}},
            )

        user_id = find_user_id_by_customer(db, customer_id)
        if user_id is None:
            # Fallback: metadata on subscription
            metadata = getattr(stripe_sub, "metadata", None) or {}
            meta_uid = metadata.get("user_id") if hasattr(metadata, "get") else None
            if meta_uid:
                from uuid import UUID

                try:
                    user_id = UUID(str(meta_uid))
                except ValueError:
                    user_id = None
        if user_id is None:
            logger.error("No local user for Stripe customer %s", customer_id)
            db.rollback()
            return JSONResponse(
                status_code=500,
                content={"detail": {"code": "unknown_customer", "message": "Unknown Stripe customer."}},
            )

        set_rls_user(db, user_id)
        try:
            result = apply_subscription_state(db, user_id, stripe_sub, event_created)
        except SubscriptionItemsInvalid:
            db.rollback()
            return JSONResponse(
                status_code=500,
                content={
                    "detail": {
                        "code": "subscription_items_invalid",
                        "message": "Subscription must have exactly one price item.",
                    }
                },
            )

        db.commit()
        logger.info(
            "stripe webhook processed event=%s type=%s result=%s",
            event_id,
            event_type,
            result.value if isinstance(result, ApplyResult) else result,
        )
        return Response(status_code=200)
    except Exception:
        logger.exception("stripe webhook failed event=%s", event_id)
        db.rollback()
        return JSONResponse(
            status_code=500,
            content={"detail": {"code": "webhook_failed", "message": "Webhook processing failed."}},
        )
    finally:
        db.close()
