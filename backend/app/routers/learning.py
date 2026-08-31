from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db import get_db
from app.deps import get_current_user
from app.errors import FORBIDDEN, error
from app.models import Finding, User
from app.schemas import FindingDispositionOut, FindingDispositionRequest, LearningSummaryOut
from app.services.learning import build_learning_summary, upsert_finding_disposition

router = APIRouter(tags=["learning"])


@router.get("/learning/summary", response_model=LearningSummaryOut)
def learning_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LearningSummaryOut:
    return LearningSummaryOut(**build_learning_summary(db, user.id))


@router.post("/findings/{finding_id}/disposition", response_model=FindingDispositionOut)
def set_finding_disposition(
    finding_id: UUID,
    payload: FindingDispositionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FindingDispositionOut:
    finding = db.scalar(
        select(Finding).options(selectinload(Finding.job)).where(Finding.id == finding_id)
    )
    if finding is None:
        raise error(404, "not_found", "Finding not found.")
    if finding.job is None or finding.job.user_id != user.id:
        raise FORBIDDEN
    note = payload.note.strip() if payload.note else None
    row = upsert_finding_disposition(
        db,
        user_id=user.id,
        finding=finding,
        disposition=payload.disposition,
        note=note,
    )
    return FindingDispositionOut(
        id=row.id,
        finding_id=row.finding_id,
        job_id=row.job_id,
        disposition=row.disposition,  # type: ignore[arg-type]
        note=row.note,
        created_at=row.created_at,
    )
