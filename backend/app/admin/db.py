from __future__ import annotations

from collections.abc import Generator
from uuid import UUID

from sqlalchemy.orm import Session

from app.db import AdminSessionLocal, set_rls_user


def get_admin_db() -> Generator[Session, None, None]:
    """Privileged session that bypasses RLS. Use only for cross-user admin queries."""
    db = AdminSessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def scoped_user_session(user_id: UUID) -> Generator[Session, None, None]:
    """Admin-initiated session scoped to a single customer user_id (RLS as that user)."""
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        set_rls_user(db, user_id)
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
