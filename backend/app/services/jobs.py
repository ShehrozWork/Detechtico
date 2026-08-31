from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import text

from app.config import get_settings
from app.db import SessionLocal, admin_engine, set_rls_user
from app.models import AnalysisJob, Document, Finding
from app.services.extract import extract_document
from app.services.files import document_path
from app.services.anthropic_analysis import analyze_with_anthropic
from app.services.risk_settings import get_or_create_risk_settings, settings_to_dict
from app.services.learning import format_learning_feedback_for_prompt
from app.services.rules import run_rules

logger = logging.getLogger(__name__)


def _job_user_id(job_id: UUID) -> UUID | None:
    with admin_engine.connect() as conn:
        row = conn.execute(
            text("SELECT user_id FROM analysis_jobs WHERE id = :id"),
            {"id": job_id},
        ).first()
    return row[0] if row else None


def recover_stale_jobs() -> None:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
    try:
        with admin_engine.begin() as conn:
            conn.execute(
                text(
                    """
                    UPDATE analysis_jobs
                    SET status = 'failed',
                        error_code = 'stale_job',
                        finished_at = NOW()
                    WHERE status = 'running'
                      AND started_at IS NOT NULL
                      AND started_at < :cutoff
                    """
                ),
                {"cutoff": cutoff},
            )
    except Exception:
        logger.exception("Failed to recover stale analysis jobs")


def process_job(job_id: UUID) -> None:
    user_id = _job_user_id(job_id)
    if user_id is None:
        return

    db = SessionLocal()
    try:
        set_rls_user(db, user_id)
        job = db.get(AnalysisJob, job_id)
        if job is None or job.status not in {"queued", "running"}:
            return

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        db.commit()
        set_rls_user(db, user_id)

        document = db.get(Document, job.document_id)
        if document is None:
            job.status = "failed"
            job.error_code = "document_missing"
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            return

        path = document_path(str(document.user_id), document.storage_name)
        if not path.exists():
            job.status = "failed"
            job.error_code = "file_missing"
            job.finished_at = datetime.now(timezone.utc)
            db.commit()
            return

        content = extract_document(path, document.detected_type)
        rule_findings = run_rules(content)
        risk_settings = settings_to_dict(get_or_create_risk_settings(db, user_id))
        learning_feedback = format_learning_feedback_for_prompt(db, user_id)

        llm_status = "skipped"
        llm_findings: list[dict] = []
        try:
            llm_findings, llm_status = analyze_with_anthropic(
                content,
                rule_findings,
                job.statement_type,
                risk_settings,
                learning_feedback,
            )
            job.model = get_settings().anthropic_model if llm_status == "succeeded" else None
        except Exception:
            logger.exception("Anthropic analysis failed for job %s", job.id)
            llm_status = "failed"
            if get_settings().analysis_require_llm:
                job.status = "failed"
                job.error_code = "analysis_failed"
                job.llm_status = llm_status
                job.finished_at = datetime.now(timezone.utc)
                db.commit()
                return

        for item in [*rule_findings, *llm_findings]:
            db.add(
                Finding(
                    job_id=job.id,
                    source=item["source"],
                    title=item["title"],
                    detail=item["detail"],
                    severity=item["severity"],
                    evidence=item.get("evidence"),
                    location=item.get("location"),
                    confidence=item.get("confidence"),
                    rule_id=item.get("rule_id"),
                )
            )

        job.llm_status = llm_status
        job.status = "succeeded"
        job.error_code = None
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        logger.exception("Analysis job %s failed", job_id)
        db.rollback()
        try:
            set_rls_user(db, user_id)
            job = db.get(AnalysisJob, job_id)
            if job is not None:
                job.status = "failed"
                job.error_code = "analysis_failed"
                job.finished_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
