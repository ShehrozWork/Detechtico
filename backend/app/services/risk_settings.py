from __future__ import annotations

from copy import deepcopy
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import UserRiskSettings

DEFAULT_RULES: list[dict[str, Any]] = [
    {
        "id": "velocity",
        "title": "Velocity Checks",
        "description": "Monitor frequency and speed of transactions",
        "enabled": True,
    },
    {
        "id": "geo",
        "title": "Geolocation Analysis",
        "description": "Flag transactions from unusual locations",
        "enabled": True,
    },
    {
        "id": "time",
        "title": "Time Pattern Analysis",
        "description": "Detect anomalies in transaction timing",
        "enabled": True,
    },
    {
        "id": "merchant",
        "title": "Merchant Verification",
        "description": "Cross-reference with trusted merchant database",
        "enabled": True,
    },
]


def default_risk_settings_dict() -> dict[str, Any]:
    return {
        "highRiskThreshold": 75,
        "mediumRiskThreshold": 50,
        "amountAlert": 1000,
        "rules": deepcopy(DEFAULT_RULES),
    }


def settings_to_dict(row: UserRiskSettings | None) -> dict[str, Any]:
    if row is None:
        return default_risk_settings_dict()
    rules = row.rules if isinstance(row.rules, list) and row.rules else deepcopy(DEFAULT_RULES)
    return {
        "highRiskThreshold": int(row.high_risk_threshold),
        "mediumRiskThreshold": int(row.medium_risk_threshold),
        "amountAlert": int(row.amount_alert),
        "rules": rules,
    }


def get_or_create_risk_settings(db: Session, user_id: UUID) -> UserRiskSettings:
    row = db.get(UserRiskSettings, user_id)
    if row is not None:
        return row
    row = UserRiskSettings(
        user_id=user_id,
        high_risk_threshold=75,
        medium_risk_threshold=50,
        amount_alert=1000,
        rules=deepcopy(DEFAULT_RULES),
    )
    db.add(row)
    db.flush()
    return row


def upsert_risk_settings(
    db: Session,
    user_id: UUID,
    *,
    high_risk_threshold: int,
    medium_risk_threshold: int,
    amount_alert: int,
    rules: list[dict[str, Any]],
) -> UserRiskSettings:
    row = get_or_create_risk_settings(db, user_id)
    row.high_risk_threshold = high_risk_threshold
    row.medium_risk_threshold = medium_risk_threshold
    row.amount_alert = amount_alert
    row.rules = rules
    db.flush()
    return row


def format_risk_settings_for_prompt(settings: dict[str, Any]) -> str:
    enabled = [
        f"- {rule.get('title')} ({rule.get('id')}): {rule.get('description')}"
        for rule in settings.get("rules", [])
        if rule.get("enabled")
    ]
    disabled = [
        f"- {rule.get('title')} ({rule.get('id')})"
        for rule in settings.get("rules", [])
        if not rule.get("enabled")
    ]
    lines = [
        "Investigator risk configuration (must follow):",
        f"- High risk threshold: {settings.get('highRiskThreshold')}% confidence/severity band",
        f"- Medium risk threshold: {settings.get('mediumRiskThreshold')}% confidence/severity band",
        f"- Amount alert: flag amounts at or above ${settings.get('amountAlert')}",
        "Enabled detection focus areas:",
    ]
    lines.extend(enabled or ["- (none enabled)"])
    if disabled:
        lines.append("Disabled focus areas (do not prioritize unless extract strongly forces it):")
        lines.extend(disabled)
    lines.append(
        "When assigning severity, treat confidence at/above the high threshold as high, "
        "at/above the medium threshold as medium, otherwise low — unless evidence clearly requires otherwise."
    )
    return "\n".join(lines)
