from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


# Document status constants
class DocumentStatus:
    RECEIVED = "RECEIVED"
    WAIT_CHIEF_REVIEW = "WAIT_CHIEF_REVIEW"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    DONE_BY_SECTION = "DONE_BY_SECTION"
    RETURNED_TO_ADMIN = "RETURNED_TO_ADMIN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"

    ALL = [
        RECEIVED, WAIT_CHIEF_REVIEW, ASSIGNED, IN_PROGRESS,
        DONE_BY_SECTION, RETURNED_TO_ADMIN, CLOSED, CANCELLED,
    ]


class DocumentPriority:
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"
    ALL = [LOW, NORMAL, HIGH, URGENT]


class DocumentType:
    MEMO = "MEMO"
    LETTER = "LETTER"
    ORDER = "ORDER"
    REPORT = "REPORT"
    REQUEST = "REQUEST"
    COMPLAINT = "COMPLAINT"
    OTHER = "OTHER"
    ALL = [MEMO, LETTER, ORDER, REPORT, REQUEST, COMPLAINT, OTHER]


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    document_no = Column(String(50), unique=True, nullable=False, index=True)
    incoming_no = Column(String(50), nullable=True)
    title = Column(String(500), nullable=False)
    sender = Column(String(200), nullable=True)
    received_date = Column(DateTime, nullable=True)
    document_type = Column(String(50), default=DocumentType.OTHER, nullable=False)
    priority = Column(String(20), default=DocumentPriority.NORMAL, nullable=False)
    status = Column(String(50), default=DocumentStatus.RECEIVED, nullable=False, index=True)
    current_owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    ocr_text = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    creator = relationship("User", back_populates="created_documents", foreign_keys=[created_by])
    current_owner = relationship("User", back_populates="owned_documents", foreign_keys=[current_owner_id])
    files = relationship("DocumentFile", back_populates="document", cascade="all, delete-orphan")
    tasks = relationship("DocumentTask", back_populates="document", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="document", cascade="all, delete-orphan")
    status_logs = relationship(
        "DocumentStatusLog", back_populates="document",
        cascade="all, delete-orphan", order_by="DocumentStatusLog.created_at"
    )
    routing_feedback = relationship("RoutingFeedbackLog", back_populates="document", cascade="all, delete-orphan")


class DocumentFile(Base):
    __tablename__ = "document_files"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_type = Column(String(50), default="pdf", nullable=False)
    file_size = Column(Integer, nullable=True)  # bytes
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="files")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class DocumentStatusLog(Base):
    __tablename__ = "document_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="status_logs")
    changed_by_user = relationship("User", foreign_keys=[changed_by])
