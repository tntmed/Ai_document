"""Make signature_audit_logs.document_id nullable

Revision ID: 003
Revises: 002
Create Date: 2026-04-30 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("signature_audit_logs") as batch_op:
        batch_op.alter_column(
            "document_id",
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("signature_audit_logs") as batch_op:
        batch_op.alter_column(
            "document_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
