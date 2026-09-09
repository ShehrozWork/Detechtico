from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.billing.anthropic_pricing import (
    PRICING_SOURCE,
    PRICING_VERSION,
    calculate_usage_cost,
    rates_to_json,
)
from app.models import LlmUsageEvent


@dataclass
class LlmCallResult:
    findings: list[dict[str, Any]]
    status: str
    model: str | None = None
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    request_id: str | None = None
    error_code: str | None = None


def record_llm_usage(
    db: Session,
    *,
    user_id: UUID,
    job_id: UUID | None,
    result: LlmCallResult,
) -> LlmUsageEvent | None:
    if result.status == "skipped" and result.input_tokens == 0 and result.output_tokens == 0:
        # No API call made — still record for visibility when explicitly skipped.
        model = result.model or "none"
    else:
        model = result.model or "unknown"

    cost = calculate_usage_cost(
        model=model if model != "none" else "claude-sonnet-4-5",
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        cache_creation_input_tokens=result.cache_creation_input_tokens,
        cache_read_input_tokens=result.cache_read_input_tokens,
    )
    # Zero cost for skipped / no tokens
    if result.status == "skipped" and result.input_tokens == 0 and result.output_tokens == 0:
        from decimal import Decimal

        zero = Decimal("0")
        event = LlmUsageEvent(
            id=uuid4(),
            user_id=user_id,
            job_id=job_id,
            model=model,
            status=result.status,
            anthropic_request_id=result.request_id,
            input_tokens=0,
            output_tokens=0,
            cache_creation_input_tokens=0,
            cache_read_input_tokens=0,
            input_cost_usd=float(zero),
            output_cost_usd=float(zero),
            cache_write_cost_usd=float(zero),
            cache_read_cost_usd=float(zero),
            total_cost_usd=float(zero),
            pricing_known=True,
            pricing_version=PRICING_VERSION,
            pricing_source=PRICING_SOURCE,
            rates_json=None,
            error_code=result.error_code,
        )
    else:
        event = LlmUsageEvent(
            id=uuid4(),
            user_id=user_id,
            job_id=job_id,
            model=model,
            status=result.status,
            anthropic_request_id=result.request_id,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            cache_creation_input_tokens=result.cache_creation_input_tokens,
            cache_read_input_tokens=result.cache_read_input_tokens,
            input_cost_usd=float(cost.input_cost_usd),
            output_cost_usd=float(cost.output_cost_usd),
            cache_write_cost_usd=float(cost.cache_write_cost_usd),
            cache_read_cost_usd=float(cost.cache_read_cost_usd),
            total_cost_usd=float(cost.total_cost_usd),
            pricing_known=cost.pricing_known,
            pricing_version=PRICING_VERSION,
            pricing_source=PRICING_SOURCE,
            rates_json=rates_to_json(cost.rates),
            error_code=result.error_code,
        )
    db.add(event)
    db.flush()
    return event
