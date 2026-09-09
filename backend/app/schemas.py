from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

StatementType = Literal["balance-sheet", "income", "cash-flow"]
Severity = Literal["high", "medium", "low"]
JobStatus = Literal["queued", "running", "succeeded", "failed", "abandoned"]
LlmStatus = Literal["pending", "succeeded", "skipped", "failed"]
FindingSource = Literal["rule", "gpt", "llm"]
TransactionStatus = Literal["flagged", "review", "clear"]


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    accepted_terms: bool

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Name is required")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("accepted_terms")
    @classmethod
    def must_accept(cls, value: bool) -> bool:
        if not value:
            raise ValueError("You must accept the terms")
        return value


class ConfirmSignupRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("otp")
    @classmethod
    def digits_only(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError("Enter the 6-digit code from your email")
        return cleaned


class SignupRequestedOut(BaseModel):
    message: str
    email: str
    expires_in_seconds: int = 600
    resend_after_seconds: int = 60


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    remember: bool = False

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=12, max_length=128)


class UpdateProfileRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Name is required")
        return cleaned


class RequestEmailChangeRequest(BaseModel):
    new_email: EmailStr
    current_password: str = Field(min_length=1, max_length=128)

    @field_validator("new_email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class ConfirmEmailChangeRequest(BaseModel):
    otp: str = Field(min_length=6, max_length=6)

    @field_validator("otp")
    @classmethod
    def digits_only(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError("Enter the 6-digit code from your email")
        return cleaned


class RevertEmailChangeRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class EmailChangeRequestedOut(BaseModel):
    message: str
    new_email: str
    expires_in_seconds: int = 600
    resend_after_seconds: int = 60


class VerifyPasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    created_at: datetime
    trial_ends_at: datetime
    trial_active: bool
    plan_id: Optional[str] = None
    subscription_status: str = "none"
    billing_period: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    entitled: bool = False
    staff_role: Optional[str] = None
    totp_enrolled: bool = False
    is_staff: bool = False


class CheckoutSessionRequest(BaseModel):
    plan_id: Literal["essential", "professional"]
    billing_period: Literal["monthly", "annual"]


class CheckoutSessionOut(BaseModel):
    url: str


class PortalSessionOut(BaseModel):
    url: str


class ConfirmSessionRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=255)


class BillingStatusOut(BaseModel):
    plan_id: Optional[str] = None
    subscription_status: str
    billing_period: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool
    entitled: bool
    trial_ends_at: datetime
    trial_active: bool


class DocumentOut(BaseModel):
    id: UUID
    original_filename: str
    detected_type: str
    size_bytes: int
    created_at: datetime


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    source: FindingSource
    title: str
    detail: str
    severity: Severity
    evidence: Optional[str] = None
    location: Optional[str] = None
    confidence: Optional[float] = None
    rule_id: Optional[str] = None
    disposition: Optional[Literal["confirmed", "dismissed", "needs_info"]] = None


class TransactionImportRow(BaseModel):
    id: Optional[str] = Field(default=None, max_length=80)
    merchant: str = Field(min_length=1, max_length=180)
    amount: float = Field(ge=0, le=999_999_999)
    currency: str = Field(default="USD", min_length=1, max_length=8)
    date: str = Field(min_length=1, max_length=40)
    status: TransactionStatus
    riskScore: int = Field(ge=0, le=100)


class TransactionImportRequest(BaseModel):
    source_filename: str = Field(min_length=1, max_length=255)
    transactions: list[TransactionImportRow] = Field(min_length=1, max_length=5000)


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    external_id: Optional[str] = None
    merchant: str
    amount: float
    currency: str
    date: str = Field(validation_alias="txn_date")
    status: TransactionStatus
    riskScore: int = Field(validation_alias="risk_score")
    source_filename: str
    created_at: datetime


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    document_id: UUID
    status: JobStatus
    llm_status: LlmStatus
    statement_type: Optional[StatementType] = None
    original_filename: Optional[str] = None
    error_code: Optional[str] = None
    findings: list[FindingOut] = Field(default_factory=list)
    created_at: datetime
    finished_at: Optional[datetime] = None


class JobSummaryOut(BaseModel):
    id: UUID
    document_id: UUID
    status: JobStatus
    llm_status: LlmStatus
    statement_type: Optional[StatementType] = None
    original_filename: Optional[str] = None
    error_code: Optional[str] = None
    finding_count: int = 0
    created_at: datetime
    finished_at: Optional[datetime] = None


class DetectionRuleIn(BaseModel):
    id: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=400)
    enabled: bool


