from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

TRIAL_DAYS = 3

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    staff_role: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    trial_ends_at_override: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user")
    documents: Mapped[list["Document"]] = relationship(back_populates="user")
    risk_settings: Mapped[Optional["UserRiskSettings"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    subscription: Mapped[Optional["Subscription"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    staff_totp: Mapped[Optional["StaffTotpSecret"]] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    comp_entitlements: Mapped[list["CompEntitlement"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="CompEntitlement.user_id",
    )

    @property
    def is_staff(self) -> bool:
        return self.staff_role in {"support", "billing_ops", "superadmin"}

    @property
    def trial_ends_at(self) -> datetime:
        if self.trial_ends_at_override is not None:
            return self.trial_ends_at_override
        return self.created_at + timedelta(days=TRIAL_DAYS)

    @property
    def trial_active(self) -> bool:
        return datetime.now(timezone.utc) < self.trial_ends_at

    @property
    def plan_id(self) -> str | None:
        return self.subscription.plan_id if self.subscription else None

    @property
    def subscription_status(self) -> str:
        return self.subscription.status if self.subscription else "none"

    @property
    def billing_period(self) -> str | None:
        return self.subscription.billing_period if self.subscription else None

    @property
    def current_period_end(self) -> datetime | None:
        return self.subscription.current_period_end if self.subscription else None

    @property
    def cancel_at_period_end(self) -> bool:
        return bool(self.subscription.cancel_at_period_end) if self.subscription else False

    @property
    def entitled(self) -> bool:
        from app.billing.entitlements import user_is_entitled

        return user_is_entitled(self, self.subscription)

    @property
    def totp_enrolled(self) -> bool:
        return bool(self.staff_totp and self.staff_totp.confirmed_at is not None)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    original_filename: Mapped[str] = mapped_column(String(255))
    storage_name: Mapped[str] = mapped_column(String(80), unique=True)
    detected_type: Mapped[str] = mapped_column(String(16))
    mime: Mapped[str] = mapped_column(String(127))
    size_bytes: Mapped[int] = mapped_column(BigInteger)
    checksum_sha256: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="documents")
    jobs: Mapped[list["AnalysisJob"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    statement_type: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    llm_status: Mapped[str] = mapped_column(String(16), default="pending")
    retry_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    document: Mapped[Document] = relationship(back_populates="jobs")
    findings: Mapped[list["Finding"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_jobs.id", ondelete="CASCADE"), index=True
    )
    source: Mapped[str] = mapped_column(String(8))
    title: Mapped[str] = mapped_column(String(180))
    detail: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(8))
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(180), nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rule_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    job: Mapped[AnalysisJob] = relationship(back_populates="findings")


class ImportedTransaction(Base):
    __tablename__ = "imported_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    external_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    merchant: Mapped[str] = mapped_column(String(180))
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(8), default="USD")
    txn_date: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(16))
    risk_score: Mapped[int] = mapped_column(Integer)
    source_filename: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserRiskSettings(Base):
    __tablename__ = "user_risk_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    high_risk_threshold: Mapped[int] = mapped_column(Integer, default=75)
    medium_risk_threshold: Mapped[int] = mapped_column(Integer, default=50)
    amount_alert: Mapped[int] = mapped_column(Integer, default=1000)
    rules: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="risk_settings")


class FindingDisposition(Base):
    __tablename__ = "finding_dispositions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    finding_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("findings.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_jobs.id", ondelete="CASCADE"), index=True
    )
    disposition: Mapped[str] = mapped_column(String(16))
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    stripe_price_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    plan_id: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    billing_period: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="none", server_default="none")
    current_period_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    last_event_created_at: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="subscription")


class StripeWebhookEvent(Base):
    __tablename__ = "stripe_webhook_events"

    event_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    type: Mapped[str] = mapped_column(String(120))
    event_created: Mapped[int] = mapped_column(BigInteger)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmailChangeChallenge(Base):
    __tablename__ = "email_change_challenges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    new_email: Mapped[str] = mapped_column(String(254))
    otp_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class EmailChangeRevertToken(Base):
    __tablename__ = "email_change_revert_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    previous_email: Mapped[str] = mapped_column(String(254))
    new_email: Mapped[str] = mapped_column(String(254))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SignupChallenge(Base):
    __tablename__ = "signup_challenges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    otp_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StaffTotpSecret(Base):
    __tablename__ = "staff_totp_secrets"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    secret: Mapped[str] = mapped_column(String(64))
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="staff_totp")


class CompEntitlement(Base):
    __tablename__ = "comp_entitlements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    reason: Mapped[str] = mapped_column(String(500))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    granted_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="comp_entitlements", foreign_keys=[user_id])


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    actor_role: Mapped[str] = mapped_column(String(32))
    action: Mapped[str] = mapped_column(String(64), index=True)
    target_type: Mapped[str] = mapped_column(String(64))
    target_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    request_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class DocumentRevealGrant(Base):
    __tablename__ = "document_reveal_grants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LlmUsageEvent(Base):
    """One Anthropic Messages API call (or skipped attempt) for cost accounting."""

    __tablename__ = "llm_usage_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_jobs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    model: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    anthropic_request_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    cache_creation_input_tokens: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    cache_read_input_tokens: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    input_cost_usd: Mapped[float] = mapped_column(Numeric(14, 6), default=0)
    output_cost_usd: Mapped[float] = mapped_column(Numeric(14, 6), default=0)
    cache_write_cost_usd: Mapped[float] = mapped_column(Numeric(14, 6), default=0)
    cache_read_cost_usd: Mapped[float] = mapped_column(Numeric(14, 6), default=0)
    total_cost_usd: Mapped[float] = mapped_column(Numeric(14, 6), default=0, index=True)
    pricing_known: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    pricing_version: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    pricing_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rates_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
