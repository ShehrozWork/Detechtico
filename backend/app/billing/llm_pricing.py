"""Official Anthropic API list prices used for cost estimates.

Source: https://docs.anthropic.com/en/docs/about-claude/pricing
Rates are USD per million tokens (MTok). Cache columns use Anthropic's
published 5-minute cache write / cache hit multipliers relative to base input.

Update this table when Anthropic publishes new model prices; stored usage rows
keep the rate snapshot used at write time so historical totals stay auditable.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

PRICING_SOURCE = "https://docs.anthropic.com/en/docs/about-claude/pricing"
PRICING_VERSION = "2026-09-anthropic-docs"


@dataclass(frozen=True)
class ModelRates:
    model: str
    input_per_mtok: Decimal
    output_per_mtok: Decimal
    cache_write_5m_per_mtok: Decimal
    cache_read_per_mtok: Decimal


# Base list prices from Anthropic docs (API, global routing, non-batch).
_MODEL_RATES: dict[str, ModelRates] = {
    "claude-sonnet-4-5": ModelRates(
        model="claude-sonnet-4-5",
        input_per_mtok=Decimal("3"),
        output_per_mtok=Decimal("15"),
        cache_write_5m_per_mtok=Decimal("3.75"),
        cache_read_per_mtok=Decimal("0.30"),
    ),
    "claude-sonnet-4-6": ModelRates(
        model="claude-sonnet-4-6",
        input_per_mtok=Decimal("3"),
        output_per_mtok=Decimal("15"),
        cache_write_5m_per_mtok=Decimal("3.75"),
        cache_read_per_mtok=Decimal("0.30"),
    ),
    "claude-sonnet-4": ModelRates(
        model="claude-sonnet-4",
        input_per_mtok=Decimal("3"),
        output_per_mtok=Decimal("15"),
        cache_write_5m_per_mtok=Decimal("3.75"),
        cache_read_per_mtok=Decimal("0.30"),
    ),
    "claude-sonnet-5": ModelRates(
        model="claude-sonnet-5",
        input_per_mtok=Decimal("2"),
        output_per_mtok=Decimal("10"),
        cache_write_5m_per_mtok=Decimal("2.50"),
        cache_read_per_mtok=Decimal("0.20"),
    ),
    "claude-haiku-4-5": ModelRates(
        model="claude-haiku-4-5",
        input_per_mtok=Decimal("1"),
        output_per_mtok=Decimal("5"),
        cache_write_5m_per_mtok=Decimal("1.25"),
        cache_read_per_mtok=Decimal("0.10"),
    ),
    "claude-opus-4-5": ModelRates(
        model="claude-opus-4-5",
        input_per_mtok=Decimal("5"),
        output_per_mtok=Decimal("25"),
        cache_write_5m_per_mtok=Decimal("6.25"),
        cache_read_per_mtok=Decimal("0.50"),
    ),
    "claude-opus-4-6": ModelRates(
        model="claude-opus-4-6",
        input_per_mtok=Decimal("5"),
        output_per_mtok=Decimal("25"),
        cache_write_5m_per_mtok=Decimal("6.25"),
        cache_read_per_mtok=Decimal("0.50"),
    ),
}


def normalize_model_id(model: str) -> str:
    return (model or "").strip().lower()


def rates_for_model(model: str) -> ModelRates | None:
    key = normalize_model_id(model)
    if key in _MODEL_RATES:
        return _MODEL_RATES[key]
    # Handle dated aliases like claude-sonnet-4-5-20250929
    for known in _MODEL_RATES:
        if key.startswith(known):
            return _MODEL_RATES[known]
    return None


def _usd(tokens: int, rate_per_mtok: Decimal) -> Decimal:
    if tokens <= 0:
        return Decimal("0")
    return (Decimal(tokens) * rate_per_mtok / Decimal("1000000")).quantize(
        Decimal("0.000001"), rounding=ROUND_HALF_UP
    )


def compute_cost_usd(
    *,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation_input_tokens: int = 0,
    cache_read_input_tokens: int = 0,
) -> dict[str, Any]:
    rates = rates_for_model(model)
    if rates is None:
        return {
            "pricing_known": False,
            "pricing_version": PRICING_VERSION,
            "pricing_source": PRICING_SOURCE,
            "input_cost_usd": Decimal("0"),
            "output_cost_usd": Decimal("0"),
            "cache_write_cost_usd": Decimal("0"),
            "cache_read_cost_usd": Decimal("0"),
            "total_cost_usd": Decimal("0"),
            "rates": None,
        }

    # Anthropic reports uncached input separately from cache write/read.
    input_cost = _usd(input_tokens, rates.input_per_mtok)
    output_cost = _usd(output_tokens, rates.output_per_mtok)
    cache_write_cost = _usd(cache_creation_input_tokens, rates.cache_write_5m_per_mtok)
    cache_read_cost = _usd(cache_read_input_tokens, rates.cache_read_per_mtok)
    total = input_cost + output_cost + cache_write_cost + cache_read_cost
    return {
        "pricing_known": True,
        "pricing_version": PRICING_VERSION,
        "pricing_source": PRICING_SOURCE,
        "input_cost_usd": input_cost,
        "output_cost_usd": output_cost,
        "cache_write_cost_usd": cache_write_cost,
        "cache_read_cost_usd": cache_read_cost,
        "total_cost_usd": total,
        "rates": {
            "input_per_mtok": str(rates.input_per_mtok),
            "output_per_mtok": str(rates.output_per_mtok),
            "cache_write_5m_per_mtok": str(rates.cache_write_5m_per_mtok),
            "cache_read_per_mtok": str(rates.cache_read_per_mtok),
        },
    }