class RiskSettingsOut(BaseModel):
    highRiskThreshold: int
    mediumRiskThreshold: int
    amountAlert: int
    rules: list[DetectionRuleIn]


class RiskSettingsUpdate(BaseModel):
    highRiskThreshold: int = Field(ge=1, le=100)
    mediumRiskThreshold: int = Field(ge=1, le=100)
    amountAlert: int = Field(ge=100, le=1_000_000)
    rules: list[DetectionRuleIn] = Field(min_length=1, max_length=20)

    @field_validator("rules")
    @classmethod
    def unique_rule_ids(cls, value: list[DetectionRuleIn]) -> list[DetectionRuleIn]:
        ids = [rule.id for rule in value]
        if len(ids) != len(set(ids)):
            raise ValueError("Detection rule ids must be unique")
        return value

    @model_validator(mode="after")
    def thresholds_ordered(self) -> "RiskSettingsUpdate":
        if self.mediumRiskThreshold > self.highRiskThreshold:
            raise ValueError("mediumRiskThreshold cannot exceed highRiskThreshold")
        return self


class TransactionStatusUpdate(BaseModel):
    status: TransactionStatus


class FindingDispositionRequest(BaseModel):
    disposition: Literal["confirmed", "dismissed", "needs_info"]
    note: Optional[str] = Field(default=None, max_length=1000)


class FindingDispositionOut(BaseModel):
    id: UUID
    finding_id: UUID
    job_id: UUID
    disposition: Literal["confirmed", "dismissed", "needs_info"]
    note: Optional[str] = None
    created_at: datetime


class LearningMetricOut(BaseModel):
    title: str
    value: str
    delta: str
    deltaPositive: bool
    description: str


class LearningEventOut(BaseModel):
    title: str
    source: str
    adjustment: str


class LearningSummaryOut(BaseModel):
    metrics: list[LearningMetricOut]
    events: list[LearningEventOut]
    insight: str
    counts: dict[str, int]


class NetworkStatOut(BaseModel):
    label: str
    value: str


class NetworkVendorOut(BaseModel):
    id: str
    name: str
    shortName: str
    risk: int
    transactions: int
    x: float
    y: float


class NetworkConnectionOut(BaseModel):
    fromName: str
    fromId: str
    toName: str
    toId: str
    reasons: list[str]
    score: int


class NetworkClusterVendorOut(BaseModel):
    name: str
    risk: int


class NetworkClusterOut(BaseModel):
    id: str
    title: str
    vendorCount: int
    avgRisk: int
    vendors: list[NetworkClusterVendorOut]


class NetworkSummaryOut(BaseModel):
    stats: list[NetworkStatOut]
    vendors: list[NetworkVendorOut]
    connections: list[NetworkConnectionOut]
    clusters: list[NetworkClusterOut]
    transaction_count: int


# --- Admin platform ops ---


class TotpSetupOut(BaseModel):
    secret: str
    otpauth_url: str
    enrolled: bool


class TotpConfirmRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class TotpStepUpRequest(BaseModel):
    code: str = Field(min_length=6, max_length=8)


class AdminSecurityStatusOut(BaseModel):
    enrolled: bool
    staff_role: str
    step_up_active: bool


class AdminOverviewOut(BaseModel):
    total_users: int
    active_users: int
    entitled_users: int
    signups_7d: int
    signups_30d: int
    subscription_mix: dict[str, int]
    stuck_jobs: int
    failed_jobs_24h: int
    webhook_failures_24h: int
    last_webhook_at: Optional[datetime] = None
    past_due_count: int


