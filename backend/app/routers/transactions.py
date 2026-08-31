from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.errors import FORBIDDEN, RATE_LIMITED, error
from app.models import ImportedTransaction, User
from app.rate_limit import limiter
from app.schemas import TransactionImportRequest, TransactionOut, TransactionStatusUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/import", response_model=list[TransactionOut], status_code=status.HTTP_201_CREATED)
def import_transactions(
    payload: TransactionImportRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ImportedTransaction]:
    if not limiter.allow(f"txn-import:{user.id}", 20, 60):
        raise RATE_LIMITED

    rows = [
        ImportedTransaction(
            user_id=user.id,
            external_id=row.id,
            merchant=row.merchant,
            amount=row.amount,
            currency=row.currency,
            txn_date=row.date,
            status=row.status,
            risk_score=row.riskScore,
            source_filename=payload.source_filename,
        )
        for row in payload.transactions
    ]
    db.add_all(rows)
    db.flush()
    for row in rows:
        db.refresh(row)
    return rows


@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ImportedTransaction]:
    return list(
        db.scalars(
            select(ImportedTransaction)
            .where(ImportedTransaction.user_id == user.id)
            .order_by(ImportedTransaction.created_at.desc())
            .limit(500)
        )
    )


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction_status(
    transaction_id: UUID,
    payload: TransactionStatusUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportedTransaction:
    txn = db.get(ImportedTransaction, transaction_id)
    if txn is None:
        raise error(404, "not_found", "Transaction not found.")
    if txn.user_id != user.id:
        raise FORBIDDEN
    txn.status = payload.status
    db.flush()
    db.refresh(txn)
    return txn


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
def delete_transaction(
    transaction_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    txn = db.get(ImportedTransaction, transaction_id)
    if txn is None:
        raise error(404, "not_found", "Transaction not found.")
    if txn.user_id != user.id:
        raise FORBIDDEN
    db.delete(txn)
    db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, response_model=None)
def clear_transactions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    db.execute(delete(ImportedTransaction).where(ImportedTransaction.user_id == user.id))
    db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
