"""Add optional company and building contact channels without changing existing contacts."""

import sqlalchemy as sa
from alembic import op

revision = "f41872c9de30"
down_revision = "c57d7cbbeaa6"
branch_labels = None
depends_on = None


def upgrade():
    for table in ("organizations", "properties"):
        for field in ("call_phone", "sms_phone", "whatsapp_phone"):
            op.add_column(table, sa.Column(field, sa.String(16), nullable=False, server_default=""))


def downgrade():
    for table in ("properties", "organizations"):
        for field in ("whatsapp_phone", "sms_phone", "call_phone"):
            op.drop_column(table, field)
