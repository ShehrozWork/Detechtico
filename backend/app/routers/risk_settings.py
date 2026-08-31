from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import RiskSettingsOut, RiskSettingsUpdate
from app.services.risk_settings import (
    get_or_create_risk_settings,
    settings_to_dict,
    upsert_risk_settings,
)

router = APIRouter(prefix="/risk-settings", tags=["risk-settings"])


@router.get("/", response_model=RiskSettingsOut)
def get_risk_settings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskSettingsOut:
    row = get_or_create_risk_settings(db, user.id)
    return RiskSettingsOut(**settings_to_dict(row))


@router.put("/", response_model=RiskSettingsOut)
def update_risk_settings(
    payload: RiskSettingsUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RiskSettingsOut:
    row = upsert_risk_settings(
        db,
        user.id,
        high_risk_threshold=payload.highRiskThreshold,
        medium_risk_threshold=payload.mediumRiskThreshold,
        amount_alert=payload.amountAlert,
        rules=[rule.model_dump() for rule in payload.rules],
    )
    return RiskSettingsOut(**settings_to_dict(row))
