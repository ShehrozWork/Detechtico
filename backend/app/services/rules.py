from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any

import pandas as pd

from app.services.extract import ExtractedContent

MONEY_RE = re.compile(
    r"(?<![\w])(?:USD|US\$|\$)?\s*-?\$?\s*\(?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\)?(?!\d)",
)
KEYWORD_RE = re.compile(
    r"\b(related[- ]party|offshore|round[- ]trip|suspense|write[- ]?off|reversal|plug|misc\.? expense|bearer)\b",
    re.IGNORECASE,
)


def _to_amount(value: object) -> float | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    text = str(value).strip()
    if not text:
        return None
    negative = text.startswith("(") and text.endswith(")")
    cleaned = re.sub(r"[^\d.\-]", "", text.replace("(", "").replace(")", ""))
    if cleaned in {"", "-", "."}:
        return None
    try:
        amount = float(cleaned)
    except ValueError:
        return None
    return -amount if negative else amount


def _guess_columns(frame: pd.DataFrame) -> dict[str, str | None]:
    mapping: dict[str, str | None] = {"amount": None, "description": None, "date": None}
    for column in frame.columns:
        name = str(column).strip().lower()
        if mapping["amount"] is None and any(
            token in name for token in ("amount", "amt", "value", "total", "balance", "debit", "credit")
        ):
            mapping["amount"] = column
        elif mapping["description"] is None and any(
            token in name for token in ("desc", "memo", "narration", "vendor", "payee", "item", "name")
        ):
            mapping["description"] = column
        elif mapping["date"] is None and "date" in name:
            mapping["date"] = column
    if mapping["amount"] is None:
        for column in frame.columns:
            parsed = frame[column].map(_to_amount)
            if parsed.notna().mean() >= 0.4:
                mapping["amount"] = column
                break
    if mapping["description"] is None and len(frame.columns):
        mapping["description"] = frame.columns[0]
    return mapping


def _finding(
    rule_id: str,
    title: str,
    detail: str,
    severity: str,
    evidence: str | None = None,
    location: str | None = None,
    confidence: float = 0.8,
) -> dict[str, Any]:
    return {
        "source": "rule",
        "rule_id": rule_id,
        "title": title,
        "detail": detail,
        "severity": severity,
        "evidence": evidence,
        "location": location,
        "confidence": confidence,
    }


