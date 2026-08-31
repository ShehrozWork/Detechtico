from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

StatementType = Literal["balance-sheet", "income", "cash-flow"]
Severity = Literal["high", "medium", "low"]
JobStatus = Literal["queued", "running", "succeeded", "failed"]
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


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    name: str
    created_at: datetime
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
    model_config = ConfigDict(from_attributes=True)

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
