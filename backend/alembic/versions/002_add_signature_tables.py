"""Add signature related tables

Revision ID: 002
Revises: 001
Create Date: 2024-01-02 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # User signatures table
    op.create_table(
        "user_signatures",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signature_name", sa.String(100), nullable=False),
        sa.Column("image_path", sa.String(500), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_signatures_user_id", "user_signatures", ["user_id"])

    # Document PDF versions table
    op.create_table(
        "document_pdf_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_type", sa.String(50), nullable=False),
        sa.Column("original_file_id", sa.Integer(), sa.ForeignKey("document_files.id"), nullable=False),
        sa.Column("stamped_file_path", sa.String(500), nullable=False),
        sa.Column("stamped_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stamped_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("page_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("x_position", sa.Float(), nullable=False),
        sa.Column("y_position", sa.Float(), nullable=False),
        sa.Column("width", sa.Float(), nullable=True),
        sa.Column("height", sa.Float(), nullable=True),
        sa.Column("stamp_text", sa.String(200), nullable=True),
        sa.Column("is_final", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_document_pdf_versions_document_id", "document_pdf_versions", ["document_id"])
    op.create_index("ix_document_pdf_versions_stamped_by", "document_pdf_versions", ["stamped_by"])

    # Signature audit logs table
    op.create_table(
        "signature_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.Integer(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=True),
        sa.Column("pdf_version_id", sa.Integer(), sa.ForeignKey("document_pdf_versions.id"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_signature_audit_logs_document_id", "signature_audit_logs", ["document_id"])
    op.create_index("ix_signature_audit_logs_user_id", "signature_audit_logs", ["user_id"])


def downgrade() -> None:
    op.drop_table("signature_audit_logs")
    op.drop_table("document_pdf_versions")
    op.drop_table("user_signatures")