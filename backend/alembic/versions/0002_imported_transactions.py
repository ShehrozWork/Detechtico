"""imported transactions

Revision ID: 0002_imported_transactions
Revises: 0001_initial
Create Date: 2026-08-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_imported_transactions"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RLS = """
ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS imported_transactions_owner ON imported_transactions;
CREATE POLICY imported_transactions_owner ON imported_transactions
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
"""


def upgrade() -> None:
    op.create_table(
        "imported_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("external_id", sa.String(80), nullable=True),
        sa.Column("merchant", sa.String(180), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False, server_default="USD"),
        sa.Column("txn_date", sa.String(40), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("source_filename", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_imported_transactions_user_id", "imported_transactions", ["user_id"])

    op.execute(sa.text(RLS))


def downgrade() -> None:
    op.drop_table("imported_transactions")
