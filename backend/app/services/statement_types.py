from __future__ import annotations

import re
from dataclasses import dataclass

STATEMENT_TYPES = ("balance-sheet", "income", "cash-flow")

STATEMENT_LABELS = {
    "balance-sheet": "Balance Sheet",
    "income": "Income Statement",
    "cash-flow": "Statement of Cash Flows",
}

# (pattern, weight). Titles are weighted heavily; line items that also appear on
# other statements (e.g. "net income" on a cash flow statement) are weighted low.
_SIGNALS: dict[str, list[tuple[str, int]]] = {
    "balance-sheet": [
        (r"\bbalance sheets?\b", 6),
        (r"\bstatements? of financial position\b", 6),
        (r"\btotal assets\b", 4),
        (r"\btotal liabilities\b", 4),
        (r"\btotal (?:stockholders['’]?|shareholders['’]?|owners['’]?)?\s*equity\b", 3),
        (r"\btotal liabilities and (?:stockholders['’]?|shareholders['’]?|owners['’]?)?\s*equity\b", 4),
        (r"\btotal current assets\b", 3),
        (r"\btotal current liabilities\b", 3),
        (r"\bnon-?current assets\b", 2),
        (r"\bproperty,? plant,? and equipment\b", 1),
        (r"\baccounts receivable\b", 1),
        (r"\baccounts payable\b", 1),
        (r"\bretained earnings\b", 1),
        (r"\binventor(?:y|ies)\b", 1),
    ],
    "income": [
        (r"\bincome statements?\b", 6),
        (r"\bstatements? of (?:comprehensive )?(?:income|operations|earnings)\b", 6),
        (r"\bprofit (?:and|&) loss\b", 6),
        (r"\bp\s?&\s?l\b", 4),
        (r"\b(?:total |net )?revenues?\b", 2),
        (r"\bnet sales\b", 2),
        (r"\bcost of (?:goods sold|sales|revenues?)\b", 3),
        (r"\bgross (?:profit|margin)\b", 3),
        (r"\boperating (?:income|profit|loss)\b", 3),
        (r"\b(?:total )?operating expenses\b", 2),
        (r"\btotal expenses\b", 2),
        (r"\bincome before (?:income )?taxes\b", 3),
        (r"\b(?:provision for |)income tax(?:es)? expense\b", 2),
        (r"\bearnings per share\b", 3),
        (r"\bebitda\b", 2),
        (r"\bnet (?:income|loss|profit)\b", 1),
    ],
    "cash-flow": [
        (r"\bstatements? of cash flows?\b", 6),
        (r"\bcash flows? statements?\b", 6),
        (r"\bcash flows? from operating activities\b", 5),
        (r"\b(?:net )?cash (?:provided by|used in|from|\(used in\))[^\n]{0,30}operating activities\b", 4),
        (r"\b(?:net )?cash (?:provided by|used in|from|\(used in\))[^\n]{0,30}investing activities\b", 4),
        (r"\b(?:net )?cash (?:provided by|used in|from|\(used in\))[^\n]{0,30}financing activities\b", 4),
        (r"\binvesting activities\b", 2),
        (r"\bfinancing activities\b", 2),
        (r"\bnet (?:increase|decrease|change)[^\n]{0,30}\bcash\b", 3),
        (r"\bcash(?: and cash equivalents)?,? (?:at )?(?:beginning|end) of (?:the )?(?:year|period)\b", 3),
        (r"\bdepreciation and amortization\b", 1),
        (r"\bcapital expenditures?\b", 1),
    ],
}

_COMPILED = {
    kind: [(re.compile(pattern, re.IGNORECASE), weight) for pattern, weight in signals]
    for kind, signals in _SIGNALS.items()
}

# Minimum score for the selected type to be accepted, and the amount of text we
# need before trusting a deterministic verdict (scanned docs go to the model).
MIN_SCORE = 5
MIN_TEXT_CHARS = 120


@dataclass
class StatementClassification:
    scores: dict[str, int]
    best: str | None
    conclusive: bool


def classify_statement(text: str) -> StatementClassification:
    sample = text[:60_000]
    scores = {
        kind: sum(weight for pattern, weight in signals if pattern.search(sample))
        for kind, signals in _COMPILED.items()
    }
    best_kind, best_score = max(scores.items(), key=lambda item: item[1])
    conclusive = len(sample.strip()) >= MIN_TEXT_CHARS
    return StatementClassification(
        scores=scores,
        best=best_kind if best_score >= MIN_SCORE else None,
        conclusive=conclusive,
    )


def check_statement_type(text: str, selected: str | None) -> str | None:
    """Return the detected type when the extract clearly is not ``selected``.

    Returns ``None`` when it matches, when no type was selected, or when there is
    not enough text to decide (the model makes the call for scanned documents).
    The returned value is one of STATEMENT_TYPES or ``"unknown"``.
    """
    if selected not in STATEMENT_TYPES:
        return None
    result = classify_statement(text)
    if not result.conclusive:
        return None
    if result.scores[selected] >= MIN_SCORE:
        return None
    return result.best or "unknown"


def mismatch_error_code(detected: str) -> str:
    return f"statement_type_mismatch:{detected}"
