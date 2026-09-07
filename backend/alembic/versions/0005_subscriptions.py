"""subscriptions and stripe webhook events

Revision ID: 0005_subscriptions
Revises: 0004_finding_dispositions
Create Date: 2026-09-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0005_subscriptions"
down_revision: Union[str, Sequence[str], None] = "0004_finding_dispositions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RLS = """
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_owner ON subscriptions;
CREATE POLICY subscriptions_owner ON subscriptions
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
"""


def upgrade() -> None:
    op.create_table(
        "subscriptions",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column("plan_id", sa.String(32), nullable=True),
        sa.Column("billing_period", sa.String(16), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="none"),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_event_created_at", sa.BigInteger(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("stripe_customer_id", name="uq_subscriptions_stripe_customer_id"),
        sa.UniqueConstraint("stripe_subscription_id", name="uq_subscriptions_stripe_subscription_id"),
    )
    op.create_table(
        "stripe_webhook_events",
        sa.Column("event_id", sa.String(255), primary_key=True),
        sa.Column("type", sa.String(120), nullable=False),
        sa.Column("event_created", sa.BigInteger(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute(sa.text(RLS))


def downgrade() -> None:
    op.execute(sa.text("DROP POLICY IF EXISTS subscriptions_owner ON subscriptions"))
    op.drop_table("stripe_webhook_events")
    op.drop_table("subscriptions")
