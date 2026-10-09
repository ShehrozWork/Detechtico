from __future__ import annotations

import re
from typing import Any

_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2}

_STOPWORDS = frozenset(
    """
    a an and are as at be been by for from has have in into is it its of on or
    that the their this to was were which with within than these those
    appears appear shows show document statement statements line lines item items
    amount amounts figure figures value values total totals reported report
    row rows entry entries posting postings times possible potential multiple several
    """.split()
)

# Words investigators (and the model) use interchangeably for the same signal.
_CANONICAL = {
    "duplicate": "repeat", "duplicated": "repeat", "repeated": "repeat", "identical": "repeat",
    "recurring": "repeat", "clone": "repeat", "cloned": "repeat", "same": "repeat",
    "rounded": "round", "even": "round",
    "mismatch": "reconcile", "imbalance": "reconcile", "unbalanced": "reconcile",
    "reconciliation": "reconcile", "foot": "reconcile", "discrepancy": "reconcile",
    "outlier": "unusual", "anomalous": "unusual", "anomaly": "unusual", "abnormal": "unusual",
    "unlabeled": "unlabel", "unlabelled": "unlabel", "missing": "unlabel",
    "fees": "fee", "payments": "payment",
}

_WORD_RE = re.compile(r"[a-z]+|\d[\d,]*(?:\.\d+)?")


def _tokens(text: str) -> set[str]:
    out: set[str] = set()
    for raw in _WORD_RE.findall(text.lower()):
        if raw[0].isdigit():
            number = raw.replace(",", "")
            try:
                value = float(number)
            except ValueError:
                continue
            # Only distinctive figures count; small counts like "3 rows" do not.
            if abs(value) >= 100:
                out.add(f"#{value:.2f}")
            continue
        if raw in _STOPWORDS:
            continue
        word = _CANONICAL.get(raw, raw)
        if word == raw and len(raw) > 4 and raw.endswith("s"):
            word = _CANONICAL.get(raw[:-1], raw[:-1])
        if len(word) >= 3 and word not in _STOPWORDS:
            out.add(word)
    return out


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _is_duplicate(a: dict[str, Any], b: dict[str, Any]) -> bool:
    if a.get("rule_id") and a.get("rule_id") == b.get("rule_id"):
        return True
    title_a, title_b = _tokens(a["title"]), _tokens(b["title"])
    body_a = title_a | _tokens(a.get("detail") or "") | _tokens(a.get("evidence") or "")
    body_b = title_b | _tokens(b.get("detail") or "") | _tokens(b.get("evidence") or "")
    if _jaccard(title_a, title_b) >= 0.4:
        return True
    if _jaccard(body_a, body_b) >= 0.4:
        return True
    # A short finding whose substance is wholly contained in a fuller one.
    shared = body_a & body_b
    if len(shared) >= 3 and len(shared) / min(len(body_a), len(body_b)) >= 0.7:
        return True
    # Same distinctive figure(s) plus overlapping wording -> same underlying issue.
    shared_numbers = {token for token in body_a & body_b if token.startswith("#")}
    shared_words = (body_a & body_b) - shared_numbers
    return bool(shared_numbers) and len(shared_words) >= 2


def _absorb(kept: dict[str, Any], other: dict[str, Any]) -> None:
    if _SEVERITY_RANK.get(other["severity"], 0) > _SEVERITY_RANK.get(kept["severity"], 0):
        kept["severity"] = other["severity"]
    if other.get("confidence") is not None:
        kept["confidence"] = max(kept.get("confidence") or 0.0, other["confidence"])
    if not kept.get("evidence") and other.get("evidence"):
        kept["evidence"] = other["evidence"]
    if not kept.get("location") and other.get("location"):
        kept["location"] = other["location"]


def dedupe_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop findings that restate an earlier one, folding their signal into it.

    Order matters: earlier findings win, so pass deterministic rule hits first
    and model findings after them.
    """
    kept: list[dict[str, Any]] = []
    for item in findings:
        match = next((existing for existing in kept if _is_duplicate(existing, item)), None)
        if match is None:
            kept.append(dict(item))
        else:
            _absorb(match, item)
    kept.sort(key=lambda item: -_SEVERITY_RANK.get(item["severity"], 0))
    return kept