def _from_tables(tables: list[pd.DataFrame]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    for index, frame in enumerate(tables):
        if frame.empty:
            continue
        location = f"Table {index + 1}"
        cols = _guess_columns(frame)
        amounts = frame[cols["amount"]].map(_to_amount) if cols["amount"] else pd.Series([None] * len(frame))
        descriptions = (
            frame[cols["description"]].astype(str).str.strip()
            if cols["description"] is not None
            else pd.Series([""] * len(frame))
        )

        pairs: list[tuple[str, float]] = []
        values: list[float] = []
        for desc, amount in zip(descriptions.tolist(), amounts.tolist()):
            if amount is None:
                continue
            values.append(amount)
            pairs.append((re.sub(r"\s+", " ", desc.lower()), amount))

        if len(pairs) >= 3:
            counts = Counter(pairs)
            repeats = [(item, count) for item, count in counts.items() if count >= 3 and item[1] != 0]
            if repeats:
                (desc, amount), count = max(repeats, key=lambda item: item[1])
                findings.append(
                    _finding(
                        "duplicate_lines",
                        "Repeated identical line items",
                        f"{count} rows share the same description and amount ({amount:,.2f}). Repeated clones are a common invoice-padding tell.",
                        "high",
                        evidence=desc or "(blank description)",
                        location=location,
                    )
                )

            amount_counts = Counter(round(value, 2) for value in values)
            popular_amount, popular_count = amount_counts.most_common(1)[0]
            if popular_count >= 4 and popular_amount != 0:
                findings.append(
                    _finding(
                        "repeated_amount",
                        "Same amount posted repeatedly",
                        f"The amount {popular_amount:,.2f} appears {popular_count} times. Identical repeated postings often indicate copy-paste or round-tripping.",
                        "high" if popular_count >= 6 else "medium",
                        location=location,
                    )
                )

            round_hits = [value for value in values if value != 0 and abs(value) % 1000 == 0]
            if len(values) >= 5 and len(round_hits) / len(values) >= 0.35:
                findings.append(
                    _finding(
                        "round_amounts",
                        "High concentration of round-dollar amounts",
                        f"{len(round_hits)} of {len(values)} amounts are exact thousands. That pattern is unusual for organic invoices and is a common shell-company tell.",
                        "high",
                        location=location,
                    )
                )

            missing = sum(1 for desc, amount in pairs if amount and not desc)
            if missing >= 3:
                findings.append(
                    _finding(
                        "missing_labels",
                        "Amounts without line-item labels",
                        f"{missing} numeric rows have no description. Unlabeled amounts reduce auditability and can hide adjustments.",
                        "medium",
                        location=location,
                    )
                )

            abs_values = [abs(value) for value in values if value]
            if len(abs_values) >= 8:
                mean = sum(abs_values) / len(abs_values)
                variance = sum((value - mean) ** 2 for value in abs_values) / len(abs_values)
                std = math.sqrt(variance)
                outliers = [value for value in abs_values if std > 0 and value > mean + 3 * std]
                if outliers:
                    findings.append(
                        _finding(
                            "amount_outlier",
                            "Statistical amount outlier",
                            f"{len(outliers)} amount(s) sit more than 3 standard deviations above the mean ({mean:,.2f}), largest {max(outliers):,.2f}.",
                            "medium",
                            location=location,
                            confidence=0.65,
                        )
                    )

    return findings


def _from_text(text: str) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    if not text.strip():
        return findings

    amounts: list[float] = []
    for match in MONEY_RE.findall(text):
        parsed = _to_amount(match)
        if parsed is not None:
            amounts.append(parsed)

    if len(amounts) >= 6:
        round_hits = [value for value in amounts if value and abs(value) % 1000 == 0]
        if len(round_hits) / len(amounts) >= 0.3:
            findings.append(
                _finding(
                    "text_round_amounts",
                    "Round amounts in narrative figures",
                    f"{len(round_hits)} of {len(amounts)} extracted figures are exact thousands.",
                    "medium",
                    location="Document text",
                )
            )
        amount_counts = Counter(round(value, 2) for value in amounts if value)
        if amount_counts:
            popular_amount, popular_count = amount_counts.most_common(1)[0]
            if popular_count >= 4:
                findings.append(
                    _finding(
                        "text_repeated_amount",
                        "Repeated figure in document text",
                        f"{popular_amount:,.2f} appears {popular_count} times in the extracted text.",
                        "medium",
                        location="Document text",
                    )
                )

    keywords = KEYWORD_RE.findall(text)
    if keywords:
        unique = sorted({item.lower() for item in keywords})
        findings.append(
            _finding(
                "risk_keywords",
                "High-risk phrasing detected",
                f"The document contains language often associated with concealment or related-party activity: {', '.join(unique)}.",
                "medium",
                evidence=", ".join(unique),
                location="Document text",
                confidence=0.6,
            )
        )

    lowered = text.lower()
    if "total assets" in lowered and ("total liabilities" in lowered or "equity" in lowered):
        asset_match = re.search(r"total assets[^0-9\-]{0,40}([\d,\.]+)", text, re.I)
        liab_match = re.search(r"total liabilities[^0-9\-]{0,40}([\d,\.]+)", text, re.I)
        equity_match = re.search(r"(?:total )?(?:shareholders[' ]+)?equity[^0-9\-]{0,40}([\d,\.]+)", text, re.I)
        assets = _to_amount(asset_match.group(1)) if asset_match else None
        liabilities = _to_amount(liab_match.group(1)) if liab_match else None
        equity = _to_amount(equity_match.group(1)) if equity_match else None
        if assets is not None and liabilities is not None and equity is not None:
            if abs(assets - (liabilities + equity)) > max(1.0, abs(assets) * 0.01):
                findings.append(
                    _finding(
                        "balance_mismatch",
                        "Balance sheet identity does not hold",
                        f"Total assets ({assets:,.2f}) do not equal liabilities plus equity ({liabilities + equity:,.2f}).",
                        "high",
                        location="Balance sheet totals",
                        confidence=0.85,
                    )
                )

    return findings


def run_rules(content: ExtractedContent) -> list[dict[str, Any]]:
    findings = _from_tables(content.tables)
    if not findings:
        findings.extend(_from_text(content.text))
    elif content.text:
        text_findings = _from_text(content.text)
        seen = {item["rule_id"] for item in findings}
        for item in text_findings:
            if item["rule_id"] not in {"text_round_amounts", "text_repeated_amount"} or item["rule_id"] not in seen:
                if item["rule_id"] not in seen:
                    findings.append(item)
                    seen.add(item["rule_id"])
    return findings[:25]
