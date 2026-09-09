"""llm usage events for anthropic cost tracking

Revision ID: 0009_llm_usage
Revises: 0008_admin_ops
Create Date: 2026-09-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0009_llm_usage"
down_revision: Union[str, Sequence[str], None] = "0008_admin_ops"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("analysis_jobs.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("model", sa.String(80), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("anthropic_request_id", sa.String(128), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("output_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cache_creation_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cache_read_input_tokens", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("input_cost_usd", sa.Numeric(14, 6), nullable=False, server_default="0"),
        sa.Column("output_cost_usd", sa.Numeric(14, 6), nullable=False, server_default="0"),
        sa.Column("cache_write_cost_usd", sa.Numeric(14, 6), nullable=False, server_default="0"),
        sa.Column("cache_read_cost_usd", sa.Numeric(14, 6), nullable=False, server_default="0"),
        sa.Column("total_cost_usd", sa.Numeric(14, 6), nullable=False, server_default="0"),
        sa.Column("pricing_known", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("pricing_version", sa.String(64), nullable=True),
        sa.Column("pricing_source", sa.String(255), nullable=True),
        sa.Column("rates_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_llm_usage_events_user_id", "llm_usage_events", ["user_id"])
    op.create_index("ix_llm_usage_events_job_id", "llm_usage_events", ["job_id"])
    op.create_index("ix_llm_usage_events_created_at", "llm_usage_events", ["created_at"])
    op.create_index("ix_llm_usage_events_model", "llm_usage_events", ["model"])
    op.create_index("ix_llm_usage_events_status", "llm_usage_events", ["status"])
    op.create_index("ix_llm_usage_events_total_cost_usd", "llm_usage_events", ["total_cost_usd"])


def downgrade() -> None:
    op.drop_table("llm_usage_events")
