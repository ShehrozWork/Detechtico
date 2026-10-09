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
            duplicated_amount: float | None = None
            if repeats:
                (desc, amount), count = max(repeats, key=lambda item: item[1])
                duplicated_amount = round(amount, 2)
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
            # Skip when the same amount was already reported as duplicated line items.
            if popular_count >= 4 and popular_amount != 0 and popular_amount != duplicated_amount:
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

    return findings


def _first_amount(text: str, label: str) -> float | None:
    # Commas only count as thousands separators (",ddd"); otherwise a CSV/Excel row like
    # "Total assets,6817420,5066360" would glue both year columns into one number.
    number = r"(?:\d{1,3}(?:,\d{3})+(?!\d)|\d+)(?:\.\d+)?"
    match = re.search(label + r"[^0-9(\-\n]{0,40}(\(?-?\$?\s*" + number + r"\)?)", text, re.I)
    return _to_amount(match.group(1)) if match else None


def _identity_checks(text: str, statement_type: str | None) -> list[dict[str, Any]]:
    """Statement-specific arithmetic checks, run only for the matching statement type."""
    findings: list[dict[str, Any]] = []

    if statement_type in (None, "balance-sheet"):
        assets = _first_amount(text, r"total assets")
        liabilities = _first_amount(text, r"total liabilities(?! and)")
        equity = _first_amount(text, r"total (?:stockholders['’]? |shareholders['’]? |owners['’]? )?equity")
        combined = _first_amount(text, r"total liabilities and (?:stockholders['’]? |shareholders['’]? |owners['’]? )?equity")
        if assets is not None:
            if liabilities is not None and equity is not None:
                rhs = liabilities + equity
            else:
                rhs = combined
            if rhs is not None and abs(assets - rhs) > max(1.0, abs(assets) * 0.01):
                findings.append(
                    _finding(
                        "balance_mismatch",
                        "Balance sheet identity does not hold",
                        f"Total assets ({assets:,.2f}) do not equal liabilities plus equity ({rhs:,.2f}).",
                        "high",
                        location="Balance sheet totals",
                        confidence=0.85,
                    )
                )

    if statement_type == "income":
        revenue = _first_amount(text, r"(?:total |net )?(?:revenues?|net sales)")
        cogs = _first_amount(text, r"cost of (?:goods sold|sales|revenues?)")
        gross = _first_amount(text, r"gross profit")
        if revenue is not None and cogs is not None and gross is not None:
            expected = revenue - abs(cogs)
            if abs(expected - gross) > max(1.0, abs(revenue) * 0.01):
                findings.append(
                    _finding(
                        "gross_profit_mismatch",
                        "Gross profit does not reconcile",
                        f"Revenue ({revenue:,.2f}) less cost of sales ({abs(cogs):,.2f}) is {expected:,.2f}, but gross profit is reported as {gross:,.2f}.",
                        "high",
                        location="Income statement",
                        confidence=0.8,
                    )
                )

    if statement_type == "cash-flow":
        activity = r"net cash (?:provided by|used in|from|\(used in\)|provided by \(used in\)|\(used in\) provided by)[^\n]{0,10}"
        operating = _first_amount(text, activity + r"operating activities")
        investing = _first_amount(text, activity + r"investing activities")
        financing = _first_amount(text, activity + r"financing activities")
        net_change = _first_amount(text, r"net \(?(?:increase|decrease|change)\)?[^\n]{0,30}cash(?: and cash equivalents)?")
        if None not in (operating, investing, financing, net_change):
            total = operating + investing + financing  # type: ignore[operator]
            # Statements often print the net change unsigned; compare magnitudes too.
            if min(abs(total - net_change), abs(abs(total) - abs(net_change))) > max(1.0, abs(total) * 0.01):  # type: ignore[operator]
                findings.append(
                    _finding(
                        "cash_flow_mismatch",
                        "Cash flow sections do not sum to net change",
                        f"Operating ({operating:,.2f}), investing ({investing:,.2f}) and financing ({financing:,.2f}) total {total:,.2f}, but the net change in cash is reported as {net_change:,.2f}.",
                        "high",
                        location="Statement of cash flows",
                        confidence=0.8,
                    )
                )

    return findings


def _merge_by_rule(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse the same rule firing on several tables/sheets into one finding."""
    severity_rank = {"low": 0, "medium": 1, "high": 2}
    merged: dict[str, dict[str, Any]] = {}
    locations: dict[str, list[str]] = {}
    for item in findings:
        key = item["rule_id"]
        if key not in merged:
            merged[key] = dict(item)
            locations[key] = [item["location"]] if item.get("location") else []
            continue
        current = merged[key]
        if severity_rank[item["severity"]] > severity_rank[current["severity"]]:
            kept_locations = locations[key]
            merged[key] = dict(item)
            current = merged[key]
            locations[key] = kept_locations
        if item.get("location") and item["location"] not in locations[key]:
            locations[key].append(item["location"])
    for key, item in merged.items():
        if len(locations[key]) > 1:
            item["location"] = ", ".join(locations[key])
            item["detail"] = f"{item['detail']} The same pattern appears in {len(locations[key])} tables."
    return list(merged.values())


def run_rules(content: ExtractedContent, statement_type: str | None = None) -> list[dict[str, Any]]:
    findings = _merge_by_rule(_from_tables(content.tables))
    text_findings = _from_text(content.text)
    if content.tables:
        # Tabular text is just the tables serialized again; its numeric checks
        # would restate the table findings, so keep only the keyword scan.
        text_findings = [item for item in text_findings if item["rule_id"] == "risk_keywords"]
    findings.extend(text_findings)
    if statement_type is not None:
        # Financial statements are routinely presented rounded (often in thousands),
        # so round-figure checks meant for invoices and ledgers are just noise here.
        findings = [item for item in findings if item["rule_id"] not in _ROUNDING_RULES]
    findings.extend(_identity_checks(content.text, statement_type))
    return findings[:25]


_ROUNDING_RULES = frozenset({"round_amounts", "text_round_amounts"})
