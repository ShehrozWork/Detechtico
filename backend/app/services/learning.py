from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import AnalysisJob, Finding, FindingDisposition
from app.services.risk_settings import get_or_create_risk_settings, settings_to_dict


def upsert_finding_disposition(
    db: Session,
    *,
    user_id: UUID,
    finding: Finding,
    disposition: str,
    note: str | None,
) -> FindingDisposition:
    existing = db.scalar(
        select(FindingDisposition).where(
            FindingDisposition.user_id == user_id,
            FindingDisposition.finding_id == finding.id,
        )
    )
    if existing is None:
        existing = FindingDisposition(
            user_id=user_id,
            finding_id=finding.id,
            job_id=finding.job_id,
            disposition=disposition,
            note=note,
        )
        db.add(existing)
    else:
        existing.disposition = disposition
        existing.note = note
        existing.created_at = datetime.now(timezone.utc)
    db.flush()
    return existing


def build_learning_summary(db: Session, user_id: UUID) -> dict[str, Any]:
    jobs = list(
        db.scalars(
            select(AnalysisJob)
            .options(selectinload(AnalysisJob.document), selectinload(AnalysisJob.findings))
            .where(AnalysisJob.user_id == user_id)
            .order_by(AnalysisJob.created_at.desc())
            .limit(100)
        )
    )
    findings = [finding for job in jobs for finding in job.findings]
    finding_ids = [finding.id for finding in findings]

    dispositions = []
    if finding_ids:
        dispositions = list(
            db.scalars(
                select(FindingDisposition)
                .where(
                    FindingDisposition.user_id == user_id,
                    FindingDisposition.finding_id.in_(finding_ids),
                )
                .order_by(FindingDisposition.created_at.desc())
                .limit(200)
            )
        )

    disposition_by_finding = {row.finding_id: row for row in dispositions}
    reviewed = len(disposition_by_finding)
    confirmed = sum(1 for row in disposition_by_finding.values() if row.disposition == "confirmed")
    dismissed = sum(1 for row in disposition_by_finding.values() if row.disposition == "dismissed")
    needs_info = sum(1 for row in disposition_by_finding.values() if row.disposition == "needs_info")
    high_open = sum(
        1
        for finding in findings
        if finding.severity == "high" and finding.id not in disposition_by_finding
    )

    confirm_rate = f"{round((confirmed / reviewed) * 100)}%" if reviewed else "—"
    review_coverage = f"{round((reviewed / len(findings)) * 100)}%" if findings else "—"

    metrics = [
        {
            "title": "Findings reviewed",
            "value": str(reviewed),
            "delta": f"{len(findings)} total",
            "deltaPositive": True,
            "description": "Investigator dispositions on statement findings",
        },
        {
            "title": "Review coverage",
            "value": review_coverage,
            "delta": f"{high_open} high open",
            "deltaPositive": high_open == 0,
            "description": "Share of findings that already have a decision",
        },
        {
            "title": "Confirm rate",
            "value": confirm_rate,
            "delta": f"{confirmed} confirmed",
            "deltaPositive": True,
            "description": "Confirmed findings among reviewed items",
        },
        {
            "title": "Dismissed / FP clears",
            "value": str(dismissed),
            "delta": f"{needs_info} need info",
            "deltaPositive": False,
            "description": "Findings marked dismissed or needing more information",
        },
    ]

    finding_lookup = {finding.id: finding for finding in findings}
    job_lookup = {job.id: job for job in jobs}
    events: list[dict[str, str]] = []
    for row in dispositions[:20]:
        finding = finding_lookup.get(row.finding_id)
        job = job_lookup.get(row.job_id)
        filename = (
            job.document.original_filename
            if job is not None and getattr(job, "document", None) is not None
            else "Analysis"
        )
        title = finding.title if finding is not None else "Finding review"
        rule = finding.rule_id if finding is not None and finding.rule_id else finding.source if finding else "finding"
        events.append(
            {
                "title": title,
                "source": f"{filename} · {rule} · {row.disposition}",
                "adjustment": row.note
                or (
                    "Marked confirmed — keep similar signals elevated."
                    if row.disposition == "confirmed"
                    else "Marked dismissed — require stronger evidence next time."
                    if row.disposition == "dismissed"
                    else "Marked needs info — follow up before closing."
                ),
            }
        )

    confirmed_rules = Counter(
        finding_lookup[row.finding_id].rule_id or finding_lookup[row.finding_id].source
        for row in disposition_by_finding.values()
        if row.disposition == "confirmed" and row.finding_id in finding_lookup
    )
    dismissed_rules = Counter(
        finding_lookup[row.finding_id].rule_id or finding_lookup[row.finding_id].source
        for row in disposition_by_finding.values()
        if row.disposition == "dismissed" and row.finding_id in finding_lookup
    )

    risk = settings_to_dict(get_or_create_risk_settings(db, user_id))
    insight_parts = [
        f"You have reviewed {reviewed} of {len(findings)} findings.",
        f"{confirmed} confirmed and {dismissed} dismissed.",
    ]
    if confirmed_rules:
        top = confirmed_rules.most_common(1)[0]
        insight_parts.append(f"Most confirmed signal: {top[0]} ({top[1]}).")
    if dismissed_rules:
        top = dismissed_rules.most_common(1)[0]
        insight_parts.append(f"Most dismissed signal: {top[0]} ({top[1]}).")
    insight_parts.append(
        f"Current high/medium thresholds are {risk['highRiskThreshold']}% / {risk['mediumRiskThreshold']}%."
    )

    return {
        "metrics": metrics,
        "events": events,
        "insight": " ".join(insight_parts),
        "counts": {
            "findings": len(findings),
            "reviewed": reviewed,
            "confirmed": confirmed,
            "dismissed": dismissed,
            "needs_info": needs_info,
            "high_open": high_open,
        },
    }


def format_learning_feedback_for_prompt(db: Session, user_id: UUID, limit: int = 12) -> str:
    """Summarize prior investigator dispositions for Claude context."""
    rows = list(
        db.scalars(
            select(FindingDisposition)
            .where(FindingDisposition.user_id == user_id)
            .order_by(FindingDisposition.created_at.desc())
            .limit(limit)
        )
    )
    if not rows:
        return (
            "Investigator feedback history:\n"
            "- No prior dispositions yet. Use risk settings and extract evidence only."
        )

    finding_ids = [row.finding_id for row in rows]
    findings = {
        finding.id: finding
        for finding in db.scalars(select(Finding).where(Finding.id.in_(finding_ids)))
    }

    lines = ["Investigator feedback history (apply to similar signals):"]
    for row in rows:
        finding = findings.get(row.finding_id)
        title = finding.title if finding is not None else "Finding"
        rule = (
            finding.rule_id
            if finding is not None and finding.rule_id
            else finding.source if finding is not None else "unknown"
        )
        severity = finding.severity if finding is not None else "n/a"
        note = f" Note: {row.note}" if row.note else ""
        lines.append(
            f"- [{row.disposition}] {title} (rule={rule}, severity={severity}).{note}"
        )
    lines.append(
        "Treat confirmed patterns as higher priority; treat dismissed patterns as likely false "
        "positives unless stronger evidence appears in this extract."
    )
    return "\n".join(lines)
