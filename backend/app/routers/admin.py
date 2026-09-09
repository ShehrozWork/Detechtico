from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.admin.audit import write_audit
from app.admin.db import get_admin_db
from app.admin.permissions import STAFF_ROLES
from app.admin.totp import generate_totp_secret, provisioning_uri, verify_totp
from app.billing.entitlements import active_comp_entitlement, user_is_entitled
from app.billing.service import (
    cancel_subscription_at_period_end,
    cancel_subscription_immediately,
    sync_subscription_from_stripe,
)
from app.config import get_settings
from app.deps import (
    get_staff_user,
    require_permission,
    require_step_up,
    require_totp_enrolled,
)
from app.errors import RATE_LIMITED, error
from app.middleware import client_ip
from app.billing.anthropic_pricing import PRICING_SOURCE, PRICING_VERSION
from app.models import (
    AdminAuditLog,
    AnalysisJob,
    CompEntitlement,
    Document,
    DocumentRevealGrant,
    LlmUsageEvent,
    PasswordResetToken,
    RefreshToken,
    StaffTotpSecret,
    StripeWebhookEvent,
    Subscription,
    User,
)
from app.rate_limit import limiter
from app.schemas import (
    AdminAuditItem,
    AdminAuditListOut,
    AdminCompOut,
    AdminJobItem,
    AdminJobListOut,
    AdminOverviewOut,
    AdminSecurityStatusOut,
    AdminSubscriptionItem,
    AdminSubscriptionListOut,
    AdminUserDetailOut,
    AdminUserListItem,
    AdminUserListOut,
    AiUsageDailyPoint,
    AiUsageEventOut,
    AiUsageModelBreakdown,
    AiUsageSummaryOut,
    CompGrantRequest,
    CompRevokeRequest,
    DeactivateUserRequest,
    StaffRoleRequest,
    TotpConfirmRequest,
    TotpSetupOut,
    TotpStepUpRequest,
    TrialOverrideRequest,
    WebhookHealthOut,
)
from app.security import (
    STEP_UP_COOKIE,
    create_step_up_token,
    decode_step_up_token,
    hash_token,
    new_refresh_token,
    set_step_up_cookie,
)
from app.services.jobs import process_job

logger = logging.getLogger("detechtico.admin")
router = APIRouter(prefix="/admin", tags=["admin"])


def _step_up_active(request: Request, user: User) -> bool:
    token = request.cookies.get(STEP_UP_COOKIE)
    if not token:
        return False
    try:
        return decode_step_up_token(token) == user.id
    except (jwt.PyJWTError, ValueError):
        return False


def _user_list_item(user: User, db: Session) -> AdminUserListItem:
    sub = user.subscription
    comp = active_comp_entitlement(db, user.id)
    return AdminUserListItem(
        id=user.id,
        email=user.email,
        name=user.name,
        is_active=user.is_active,
        staff_role=user.staff_role,
        created_at=user.created_at,
        trial_ends_at=user.trial_ends_at,
        trial_active=user.trial_active,
        entitled=user_is_entitled(user, sub, db),
        subscription_status=user.subscription_status,
        plan_id=user.plan_id,
        comp_active=comp is not None,
    )


def _user_detail(db: Session, user_id: UUID) -> AdminUserDetailOut:
    user = db.scalar(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.subscription), selectinload(User.comp_entitlements))
    )
    if user is None:
        raise error(404, "not_found", "User not found.")
    base = _user_list_item(user, db)
    comp = active_comp_entitlement(db, user.id)
    jobs = db.scalars(
        select(AnalysisJob)
        .where(AnalysisJob.user_id == user.id)
        .order_by(AnalysisJob.created_at.desc())
        .limit(10)
    ).all()
    sub = user.subscription
    return AdminUserDetailOut(
        **base.model_dump(),
        current_period_end=user.current_period_end,
        cancel_at_period_end=user.cancel_at_period_end,
        stripe_customer_id=sub.stripe_customer_id if sub else None,
        stripe_subscription_id=sub.stripe_subscription_id if sub else None,
        active_comp=(
            AdminCompOut(
                id=comp.id,
                reason=comp.reason,
                expires_at=comp.expires_at,
                created_at=comp.created_at,
            )
            if comp
            else None
        ),
        recent_jobs=[
            {
                "id": str(j.id),
                "status": j.status,
                "error_code": j.error_code,
                "created_at": j.created_at.isoformat(),
                "retry_count": j.retry_count,
            }
            for j in jobs
        ],
    )





