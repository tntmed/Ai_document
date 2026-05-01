"""
Auto Assignment Service
-----------------------
Called immediately after a document is uploaded.

Flow:
1. OCR text is already extracted and saved on `doc.ocr_text`
2. Call routing_service.suggest_for_document(db, doc_id)
3a. Suggestion found  → create task for that department, status = ASSIGNED
3b. No suggestion     → escalate to chief (WAIT_CHIEF_REVIEW), no task created
4. All DB writes happen inside the caller's transaction (no extra commit here).
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
import logging

from sqlalchemy.orm import Session

from app.models.document import Document, DocumentStatusLog, DocumentStatus
from app.models.task import DocumentTask, TaskStatusLog, TaskStatus
from app.models.user import User
from app.services import routing_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result dataclass (plain dict-compatible)
# ---------------------------------------------------------------------------

class AutoAssignResult:
    def __init__(
        self,
        auto_assigned: bool,
        department_id: Optional[int] = None,
        department_name: Optional[str] = None,
        task_id: Optional[int] = None,
        confidence: float = 0.0,
        matched_keywords: list[str] | None = None,
        reason: str = "",
    ):
        self.auto_assigned = auto_assigned
        self.department_id = department_id
        self.department_name = department_name
        self.task_id = task_id
        self.confidence = confidence
        self.matched_keywords = matched_keywords or []
        self.reason = reason

    def to_dict(self) -> dict:
        return {
            "auto_assigned": self.auto_assigned,
            "department_id": self.department_id,
            "department_name": self.department_name,
            "task_id": self.task_id,
            "confidence": self.confidence,
            "matched_keywords": self.matched_keywords,
            "reason": self.reason,
        }


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run(db: Session, doc_id: int, assigner: User) -> AutoAssignResult:
    """
    Execute auto-assignment for *doc_id*.

    Must be called **before** db.commit() so everything lands in one transaction.
    Returns an AutoAssignResult describing what happened.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        logger.error("auto_assign: document %s not found", doc_id)
        return AutoAssignResult(auto_assigned=False, reason="ไม่พบเอกสาร")

    # ── guard: only process documents that are still in RECEIVED status ──
    if doc.status != DocumentStatus.RECEIVED:
        logger.info(
            "auto_assign: doc %s already in status %s – skipping",
            doc_id, doc.status,
        )
        return AutoAssignResult(
            auto_assigned=False,
            reason=f"เอกสารมีสถานะ {doc.status} ข้ามการมอบหมายอัตโนมัติ",
        )

    # ── ask routing engine ──
    suggestion = routing_service.suggest_for_document(db, doc_id)
    logger.info(
        "auto_assign: doc %s suggestion dept=%s confidence=%.2f",
        doc_id,
        suggestion.suggested_department_id,
        suggestion.confidence,
    )

    if suggestion.suggested_department_id:
        return _assign_to_department(db, doc, assigner, suggestion)
    else:
        return _escalate_to_chief(db, doc, assigner, suggestion.reason)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _has_active_task_for_dept(db: Session, doc_id: int, dept_id: int) -> bool:
    """Return True if a non-terminal task already exists for this doc+dept."""
    return (
        db.query(DocumentTask)
        .filter(
            DocumentTask.document_id == doc_id,
            DocumentTask.assigned_department_id == dept_id,
            DocumentTask.status.notin_(TaskStatus.TERMINAL),
        )
        .first()
        is not None
    )


def _log_doc_status(
    db: Session,
    doc: Document,
    to_status: str,
    user_id: int,
    note: str,
):
    old_status = doc.status
    doc.status = to_status
    doc.updated_at = datetime.utcnow()
    db.add(
        DocumentStatusLog(
            document_id=doc.id,
            from_status=old_status,
            to_status=to_status,
            changed_by=user_id,
            note=note,
        )
    )


def _assign_to_department(db, doc: Document, assigner: User, suggestion) -> AutoAssignResult:
    dept_id = suggestion.suggested_department_id
    dept_name = suggestion.department_name or ""

    # ── duplicate guard ──
    if _has_active_task_for_dept(db, doc.id, dept_id):
        logger.info(
            "auto_assign: doc %s already has active task for dept %s – skipping task creation",
            doc.id, dept_id,
        )
        return AutoAssignResult(
            auto_assigned=False,
            department_id=dept_id,
            department_name=dept_name,
            reason="มีงานสำหรับหน่วยงานนี้อยู่แล้ว",
        )

    kw_list = ", ".join(f'"{k}"' for k in suggestion.matched_keywords[:5])
    task_title = f"ดำเนินการเรื่อง: {doc.title}"
    task_detail = (
        f"ระบบแนะนำโดยอัตโนมัติ\n"
        f"คำสำคัญที่ตรงกัน: {kw_list}\n"
        f"ความมั่นใจ: {round(suggestion.confidence * 100)}%\n"
        f"เหตุผล: {suggestion.reason}"
    )

    # ── create task ──
    task = DocumentTask(
        document_id=doc.id,
        assigned_department_id=dept_id,
        assigned_to_user_id=None,          # department-level; head can sub-assign
        assigned_by=assigner.id,
        task_title=task_title,
        task_detail=task_detail,
        status=TaskStatus.ASSIGNED,
    )
    db.add(task)
    db.flush()  # get task.id

    # ── task status log ──
    db.add(
        TaskStatusLog(
            task_id=task.id,
            from_status=None,
            to_status=TaskStatus.ASSIGNED,
            changed_by=assigner.id,
            note=f"มอบหมายงานอัตโนมัติโดยระบบ → {dept_name}",
        )
    )

    # ── advance document status ──
    _log_doc_status(
        db, doc, DocumentStatus.ASSIGNED, assigner.id,
        f"มอบหมายอัตโนมัติ → {dept_name} (คำสำคัญ: {kw_list})",
    )

    logger.info(
        "auto_assign: doc %s → task %s created for dept %s",
        doc.id, task.id, dept_id,
    )

    return AutoAssignResult(
        auto_assigned=True,
        department_id=dept_id,
        department_name=dept_name,
        task_id=task.id,
        confidence=suggestion.confidence,
        matched_keywords=suggestion.matched_keywords,
        reason=suggestion.reason,
    )


def _escalate_to_chief(db, doc: Document, assigner: User, routing_reason: str) -> AutoAssignResult:
    reason = routing_reason or "ไม่พบคำสำคัญที่ตรงกับกฎ Routing"
    note = f"ส่งให้ผู้อำนวยการพิจารณา (ระบบไม่สามารถแนะนำหน่วยงานได้: {reason})"

    _log_doc_status(db, doc, DocumentStatus.WAIT_CHIEF_REVIEW, assigner.id, note)

    logger.info("auto_assign: doc %s escalated to chief – %s", doc.id, reason)

    return AutoAssignResult(
        auto_assigned=False,
        reason=reason,
    )