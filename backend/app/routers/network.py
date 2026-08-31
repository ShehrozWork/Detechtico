from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import NetworkSummaryOut
from app.services.network import build_network_summary

router = APIRouter(prefix="/network", tags=["network"])


@router.get("/summary", response_model=NetworkSummaryOut)
def network_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NetworkSummaryOut:
    return NetworkSummaryOut(**build_network_summary(db, user.id))
