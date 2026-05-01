from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class RoutingRule(Base):
    __tablename__ = "routing_rules"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String(200), nullable=False)
    target_department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    document_type = Column(String(50), nullable=True)   # optional filter by doc type
    priority = Column(Integer, default=0, nullable=False)  # higher = stronger match
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    target_department = relationship("Department", foreign_keys=[target_department_id])


class RoutingFeedbackLog(Base):
    __tablename__ = "routing_feedback_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    ocr_text_snapshot = Column(Text, nullable=True)
    system_suggested_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    chief_selected_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    feedback_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="routing_feedback")
    suggested_department = relationship("Department", foreign_keys=[system_suggested_department_id])
    selected_department = relationship("Department", foreign_keys=[chief_selected_department_id])
