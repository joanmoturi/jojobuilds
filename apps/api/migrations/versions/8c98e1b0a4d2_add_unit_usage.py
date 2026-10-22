"""Distinguish residential and commercial units without changing existing leases."""

import sqlalchemy as sa
from alembic import op

revision = "8c98e1b0a4d2"
down_revision = "061a79a6a91e"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "units",
        sa.Column("usage", sa.String(length=20), nullable=False, server_default="residential"),
    )


def downgrade():
    op.drop_column("units", "usage")
