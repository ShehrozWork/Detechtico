from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.models import AdminAuditLog, User


def write_audit(
    db: Session,
    *,
    actor: User,
    action: str,
    target_type: str,
    target_id: str | UUID | None = None,
    metadata: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> AdminAuditLog:
    row = AdminAuditLog(
        id=uuid4(),
        actor_user_id=actor.id,
        actor_role=actor.staff_role or "unknown",
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        metadata_json=metadata or {},
        request_id=request_id,
    )
    db.add(row)
    db.flush()
    return row
