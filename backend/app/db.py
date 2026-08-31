from __future__ import annotations

import logging
from collections.abc import Generator
from uuid import UUID

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

connect_args: dict[str, object] = {}
if settings.database_url.startswith("postgresql"):
    connect_args["options"] = "-c timezone=utc"

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args=connect_args,
)

admin_engine = create_engine(
    settings.admin_database_url or settings.database_url,
    pool_pre_ping=True,
    pool_size=2,
    max_overflow=2,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def set_rls_user(db: Session, user_id: UUID | None) -> None:
    value = str(user_id) if user_id else ""
    db.execute(text("SELECT set_config('app.current_user_id', :uid, true)"), {"uid": value})


def grant_app_role() -> None:
    role = settings.app_db_role
    if not role.replace("_", "").isalnum():
        raise ValueError("APP_DB_ROLE is invalid")
    try:
        with admin_engine.begin() as conn:
            conn.execute(text(f'GRANT USAGE ON SCHEMA public TO "{role}"'))
            conn.execute(
                text(
                    f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "{role}"'
                )
            )
            conn.execute(
                text(f'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "{role}"')
            )
    except Exception:
        logger.warning(
            "Could not grant privileges to %s. If you are using a single Postgres role, this is fine.",
            role,
        )


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