# --- Security / 2FA ---


@router.get("/security", response_model=AdminSecurityStatusOut)
def security_status(
    request: Request,
    user: User = Depends(get_staff_user),
) -> AdminSecurityStatusOut:
    return AdminSecurityStatusOut(
        enrolled=user.totp_enrolled,
        staff_role=user.staff_role or "",
        step_up_active=_step_up_active(request, user),
    )


@router.post("/security/totp/setup", response_model=TotpSetupOut)
def totp_setup(
    request: Request,
    user: User = Depends(get_staff_user),
    db: Session = Depends(get_admin_db),
) -> TotpSetupOut:
    ip = client_ip(request)
    if not limiter.allow(f"admin-totp-setup:{user.id}:{ip}", 5, 60):
        raise RATE_LIMITED

    actor = db.get(User, user.id)
    if actor is None:
        raise error(401, "unauthorized", "Please sign in again.")

    if actor.totp_enrolled:
        raise error(409, "totp_already_enrolled", "Two-factor authentication is already enrolled.")

    secret = generate_totp_secret()
    row = db.get(StaffTotpSecret, actor.id)
    if row is None:
        row = StaffTotpSecret(user_id=actor.id, secret=secret, confirmed_at=None)
        db.add(row)
    else:
        row.secret = secret
        row.confirmed_at = None
    db.flush()
    return TotpSetupOut(
        secret=secret,
        otpauth_url=provisioning_uri(secret, actor.email),
        enrolled=False,
    )


@router.post("/security/totp/confirm", response_model=AdminSecurityStatusOut)
def totp_confirm(
    payload: TotpConfirmRequest,
    request: Request,
    response: Response,
    user: User = Depends(get_staff_user),
    db: Session = Depends(get_admin_db),
) -> AdminSecurityStatusOut:
    ip = client_ip(request)
    if not limiter.allow(f"admin-totp-confirm:{user.id}:{ip}", 10, 60):
        raise RATE_LIMITED

    actor = db.get(User, user.id)
    if actor is None:
        raise error(401, "unauthorized", "Please sign in again.")
    row = db.get(StaffTotpSecret, actor.id)
    if row is None:
        raise error(400, "totp_not_started", "Start TOTP setup first.")
    if not verify_totp(row.secret, payload.code):
        raise error(400, "invalid_totp", "Invalid authenticator code.")

    row.confirmed_at = datetime.now(timezone.utc)
    write_audit(
        db,
        actor=actor,
        action="totp_enrolled",
        target_type="user",
        target_id=actor.id,
    )
    set_step_up_cookie(response, create_step_up_token(actor.id))
    db.flush()
    return AdminSecurityStatusOut(
        enrolled=True,
        staff_role=actor.staff_role or "",
        step_up_active=True,
    )


