from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class TaskStatus:
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    RETURNED = "RETURNED"
    CANCELLED = "CANCELLED"

    ALL = [ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED, RETURNED, CANCELLED]
    ACTIVE = [ASSIGNED, ACCEPTED, IN_PROGRESS]
    TERMINAL = [COMPLETED, RETURNED, CANCELLED]


class DocumentTask(Base):
    __tablename__ = "document_tasks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    assigned_department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_title = Column(String(500), nullable=False)
    task_detail = Column(Text, nullable=True)
    status = Column(String(50), default=TaskStatus.ASSIGNED, nullable=False, index=True)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    completion_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="tasks")
    assigned_department = relationship("Department", foreign_keys=[assigned_department_id])
    assigned_user = relationship("User", back_populates="assigned_tasks", foreign_keys=[assigned_to_user_id])
    assigner = relationship("User", back_populates="tasks_assigned_by", foreign_keys=[assigned_by])
    status_logs = relationship(
        "TaskStatusLog", back_populates="task",
        cascade="all, delete-orphan", order_by="TaskStatusLog.created_at"
    )
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="task", cascade="all, delete-orphan")


class TaskStatusLog(Base):
    __tablename__ = "task_status_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("document_tasks.id", ondelete="CASCADE"), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    task = relationship("DocumentTask", back_populates="status_logs")
    changed_by_user = relationship("User", foreign_keys=[changed_by])
