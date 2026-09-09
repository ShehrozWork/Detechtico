"""admin platform ops schema

Revision ID: 0008_admin_ops
Revises: 0007_signup_otp
Create Date: 2026-09-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0008_admin_ops"
down_revision: Union[str, Sequence[str], None] = "0007_signup_otp"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("staff_role", sa.String(32), nullable=True))
    op.add_column(
        "users",
        sa.Column("trial_ends_at_override", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_staff_role", "users", ["staff_role"])

    op.add_column(
        "analysis_jobs",
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "staff_totp_secrets",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("secret", sa.String(64), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "comp_entitlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("granted_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_comp_entitlements_user_id", "comp_entitlements", ["user_id"])
    op.create_index("ix_comp_entitlements_expires_at", "comp_entitlements", ["expires_at"])

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_role", sa.String(32), nullable=False),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("target_type", sa.String(64), nullable=False),
        sa.Column("target_id", sa.String(64), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("request_id", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_admin_audit_logs_actor_user_id", "admin_audit_logs", ["actor_user_id"])
    op.create_index("ix_admin_audit_logs_action", "admin_audit_logs", ["action"])
    op.create_index("ix_admin_audit_logs_target_id", "admin_audit_logs", ["target_id"])
    op.create_index("ix_admin_audit_logs_created_at", "admin_audit_logs", ["created_at"])

    op.create_table(
        "document_reveal_grants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_document_reveal_grants_actor_user_id", "document_reveal_grants", ["actor_user_id"])
    op.create_index("ix_document_reveal_grants_document_id", "document_reveal_grants", ["document_id"])
    op.create_index("ix_document_reveal_grants_expires_at", "document_reveal_grants", ["expires_at"])


def downgrade() -> None:
    op.drop_table("document_reveal_grants")
    op.drop_table("admin_audit_logs")
    op.drop_table("comp_entitlements")
    op.drop_table("staff_totp_secrets")
    op.drop_column("analysis_jobs", "retry_count")
    op.drop_index("ix_users_staff_role", table_name="users")
    op.drop_column("users", "trial_ends_at_override")
    op.drop_column("users", "staff_role")
