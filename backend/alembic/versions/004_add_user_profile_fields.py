"""Add enterprise user profile fields

Revision ID: 004
Revises: 003
Create Date: 2026-05-01 00:00:00.000000

Safe for existing data:
  - All new columns are nullable (existing rows → NULL).
  - is_force_password_change uses server_default=false so existing users
    are NOT forced to change password after migration.
  - Unique indexes on employee_code / email tolerate NULL (no conflicts).
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("employee_code",  sa.String(50),  nullable=True))
        batch_op.add_column(sa.Column("first_name",     sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("last_name",      sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("display_name",   sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("email",          sa.String(200), nullable=True))
        batch_op.add_column(sa.Column("phone",          sa.String(20),  nullable=True))
        batch_op.add_column(sa.Column("position",       sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("sub_department", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column(
            "is_force_password_change",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),   # existing users: no forced change
        ))
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column("updated_at",    sa.DateTime(), nullable=True))

        # Unique indexes — NULL values are never considered duplicates
        batch_op.create_index("ix_users_employee_code", ["employee_code"], unique=True)
        batch_op.create_index("ix_users_email",         ["email"],         unique=True)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_email")
        batch_op.drop_index("ix_users_employee_code")
        batch_op.drop_column("updated_at")
        batch_op.drop_column("last_login_at")
        batch_op.drop_column("is_force_password_change")
        batch_op.drop_column("sub_department")
        batch_op.drop_column("position")
        batch_op.drop_column("phone")
        batch_op.drop_column("email")
        batch_op.drop_column("display_name")
        batch_op.drop_column("last_name")
        batch_op.drop_column("first_name")
        batch_op.drop_column("employee_code")
