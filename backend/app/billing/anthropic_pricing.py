"""Anthropic API pricing (USD per million tokens).

Rates from https://docs.anthropic.com/en/docs/about-claude/pricing
(Claude API first-party list prices). Cache write assumes 5-minute TTL (1.25x input).
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

PRICING_VERSION = "anthropic-docs-2026-09"
PRICING_SOURCE = "https://docs.anthropic.com/en/docs/about-claude/pricing"


@dataclass(frozen=True)
class ModelRates:
    input_per_mtok: Decimal
    output_per_mtok: Decimal
    cache_write_5m_per_mtok: Decimal
    cache_read_per_mtok: Decimal


MODEL_RATES: dict[str, ModelRates] = {
    "claude-sonnet-4-5": ModelRates(Decimal("3"), Decimal("15"), Decimal("3.75"), Decimal("0.30")),
    "claude-sonnet-4-6": ModelRates(Decimal("3"), Decimal("15"), Decimal("3.75"), Decimal("0.30")),
    "claude-sonnet-4": ModelRates(Decimal("3"), Decimal("15"), Decimal("3.75"), Decimal("0.30")),
    "claude-sonnet-5": ModelRates(Decimal("2"), Decimal("10"), Decimal("2.50"), Decimal("0.20")),
    "claude-haiku-4-5": ModelRates(Decimal("1"), Decimal("5"), Decimal("1.25"), Decimal("0.10")),
    "claude-opus-4-5": ModelRates(Decimal("5"), Decimal("25"), Decimal("6.25"), Decimal("0.50")),
    "claude-opus-4-6": ModelRates(Decimal("5"), Decimal("25"), Decimal("6.25"), Decimal("0.50")),
}

DEFAULT_RATES = MODEL_RATES["claude-sonnet-4-5"]


def resolve_rates(model: str) -> tuple[ModelRates, bool, str]:
    key = (model or "").strip().lower()
    if key in MODEL_RATES:
        return MODEL_RATES[key], True, key
    for prefix, rates in MODEL_RATES.items():
        if key.startswith(prefix):
            return rates, True, prefix
    return DEFAULT_RATES, False, "claude-sonnet-4-5"


def _usd(tokens: int, per_mtok: Decimal) -> Decimal:
    if tokens <= 0:
        return Decimal("0")
    amount = (Decimal(tokens) / Decimal(1_000_000)) * per_mtok
    return amount.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class UsageCost:
    input_cost_usd: Decimal
    output_cost_usd: Decimal
    cache_write_cost_usd: Decimal
    cache_read_cost_usd: Decimal
    total_cost_usd: Decimal
    pricing_known: bool
    matched_model_key: str
    rates: ModelRates


def calculate_usage_cost(
    *,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation_input_tokens: int = 0,
    cache_read_input_tokens: int = 0,
) -> UsageCost:
    rates, known, matched = resolve_rates(model)
    input_cost = _usd(input_tokens, rates.input_per_mtok)
    output_cost = _usd(output_tokens, rates.output_per_mtok)
    cache_write_cost = _usd(cache_creation_input_tokens, rates.cache_write_5m_per_mtok)
    cache_read_cost = _usd(cache_read_input_tokens, rates.cache_read_per_mtok)
    total = (input_cost + output_cost + cache_write_cost + cache_read_cost).quantize(
        Decimal("0.000001"), rounding=ROUND_HALF_UP
    )
    return UsageCost(
        input_cost_usd=input_cost,
        output_cost_usd=output_cost,
        cache_write_cost_usd=cache_write_cost,
        cache_read_cost_usd=cache_read_cost,
        total_cost_usd=total,
        pricing_known=known,
        matched_model_key=matched,
        rates=rates,
    )


def rates_to_json(rates: ModelRates) -> dict[str, str]:
    return {
        "input_per_mtok_usd": str(rates.input_per_mtok),
        "output_per_mtok_usd": str(rates.output_per_mtok),
        "cache_write_5m_per_mtok_usd": str(rates.cache_write_5m_per_mtok),
        "cache_read_per_mtok_usd": str(rates.cache_read_per_mtok),
    }
