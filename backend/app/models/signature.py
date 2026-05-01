from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class UserSignature(Base):
    __tablename__ = "user_signatures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    signature_name = Column(String(100), nullable=False)
    image_path = Column(String(500), nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class DocumentPdfVersion(Base):
    __tablename__ = "document_pdf_versions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    version_type = Column(String(50), nullable=False)  # SIGNED, APPROVED, FINAL, etc.
    original_file_id = Column(Integer, ForeignKey("document_files.id"), nullable=False)
    stamped_file_path = Column(String(500), nullable=False)
    stamped_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    stamped_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    page_number = Column(Integer, nullable=False, default=1)
    x_position = Column(Float, nullable=False)
    y_position = Column(Float, nullable=False)
    width = Column(Float, nullable=True)  # Width of signature stamp
    height = Column(Float, nullable=True)  # Height of signature stamp
    stamp_text = Column(String(200), nullable=True)  # Optional text like "เห็นชอบ", "อนุมัติ"
    is_final = Column(Boolean, default=False, nullable=False)

    document = relationship("Document")
    original_file = relationship("DocumentFile", foreign_keys=[original_file_id])
    user = relationship("User", foreign_keys=[stamped_by])


class SignatureAuditLog(Base):
    __tablename__ = "signature_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    pdf_version_id = Column(Integer, ForeignKey("document_pdf_versions.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # UPLOAD_SIGNATURE, STAMP_DOCUMENT, DELETE_SIGNATURE
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document")
    pdf_version = relationship("DocumentPdfVersion", foreign_keys=[pdf_version_id])
    user = relationship("User")