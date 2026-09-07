"""email change otp and revert tokens

Revision ID: 0006_email_change
Revises: 0005_subscriptions
Create Date: 2026-09-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0006_email_change"
down_revision: Union[str, Sequence[str], None] = "0005_subscriptions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_change_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("new_email", sa.String(254), nullable=False),
        sa.Column("otp_hash", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_change_challenges_user_id", "email_change_challenges", ["user_id"])
    op.create_index("ix_email_change_challenges_expires_at", "email_change_challenges", ["expires_at"])

    op.create_table(
        "email_change_revert_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous_email", sa.String(254), nullable=False),
        sa.Column("new_email", sa.String(254), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_email_change_revert_token_hash"),
    )
    op.create_index("ix_email_change_revert_tokens_user_id", "email_change_revert_tokens", ["user_id"])
    op.create_index("ix_email_change_revert_tokens_token_hash", "email_change_revert_tokens", ["token_hash"])
    op.create_index("ix_email_change_revert_tokens_expires_at", "email_change_revert_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_table("email_change_revert_tokens")
    op.drop_table("email_change_challenges")
