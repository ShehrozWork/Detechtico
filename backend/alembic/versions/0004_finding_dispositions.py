"""finding dispositions

Revision ID: 0004_finding_dispositions
Revises: 0003_user_risk_settings
Create Date: 2026-08-31
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004_finding_dispositions"
down_revision: Union[str, Sequence[str], None] = "0003_user_risk_settings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RLS = """
ALTER TABLE finding_dispositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finding_dispositions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS finding_dispositions_owner ON finding_dispositions;
CREATE POLICY finding_dispositions_owner ON finding_dispositions
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
"""


def upgrade() -> None:
    op.create_table(
        "finding_dispositions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("finding_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("findings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("analysis_jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("disposition", sa.String(16), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "finding_id", name="uq_finding_dispositions_user_finding"),
    )
    op.create_index("ix_finding_dispositions_user_id", "finding_dispositions", ["user_id"])
    op.create_index("ix_finding_dispositions_finding_id", "finding_dispositions", ["finding_id"])
    op.create_index("ix_finding_dispositions_job_id", "finding_dispositions", ["job_id"])
    op.execute(sa.text(RLS))


def downgrade() -> None:
    op.drop_table("finding_dispositions")