@router.post("/security/step-up", response_model=AdminSecurityStatusOut)
def step_up(
    payload: TotpStepUpRequest,
    request: Request,
    response: Response,
    user: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminSecurityStatusOut:
    ip = client_ip(request)
    if not limiter.allow(f"admin-step-up:{user.id}:{ip}", 10, 60):
        raise RATE_LIMITED

    actor = db.get(User, user.id)
    if actor is None or not actor.totp_enrolled or actor.staff_totp is None:
        raise error(400, "totp_required", "Enroll two-factor authentication first.")
    if not verify_totp(actor.staff_totp.secret, payload.code):
        raise error(400, "invalid_totp", "Invalid authenticator code.")

    set_step_up_cookie(response, create_step_up_token(actor.id))
    return AdminSecurityStatusOut(
        enrolled=True,
        staff_role=actor.staff_role or "",
        step_up_active=True,
    )


# --- Overview ---


@router.get("/overview", response_model=AdminOverviewOut)
def overview(
    _: User = Depends(require_permission("overview.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminOverviewOut:
    now = datetime.now(timezone.utc)
    day7 = now - timedelta(days=7)
    day30 = now - timedelta(days=30)
    day1 = now - timedelta(days=1)
    stuck_cutoff = now - timedelta(minutes=15)

    total_users = db.scalar(select(func.count()).select_from(User)) or 0
    active_users = db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(True))) or 0
    signups_7d = db.scalar(select(func.count()).select_from(User).where(User.created_at >= day7)) or 0
    signups_30d = db.scalar(select(func.count()).select_from(User).where(User.created_at >= day30)) or 0

    mix_rows = db.execute(
        select(Subscription.plan_id, func.count())
        .where(Subscription.status.in_(["active", "trialing", "past_due"]))
        .group_by(Subscription.plan_id)
    ).all()
    subscription_mix = {str(plan or "none"): int(count) for plan, count in mix_rows}

    past_due_count = (
        db.scalar(select(func.count()).select_from(Subscription).where(Subscription.status == "past_due"))
        or 0
    )
    stuck_jobs = (
        db.scalar(
            select(func.count())
            .select_from(AnalysisJob)
            .where(
                or_(
                    AnalysisJob.status == "queued",
                    (AnalysisJob.status == "running") & (AnalysisJob.started_at < stuck_cutoff),
                )
            )
        )
        or 0
    )
    failed_jobs_24h = (
        db.scalar(
            select(func.count())
            .select_from(AnalysisJob)
            .where(AnalysisJob.status == "failed", AnalysisJob.finished_at >= day1)
        )
        or 0
    )
    last_webhook_at = db.scalar(select(func.max(StripeWebhookEvent.processed_at)))

    # Entitled approximation: active trial OR paid status OR active comp
    users = db.scalars(
        select(User).options(selectinload(User.subscription), selectinload(User.comp_entitlements))
    ).all()
    entitled_users = sum(1 for u in users if user_is_entitled(u, u.subscription, db))

    return AdminOverviewOut(
        total_users=total_users,
        active_users=active_users,
        entitled_users=entitled_users,
        signups_7d=signups_7d,
        signups_30d=signups_30d,
        subscription_mix=subscription_mix,
        stuck_jobs=stuck_jobs,
        failed_jobs_24h=failed_jobs_24h,
        webhook_failures_24h=0,
        last_webhook_at=last_webhook_at,
        past_due_count=past_due_count,
    )


@router.get("/webhooks/health", response_model=WebhookHealthOut)
def webhook_health(
    _: User = Depends(require_permission("subscriptions.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> WebhookHealthOut:
    now = datetime.now(timezone.utc)
    day1 = now - timedelta(days=1)
    return WebhookHealthOut(
        last_processed_at=db.scalar(select(func.max(StripeWebhookEvent.processed_at))),
        processed_24h=db.scalar(
            select(func.count())
            .select_from(StripeWebhookEvent)
            .where(StripeWebhookEvent.processed_at >= day1)
        )
        or 0,
    )


# --- Users ---


@router.get("/users", response_model=AdminUserListOut)
def list_users(
    q: str | None = None,
    is_active: bool | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_permission("users.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminUserListOut:
    stmt = select(User).options(selectinload(User.subscription), selectinload(User.comp_entitlements))
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = stmt.where(or_(func.lower(User.email).like(like), func.lower(User.name).like(like)))
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))
    total = db.scalar(select(func.count()).select_from(User)) or 0
    if q:
        like = f"%{q.strip().lower()}%"
        total = (
            db.scalar(
                select(func.count())
                .select_from(User)
                .where(or_(func.lower(User.email).like(like), func.lower(User.name).like(like)))
            )
            or 0
        )
        if is_active is not None:
            total = (
                db.scalar(
                    select(func.count())
                    .select_from(User)
                    .where(
                        or_(func.lower(User.email).like(like), func.lower(User.name).like(like)),
                        User.is_active.is_(is_active),
                    )
                )
                or 0
            )
    elif is_active is not None:
        total = (
            db.scalar(select(func.count()).select_from(User).where(User.is_active.is_(is_active)))
            or 0
        )
    users = db.scalars(stmt.order_by(User.created_at.desc()).offset(offset).limit(limit)).all()
    return AdminUserListOut(items=[_user_list_item(u, db) for u in users], total=total)


@router.get("/users/{user_id}", response_model=AdminUserDetailOut)
def get_user(
    user_id: UUID,
    _: User = Depends(require_permission("users.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    return _user_detail(db, user_id)


@router.post("/users/{user_id}/deactivate", response_model=AdminUserDetailOut)
def deactivate_user(
    user_id: UUID,
    payload: DeactivateUserRequest,
    actor: User = Depends(require_permission("users.deactivate")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    if target.id == actor.id:
        raise error(400, "cannot_deactivate_self", "You cannot deactivate your own account.")

    actor_row = db.get(User, actor.id)
    assert actor_row is not None

    if payload.billing_action == "leave" and not payload.reason.strip():
        raise error(400, "reason_required", "A reason is required when leaving billing unchanged.")

    billing_outcome = "unchanged"
    billing_error = None
    if payload.billing_action != "leave":
        try:
            if payload.billing_action == "cancel_at_period_end":
                cancel_subscription_at_period_end(db, target)
                billing_outcome = "cancel_at_period_end"
            else:
                cancel_subscription_immediately(db, target)
                billing_outcome = "cancel_immediately"
        except Exception as exc:
            billing_error = str(getattr(exc, "detail", exc))
            logger.exception("Billing action failed during deactivate for %s", target.id)

    target.is_active = False
    now = datetime.now(timezone.utc)
    tokens = db.scalars(
        select(RefreshToken).where(RefreshToken.user_id == target.id, RefreshToken.revoked_at.is_(None))
    ).all()
    for token in tokens:
        token.revoked_at = now

    write_audit(
        db,
        actor=actor_row,
        action="user_deactivate",
        target_type="user",
        target_id=target.id,
        metadata={
            "reason": payload.reason,
            "billing_action": payload.billing_action,
            "billing_outcome": billing_outcome,
            "billing_error": billing_error,
        },
    )
    db.flush()
    return _user_detail(db, user_id)


@router.post("/users/{user_id}/activate", response_model=AdminUserDetailOut)
def activate_user(
    user_id: UUID,
    actor: User = Depends(require_permission("users.activate")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    target.is_active = True
    write_audit(
        db,
        actor=actor_row,
        action="user_activate",
        target_type="user",
        target_id=target.id,
    )
    db.flush()
    return _user_detail(db, user_id)


@router.post("/users/{user_id}/force-logout", status_code=204)
def force_logout(
    user_id: UUID,
    actor: User = Depends(require_permission("users.force_logout")),
    _: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> Response:
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    now = datetime.now(timezone.utc)
    tokens = db.scalars(
        select(RefreshToken).where(RefreshToken.user_id == target.id, RefreshToken.revoked_at.is_(None))
    ).all()
    for token in tokens:
        token.revoked_at = now
    write_audit(
        db,
        actor=actor_row,
        action="user_force_logout",
        target_type="user",
        target_id=target.id,
        metadata={"revoked_tokens": len(tokens)},
    )
    db.flush()
    return Response(status_code=204)


@router.post("/users/{user_id}/password-reset", status_code=204)
def trigger_password_reset(
    user_id: UUID,
    actor: User = Depends(require_permission("users.password_reset")),
    _: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> Response:
    target = db.get(User, user_id)
    if target is None or not target.is_active:
        raise error(404, "not_found", "User not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    raw = new_refresh_token()
    db.add(
        PasswordResetToken(
            user_id=target.id,
            token_hash=hash_token(raw),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
    )
    settings = get_settings()
    if not settings.is_production:
        origin = settings.cors_origin_list[0] if settings.cors_origin_list else "http://localhost:3000"
        logger.warning(
            "Admin-triggered password reset for %s: %s/reset-password?token=%s",
            target.email,
            origin,
            raw,
        )
    write_audit(
        db,
        actor=actor_row,
        action="user_password_reset",
        target_type="user",
        target_id=target.id,
    )
    db.flush()
    return Response(status_code=204)


@router.post("/users/{user_id}/trial", response_model=AdminUserDetailOut)
def set_trial(
    user_id: UUID,
    payload: TrialOverrideRequest,
    actor: User = Depends(require_permission("users.trial")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    before = target.trial_ends_at.isoformat()
    target.trial_ends_at_override = payload.trial_ends_at
    write_audit(
        db,
        actor=actor_row,
        action="trial_override",
        target_type="user",
        target_id=target.id,
        metadata={"reason": payload.reason, "before": before, "after": payload.trial_ends_at.isoformat()},
    )
    db.flush()
    return _user_detail(db, user_id)


@router.post("/users/{user_id}/comp", response_model=AdminUserDetailOut)
def grant_comp(
    user_id: UUID,
    payload: CompGrantRequest,
    actor: User = Depends(require_permission("billing.comp")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    if payload.expires_at <= datetime.now(timezone.utc):
        raise error(400, "invalid_expiry", "expires_at must be in the future.")
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    row = CompEntitlement(
        id=uuid4(),
        user_id=target.id,
        reason=payload.reason.strip(),
        expires_at=payload.expires_at,
        granted_by_user_id=actor_row.id,
    )
    db.add(row)
    write_audit(
        db,
        actor=actor_row,
        action="comp_granted",
        target_type="user",
        target_id=target.id,
        metadata={"reason": payload.reason, "expires_at": payload.expires_at.isoformat(), "comp_id": str(row.id)},
    )
    db.flush()
    return _user_detail(db, user_id)


@router.post("/users/{user_id}/comp/revoke", response_model=AdminUserDetailOut)
def revoke_comp(
    user_id: UUID,
    payload: CompRevokeRequest,
    actor: User = Depends(require_permission("billing.comp")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    comp = active_comp_entitlement(db, target.id)
    if comp is None:
        raise error(404, "not_found", "No active complimentary entitlement.")
    now = datetime.now(timezone.utc)
    before = comp.expires_at.isoformat()
    comp.expires_at = now
    write_audit(
        db,
        actor=actor_row,
        action="comp_revoked",
        target_type="user",
        target_id=target.id,
        metadata={"reason": payload.reason, "before_expires_at": before, "comp_id": str(comp.id)},
    )
    db.flush()
    return _user_detail(db, user_id)


@router.post("/users/{user_id}/staff-role", response_model=AdminUserDetailOut)
def set_staff_role(
    user_id: UUID,
    payload: StaffRoleRequest,
    actor: User = Depends(require_permission("staff.manage")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    if payload.staff_role is not None and payload.staff_role not in STAFF_ROLES:
        raise error(400, "invalid_role", "Invalid staff role.")
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    if target.id == actor.id:
        raise error(400, "cannot_change_own_role", "You cannot change your own staff role.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    before = target.staff_role
    target.staff_role = payload.staff_role
    write_audit(
        db,
        actor=actor_row,
        action="staff_role_change",
        target_type="user",
        target_id=target.id,
        metadata={"before": before, "after": payload.staff_role},
    )
    db.flush()
    return _user_detail(db, user_id)


@router.post("/users/{user_id}/sync-subscription", response_model=AdminUserDetailOut)
def sync_user_subscription(
    user_id: UUID,
    actor: User = Depends(require_permission("billing.sync")),
    _: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminUserDetailOut:
    target = db.get(User, user_id)
    if target is None:
        raise error(404, "not_found", "User not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    result = sync_subscription_from_stripe(db, target)
    write_audit(
        db,
        actor=actor_row,
        action="subscription_sync",
        target_type="user",
        target_id=target.id,
        metadata={"result": result.value},
    )
    db.flush()
    return _user_detail(db, user_id)


# --- Subscriptions ---


@router.get("/subscriptions", response_model=AdminSubscriptionListOut)
def list_subscriptions(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_permission("subscriptions.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminSubscriptionListOut:
    stmt = (
        select(Subscription, User)
        .join(User, User.id == Subscription.user_id)
        .order_by(Subscription.updated_at.desc())
    )
    if status_filter:
        stmt = stmt.where(Subscription.status == status_filter)
    rows = db.execute(stmt.offset(offset).limit(limit)).all()
    if status_filter:
        total = (
            db.scalar(select(func.count()).select_from(Subscription).where(Subscription.status == status_filter))
            or 0
        )
    else:
        total = db.scalar(select(func.count()).select_from(Subscription)) or 0

    items = [
        AdminSubscriptionItem(
            user_id=sub.user_id,
            email=user.email,
            plan_id=sub.plan_id,
            status=sub.status,
            billing_period=sub.billing_period,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
            stripe_customer_id=sub.stripe_customer_id,
            stripe_subscription_id=sub.stripe_subscription_id,
        )
        for sub, user in rows
    ]
    return AdminSubscriptionListOut(items=items, total=total)


# --- Jobs ---


@router.get("/jobs", response_model=AdminJobListOut)
def list_jobs(
    status_filter: str | None = Query(default=None, alias="status"),
    stuck: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_permission("jobs.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminJobListOut:
    stuck_cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    stmt = (
        select(AnalysisJob, User, Document)
        .join(User, User.id == AnalysisJob.user_id)
        .join(Document, Document.id == AnalysisJob.document_id)
        .order_by(AnalysisJob.created_at.desc())
    )
    count_stmt = select(func.count()).select_from(AnalysisJob)
    if status_filter:
        stmt = stmt.where(AnalysisJob.status == status_filter)
        count_stmt = count_stmt.where(AnalysisJob.status == status_filter)
    if stuck:
        stuck_filter = or_(
            AnalysisJob.status == "queued",
            (AnalysisJob.status == "running") & (AnalysisJob.started_at < stuck_cutoff),
        )
        stmt = stmt.where(stuck_filter)
        count_stmt = count_stmt.where(stuck_filter)

    rows = db.execute(stmt.offset(offset).limit(limit)).all()
    total = db.scalar(count_stmt) or 0
    items = [
        AdminJobItem(
            id=job.id,
            user_id=job.user_id,
            user_email=user.email,
            document_id=job.document_id,
            original_filename=document.original_filename,
            status=job.status,
            error_code=job.error_code,
            llm_status=job.llm_status,
            retry_count=job.retry_count,
            created_at=job.created_at,
            started_at=job.started_at,
            finished_at=job.finished_at,
        )
        for job, user, document in rows
    ]
    return AdminJobListOut(items=items, total=total)


@router.post("/jobs/{job_id}/requeue", response_model=AdminJobItem)
def requeue_job(
    job_id: UUID,
    background: BackgroundTasks,
    actor: User = Depends(require_permission("jobs.requeue")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminJobItem:
    settings = get_settings()
    job = db.get(AnalysisJob, job_id)
    if job is None:
        raise error(404, "not_found", "Job not found.")
    if job.status == "abandoned":
        raise error(400, "job_abandoned", "Abandoned jobs cannot be requeued.")
    if job.retry_count >= settings.admin_max_requeue:
        raise error(
            400,
            "requeue_cap",
            f"Retry cap ({settings.admin_max_requeue}) reached. Mark abandoned or start a new analysis.",
        )
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    job.status = "queued"
    job.error_code = None
    job.llm_status = "pending"
    job.started_at = None
    job.finished_at = None
    job.retry_count += 1
    write_audit(
        db,
        actor=actor_row,
        action="job_requeue",
        target_type="analysis_job",
        target_id=job.id,
        metadata={"retry_count": job.retry_count},
    )
    db.flush()
    background.add_task(process_job, job.id)
    user = db.get(User, job.user_id)
    document = db.get(Document, job.document_id)
    return AdminJobItem(
        id=job.id,
        user_id=job.user_id,
        user_email=user.email if user else None,
        document_id=job.document_id,
        original_filename=document.original_filename if document else None,
        status=job.status,
        error_code=job.error_code,
        llm_status=job.llm_status,
        retry_count=job.retry_count,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )


@router.post("/jobs/{job_id}/abandon", response_model=AdminJobItem)
def abandon_job(
    job_id: UUID,
    actor: User = Depends(require_permission("jobs.abandon")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> AdminJobItem:
    job = db.get(AnalysisJob, job_id)
    if job is None:
        raise error(404, "not_found", "Job not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    job.status = "abandoned"
    job.finished_at = datetime.now(timezone.utc)
    write_audit(
        db,
        actor=actor_row,
        action="job_abandon",
        target_type="analysis_job",
        target_id=job.id,
        metadata={"retry_count": job.retry_count},
    )
    db.flush()
    user = db.get(User, job.user_id)
    document = db.get(Document, job.document_id)
    return AdminJobItem(
        id=job.id,
        user_id=job.user_id,
        user_email=user.email if user else None,
        document_id=job.document_id,
        original_filename=document.original_filename if document else None,
        status=job.status,
        error_code=job.error_code,
        llm_status=job.llm_status,
        retry_count=job.retry_count,
        created_at=job.created_at,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )


@router.post("/documents/{document_id}/reveal")
def reveal_document(
    document_id: UUID,
    actor: User = Depends(require_permission("documents.reveal")),
    _: User = Depends(require_step_up),
    db: Session = Depends(get_admin_db),
) -> dict:
    document = db.get(Document, document_id)
    if document is None:
        raise error(404, "not_found", "Document not found.")
    actor_row = db.get(User, actor.id)
    assert actor_row is not None
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.admin_reveal_minutes)
    grant = DocumentRevealGrant(
        id=uuid4(),
        actor_user_id=actor_row.id,
        document_id=document.id,
        expires_at=expires_at,
    )
    db.add(grant)
    write_audit(
        db,
        actor=actor_row,
        action="reveal_granted",
        target_type="document",
        target_id=document.id,
        metadata={"expires_at": expires_at.isoformat()},
    )
    db.flush()
    return {
        "document_id": str(document.id),
        "original_filename": document.original_filename,
        "mime": document.mime,
        "size_bytes": document.size_bytes,
        "checksum_sha256": document.checksum_sha256,
        "expires_at": expires_at.isoformat(),
    }


# --- Audit ---


@router.get("/audit", response_model=AdminAuditListOut)
def list_audit(
    action: str | None = None,
    target_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_permission("audit.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AdminAuditListOut:
    stmt = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
    count_stmt = select(func.count()).select_from(AdminAuditLog)
    if action:
        stmt = stmt.where(AdminAuditLog.action == action)
        count_stmt = count_stmt.where(AdminAuditLog.action == action)
    if target_id:
        stmt = stmt.where(AdminAuditLog.target_id == target_id)
        count_stmt = count_stmt.where(AdminAuditLog.target_id == target_id)
    rows = db.scalars(stmt.offset(offset).limit(limit)).all()
    total = db.scalar(count_stmt) or 0
    return AdminAuditListOut(
        items=[
            AdminAuditItem(
                id=row.id,
                actor_user_id=row.actor_user_id,
                actor_role=row.actor_role,
                action=row.action,
                target_type=row.target_type,
                target_id=row.target_id,
                metadata=row.metadata_json or {},
                created_at=row.created_at,
            )
            for row in rows
        ],
        total=total,
    )


@router.get("/ai-usage", response_model=AiUsageSummaryOut)
def ai_usage_summary(
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    _: User = Depends(require_permission("ai_usage.read")),
    __: User = Depends(require_totp_enrolled),
    db: Session = Depends(get_admin_db),
) -> AiUsageSummaryOut:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    settings = get_settings()

    base = select(LlmUsageEvent).where(LlmUsageEvent.created_at >= since)
    events = db.scalars(base.order_by(LlmUsageEvent.created_at.desc())).all()

    total_calls = len(events)
    succeeded = sum(1 for e in events if e.status == "succeeded")
    failed = sum(1 for e in events if e.status == "failed")
    skipped = sum(1 for e in events if e.status == "skipped")
    total_input = sum(e.input_tokens for e in events)
    total_output = sum(e.output_tokens for e in events)
    total_cache_write = sum(e.cache_creation_input_tokens for e in events)
    total_cache_read = sum(e.cache_read_input_tokens for e in events)
    total_cost = float(sum(float(e.total_cost_usd or 0) for e in events))
    avg_cost = (total_cost / succeeded) if succeeded else 0.0

    by_model_map: dict[str, AiUsageModelBreakdown] = {}
    for e in events:
        row = by_model_map.get(e.model)
        if row is None:
            row = AiUsageModelBreakdown(
                model=e.model,
                calls=0,
                input_tokens=0,
                output_tokens=0,
                total_cost_usd=0.0,
            )
            by_model_map[e.model] = row
        row.calls += 1
        row.input_tokens += e.input_tokens
        row.output_tokens += e.output_tokens
        row.total_cost_usd = float(row.total_cost_usd) + float(e.total_cost_usd or 0)

    daily_map: dict[str, AiUsageDailyPoint] = {}
    for e in events:
        day = e.created_at.astimezone(timezone.utc).date().isoformat()
        point = daily_map.get(day)
        if point is None:
            point = AiUsageDailyPoint(
                day=day, calls=0, total_cost_usd=0.0, input_tokens=0, output_tokens=0
            )
            daily_map[day] = point
        point.calls += 1
        point.total_cost_usd = float(point.total_cost_usd) + float(e.total_cost_usd or 0)
        point.input_tokens += e.input_tokens
        point.output_tokens += e.output_tokens

    recent_events = events[:limit]
    user_ids = {e.user_id for e in recent_events}
    email_by_id: dict = {}
    if user_ids:
        for u in db.scalars(select(User).where(User.id.in_(user_ids))).all():
            email_by_id[u.id] = u.email

    recent = [
        AiUsageEventOut(
            id=e.id,
            user_id=e.user_id,
            user_email=email_by_id.get(e.user_id),
            job_id=e.job_id,
            model=e.model,
            status=e.status,
            anthropic_request_id=e.anthropic_request_id,
            input_tokens=e.input_tokens,
            output_tokens=e.output_tokens,
            cache_creation_input_tokens=e.cache_creation_input_tokens,
            cache_read_input_tokens=e.cache_read_input_tokens,
            input_cost_usd=float(e.input_cost_usd or 0),
            output_cost_usd=float(e.output_cost_usd or 0),
            cache_write_cost_usd=float(e.cache_write_cost_usd or 0),
            cache_read_cost_usd=float(e.cache_read_cost_usd or 0),
            total_cost_usd=float(e.total_cost_usd or 0),
            pricing_known=bool(e.pricing_known),
            pricing_version=e.pricing_version,
            pricing_source=e.pricing_source,
            rates_json=e.rates_json,
            error_code=e.error_code,
            created_at=e.created_at,
        )
        for e in recent_events
    ]

    return AiUsageSummaryOut(
        window_days=days,
        total_calls=total_calls,
        succeeded_calls=succeeded,
        failed_calls=failed,
        skipped_calls=skipped,
        total_input_tokens=total_input,
        total_output_tokens=total_output,
        total_cache_creation_tokens=total_cache_write,
        total_cache_read_tokens=total_cache_read,
        total_cost_usd=round(total_cost, 6),
        avg_cost_per_succeeded_call_usd=round(avg_cost, 6),
        pricing_source=PRICING_SOURCE,
        pricing_version=PRICING_VERSION,
        configured_model=settings.anthropic_model,
        by_model=sorted(by_model_map.values(), key=lambda r: r.total_cost_usd, reverse=True),
        daily=sorted(daily_map.values(), key=lambda r: r.day),
        recent=recent,
    )
