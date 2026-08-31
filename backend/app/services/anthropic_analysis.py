from __future__ import annotations

import base64
import json
from typing import Any

from app.config import get_settings
from app.services.extract import ExtractedContent

FINDINGS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "findings": {
            "type": "array",
            "maxItems": 15,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "title": {"type": "string"},
                    "detail": {"type": "string"},
                    "severity": {"type": "string", "enum": ["high", "medium", "low"]},
                    "evidence": {"type": "string"},
                    "location": {"type": "string"},
                    "confidence": {"type": "number"},
                },
                "required": ["title", "detail", "severity", "evidence", "location", "confidence"],
            },
        }
    },
    "required": ["findings"],
}

SYSTEM_PROMPT = """You are a forensic accountant reviewing extracted financial-document content.
Only report issues that are directly supported by the provided extract or rule hits.
Do not invent vendors, amounts, dates, or counterparties.
If nothing suspicious is supported, return an empty findings array.
Do not contradict deterministic rule hits; you may add distinct additional issues.
Respect the investigator's risk configuration: prioritize enabled detection focus areas,
apply amount-alert and confidence thresholds when judging severity, and de-emphasize disabled areas.
When investigator feedback history is provided, elevate patterns similar to confirmed findings
and de-prioritize patterns similar to dismissed findings unless stronger evidence appears.
Keep titles short. Quote evidence from the extract."""


def _clip(value: str, limit: int = 24_000) -> str:
    if len(value) <= limit:
        return value
    return value[:limit] + "\n[truncated for model context]"


def analyze_with_anthropic(
    content: ExtractedContent,
    rule_findings: list[dict[str, Any]],
    statement_type: str | None,
    risk_settings: dict[str, Any] | None = None,
    learning_feedback: str | None = None,
) -> tuple[list[dict[str, Any]], str]:
    settings = get_settings()
    if not settings.anthropic_api_key:
        if settings.analysis_require_llm or settings.is_production:
            raise RuntimeError("anthropic_unavailable")
        return [], "skipped"

    from anthropic import Anthropic

    from app.services.risk_settings import (
        default_risk_settings_dict,
        format_risk_settings_for_prompt,
    )

    risk = risk_settings or default_risk_settings_dict()
    client = Anthropic(api_key=settings.anthropic_api_key, timeout=60.0, max_retries=1)
    feedback_block = learning_feedback.strip() if learning_feedback else ""
    user_text = (
        f"Statement type: {statement_type or 'unspecified'}\n\n"
        f"{format_risk_settings_for_prompt(risk)}\n\n"
        f"{feedback_block}\n\n"
        f"Deterministic rule hits:\n{json.dumps(rule_findings, default=str)[:8000]}\n\n"
        f"Extracted document content:\n{_clip(content.text)}"
    )
    if content.notes:
        user_text = "Notes:\n" + "\n".join(content.notes) + "\n\n" + user_text

    message_content: list[dict[str, Any]] = [{"type": "text", "text": user_text}]
    for image in content.images[:5]:
        b64 = base64.b64encode(image).decode("ascii")
        message_content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": b64,
                },
            }
        )

    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=2000,
        temperature=0,
        system=SYSTEM_PROMPT,
        tools=[
            {
                "name": "fraud_findings",
                "description": "Return forensic findings supported by the extract.",
                "input_schema": FINDINGS_SCHEMA,
            }
        ],
        tool_choice={"type": "tool", "name": "fraud_findings"},
        messages=[{"role": "user", "content": message_content}],
    )

    parsed: dict[str, Any] = {"findings": []}
    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == "fraud_findings":
            raw_input = getattr(block, "input", {}) or {}
            if isinstance(raw_input, dict):
                parsed = raw_input
            break

    findings: list[dict[str, Any]] = []
    for item in parsed.get("findings", []):
        confidence = item.get("confidence")
        try:
            confidence_value = float(confidence)
        except (TypeError, ValueError):
            confidence_value = None
        if confidence_value is not None:
            confidence_value = max(0.0, min(1.0, confidence_value))
        findings.append(
            {
                "source": "llm",
                "rule_id": None,
                "title": str(item.get("title", "Finding"))[:180],
                "detail": str(item.get("detail", ""))[:4000],
                "severity": item.get("severity") if item.get("severity") in {"high", "medium", "low"} else "medium",
                "evidence": str(item.get("evidence") or "")[:2000] or None,
                "location": str(item.get("location") or "")[:180] or None,
                "confidence": confidence_value,
            }
        )
    return findings[:15], "succeeded"
