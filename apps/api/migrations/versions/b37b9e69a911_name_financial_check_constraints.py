"""Preserve named financial checks across SQLite batch migrations."""

from alembic import op

revision = "b37b9e69a911"
down_revision = "0d6656a0b99c"
branch_labels = None
depends_on = None

CHECKS = [
    ("allocations", "ck_allocation_positive", "amount > 0"),
    ("charges", "ck_charge_positive", "amount > 0"),
    ("payments", "ck_payment_positive", "amount > 0"),
    ("tenancies", "ck_tenancy_financial", "rent > 0 AND deposit >= 0 AND due_day BETWEEN 1 AND 31"),
    ("units", "ck_unit_rent", "default_rent >= 0"),
]


def upgrade():
    for table, name, expression in CHECKS:
        with op.batch_alter_table(table) as batch:
            batch.create_check_constraint(name, expression)


def downgrade():
    for table, name, _ in reversed(CHECKS):
        with op.batch_alter_table(table) as batch:
            batch.drop_constraint(name, type_="check")