class AdminUserListItem(BaseModel):
    id: UUID
    email: str
    name: str
    is_active: bool
    staff_role: Optional[str] = None
    created_at: datetime
    trial_ends_at: datetime
    trial_active: bool
    entitled: bool
    subscription_status: str
    plan_id: Optional[str] = None
    comp_active: bool = False


class AdminUserListOut(BaseModel):
    items: list[AdminUserListItem]
    total: int


class AdminCompOut(BaseModel):
    id: UUID
    reason: str
    expires_at: datetime
    created_at: datetime


class AdminUserDetailOut(AdminUserListItem):
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    active_comp: Optional[AdminCompOut] = None
    recent_jobs: list[dict] = Field(default_factory=list)


class DeactivateUserRequest(BaseModel):
    billing_action: Literal["leave", "cancel_at_period_end", "cancel_immediately"]
    reason: str = Field(min_length=1, max_length=500)


class TrialOverrideRequest(BaseModel):
    trial_ends_at: datetime
    reason: str = Field(min_length=1, max_length=500)


class CompGrantRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)
    expires_at: datetime


class CompRevokeRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


class StaffRoleRequest(BaseModel):
    staff_role: Optional[Literal["support", "billing_ops", "superadmin"]] = None


class AdminSubscriptionItem(BaseModel):
    user_id: UUID
    email: str
    plan_id: Optional[str] = None
    status: str
    billing_period: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None


class AdminSubscriptionListOut(BaseModel):
    items: list[AdminSubscriptionItem]
    total: int


class AdminJobItem(BaseModel):
    id: UUID
    user_id: UUID
    user_email: Optional[str] = None
    document_id: UUID
    original_filename: Optional[str] = None
    status: str
    error_code: Optional[str] = None
    llm_status: str
    retry_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class AdminJobListOut(BaseModel):
    items: list[AdminJobItem]
    total: int


class AdminAuditItem(BaseModel):
    id: UUID
    actor_user_id: UUID
    actor_role: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class AdminAuditListOut(BaseModel):
    items: list[AdminAuditItem]
    total: int


class WebhookHealthOut(BaseModel):
    last_processed_at: Optional[datetime] = None
    processed_24h: int
    note: str = "Idempotent processed events only; failed deliveries are not stored locally."


class AiUsageEventOut(BaseModel):
    id: UUID
    user_id: UUID
    user_email: Optional[str] = None
    job_id: Optional[UUID] = None
    model: str
    status: str
    anthropic_request_id: Optional[str] = None
    input_tokens: int
    output_tokens: int
    cache_creation_input_tokens: int
    cache_read_input_tokens: int
    input_cost_usd: float
    output_cost_usd: float
    cache_write_cost_usd: float
    cache_read_cost_usd: float
    total_cost_usd: float
    pricing_known: bool
    pricing_version: Optional[str] = None
    pricing_source: Optional[str] = None
    rates_json: Optional[dict] = None
    error_code: Optional[str] = None
    created_at: datetime


class AiUsageModelBreakdown(BaseModel):
    model: str
    calls: int
    input_tokens: int
    output_tokens: int
    total_cost_usd: float


class AiUsageDailyPoint(BaseModel):
    day: str
    calls: int
    total_cost_usd: float
    input_tokens: int
    output_tokens: int


class AiUsageSummaryOut(BaseModel):
    window_days: int
    total_calls: int
    succeeded_calls: int
    failed_calls: int
    skipped_calls: int
    total_input_tokens: int
    total_output_tokens: int
    total_cache_creation_tokens: int
    total_cache_read_tokens: int
    total_cost_usd: float
    avg_cost_per_succeeded_call_usd: float
    pricing_source: str
    pricing_version: str
    configured_model: str
    by_model: list[AiUsageModelBreakdown]
    daily: list[AiUsageDailyPoint]
    recent: list[AiUsageEventOut]
