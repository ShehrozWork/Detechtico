from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Request, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import get_current_user
from app.errors import FORBIDDEN, RATE_LIMITED, error
from app.middleware import client_ip
from app.models import AnalysisJob, Document, FindingDisposition, User
from app.rate_limit import limiter
from app.schemas import FindingOut, JobOut, JobSummaryOut
from app.services.files import document_path, save_upload
from app.services.jobs import process_job

router = APIRouter(tags=["documents"])

ALLOWED_STATEMENT_TYPES = {"balance-sheet", "income", "cash-flow"}


def _job_filename(job: AnalysisJob, document: Document | None = None) -> str | None:
    if document is not None:
        return document.original_filename
    if getattr(job, "document", None) is not None:
        return job.document.original_filename
    return None


def _job_out(job: AnalysisJob, document: Document | None = None, dispositions: dict | None = None) -> JobOut:
    disposition_map = dispositions or {}
    findings = [
        FindingOut(
            id=finding.id,
            source=finding.source,  # type: ignore[arg-type]
            title=finding.title,
            detail=finding.detail,
            severity=finding.severity,  # type: ignore[arg-type]
            evidence=finding.evidence,
            location=finding.location,
            confidence=finding.confidence,
            rule_id=finding.rule_id,
            disposition=disposition_map.get(finding.id),
        )
        for finding in job.findings
    ]
    return JobOut(
        id=job.id,
        document_id=job.document_id,
        status=job.status,  # type: ignore[arg-type]
        llm_status=job.llm_status,  # type: ignore[arg-type]
        statement_type=job.statement_type,  # type: ignore[arg-type]
        original_filename=_job_filename(job, document),
        error_code=job.error_code,
        findings=findings,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


def _job_summary(job: AnalysisJob, finding_count: int = 0) -> JobSummaryOut:
    return JobSummaryOut(
        id=job.id,
        document_id=job.document_id,
        status=job.status,  # type: ignore[arg-type]
        llm_status=job.llm_status,  # type: ignore[arg-type]
        statement_type=job.statement_type,  # type: ignore[arg-type]
        original_filename=_job_filename(job),
        error_code=job.error_code,
        finding_count=finding_count,
        created_at=job.created_at,
        finished_at=job.finished_at,
    )


@router.post("/documents/analyze", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
async def upload_and_analyze(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    statement_type: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobOut:
    ip = client_ip(request)
    if not limiter.allow(f"analyze:{user.id}", 6, 60) or not limiter.allow(f"upload-ip:{ip}", 20, 60):
        raise RATE_LIMITED
    if statement_type is not None and statement_type not in ALLOWED_STATEMENT_TYPES:
        raise error(400, "invalid_statement_type", "Invalid statement type.")

    stored = await save_upload(file, str(user.id))
    document = Document(
        user_id=user.id,
        original_filename=stored.original_filename,
        storage_name=stored.storage_name,
        detected_type=stored.detected_type,
        mime=stored.mime,
        size_bytes=stored.size_bytes,
        checksum_sha256=stored.checksum_sha256,
    )
    db.add(document)
    db.flush()

    job = AnalysisJob(
        user_id=user.id,
        document_id=document.id,
        statement_type=statement_type,
        status="queued",
        llm_status="pending",
    )
    db.add(job)
    db.flush()
    job_id = job.id
    # Commit before the background worker starts so the job row is visible.
    db.commit()
    background.add_task(process_job, job_id)
    return _job_out(job, document)


@router.get("/jobs", response_model=list[JobSummaryOut])
def list_jobs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[JobSummaryOut]:
    jobs = list(
        db.scalars(
            select(AnalysisJob)
            .options(selectinload(AnalysisJob.document), selectinload(AnalysisJob.findings))
            .where(AnalysisJob.user_id == user.id)
            .order_by(AnalysisJob.created_at.desc())
            .limit(100)
        )
    )
    return [_job_summary(job, len(job.findings)) for job in jobs]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(
    job_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobOut:
    job = db.scalar(
        select(AnalysisJob)
        .options(selectinload(AnalysisJob.document), selectinload(AnalysisJob.findings))
        .where(AnalysisJob.id == job_id)
    )
    if job is None:
        raise error(404, "not_found", "Analysis not found.")
    if job.user_id != user.id:
        raise FORBIDDEN
    finding_ids = [finding.id for finding in job.findings]
    disposition_map = {}
    if finding_ids:
        rows = db.scalars(
            select(FindingDisposition).where(
                FindingDisposition.user_id == user.id,
                FindingDisposition.finding_id.in_(finding_ids),
            )
        )
        disposition_map = {row.finding_id: row.disposition for row in rows}
    return _job_out(job, dispositions=disposition_map)


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
def delete_document(
    document_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    document = db.get(Document, document_id)
    if document is None:
        raise error(404, "not_found", "Document not found.")
    if document.user_id != user.id:
        raise FORBIDDEN
    path = document_path(str(document.user_id), document.storage_name)
    db.delete(document)
    db.flush()
    if path.exists():
        path.unlink()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
