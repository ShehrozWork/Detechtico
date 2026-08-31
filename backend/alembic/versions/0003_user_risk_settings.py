"""user risk settings

Revision ID: 0003_user_risk_settings
Revises: 0002_imported_transactions
Create Date: 2026-08-31
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003_user_risk_settings"
down_revision: Union[str, Sequence[str], None] = "0002_imported_transactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_RULES = [
    {
        "id": "velocity",
        "title": "Velocity Checks",
        "description": "Monitor frequency and speed of transactions",
        "enabled": True,
    },
    {
        "id": "geo",
        "title": "Geolocation Analysis",
        "description": "Flag transactions from unusual locations",
        "enabled": True,
    },
    {
        "id": "time",
        "title": "Time Pattern Analysis",
        "description": "Detect anomalies in transaction timing",
        "enabled": True,
    },
    {
        "id": "merchant",
        "title": "Merchant Verification",
        "description": "Cross-reference with trusted merchant database",
        "enabled": True,
    },
]

RLS = """
ALTER TABLE user_risk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_risk_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_risk_settings_owner ON user_risk_settings;
CREATE POLICY user_risk_settings_owner ON user_risk_settings
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
"""


def upgrade() -> None:
    op.create_table(
        "user_risk_settings",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("high_risk_threshold", sa.Integer(), nullable=False, server_default="75"),
        sa.Column("medium_risk_threshold", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("amount_alert", sa.Integer(), nullable=False, server_default="1000"),
        sa.Column("rules", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute(sa.text(RLS))


def downgrade() -> None:
    op.drop_table("user_risk_settings")
