import os
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.document import Document, DocumentFile, DocumentStatusLog, DocumentStatus
from app.models.task import DocumentTask, TaskStatusLog, TaskStatus
from app.core.dependencies import get_current_user, get_user_role
from app.schemas.document import (
    DocumentOut, DocumentDetailOut, DocumentListOut,
    DocumentUpdate, AssignRequest, CloseRequest,
    DocumentStatusLogOut, TimelineEntry,
    AutoAssignmentResult, DocumentUploadOut,
)
from app.services.ocr_service import extract_text_from_pdf
from app.services import auto_assign_service
from app.services.routing_service import suggest_department

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXT = {".pdf"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _doc_no(db: Session) -> str:
    year = datetime.now().year
    count = db.query(Document).filter(Document.document_no.like(f"DOC-{year}-%")).count()
    return f"DOC-{year}-{count + 1:04d}"


def _load_doc(db: Session, doc_id: int) -> Optional[Document]:
    """Load a document with all relationships needed by _to_doc_out."""
    return (
        db.query(Document)
        .options(
            joinedload(Document.creator),
            joinedload(Document.current_owner),
            joinedload(Document.files),
        )
        .filter(Document.id == doc_id)
        .first()
    )


def _to_doc_out(doc: Document) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        document_no=doc.document_no,
        incoming_no=doc.incoming_no,
        title=doc.title,
        sender=doc.sender,
        received_date=doc.received_date,
        document_type=doc.document_type,
        priority=doc.priority,
        status=doc.status,
        current_owner_id=doc.current_owner_id,
        current_owner_name=doc.current_owner.full_name if doc.current_owner else None,
        ocr_text=doc.ocr_text,
        summary=doc.summary,
        created_by=doc.created_by,
        creator_name=doc.creator.full_name if doc.creator else None,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        files=[
            {
                "id": f.id,
                "original_filename": f.original_filename,
                "stored_path": f"/storage/documents/{os.path.basename(f.stored_path)}",
                "file_type": f.file_type,
                "file_size": f.file_size,
                "uploaded_at": f.uploaded_at,
            }
            for f in doc.files
        ],
    )


def _log_status(db: Session, document_id: int, from_status, to_status, user_id: int, note=None):
    db.add(DocumentStatusLog(
        document_id=document_id,
        from_status=from_status,
        to_status=to_status,
        changed_by=user_id,
        note=note,
    ))


def _to_doc_upload_out(doc: Document, auto_assignment: AutoAssignmentResult) -> DocumentUploadOut:
    base = _to_doc_out(doc)
    return DocumentUploadOut(**base.model_dump(), auto_assignment=auto_assignment)


def _auto_assign(
    db: Session,
    doc: Document,
    ocr_text: str,
    title: str,
    document_type: str,
    current_user: User,
) -> AutoAssignmentResult:
    suggestion = suggest_department(db, text=ocr_text or "", title=title, document_type=document_type)

    if suggestion.suggested_department_id:
        # Guard against duplicate active task for the same document + department
        existing = db.query(DocumentTask).filter(
            DocumentTask.document_id == doc.id,
            DocumentTask.assigned_department_id == suggestion.suggested_department_id,
            DocumentTask.status.notin_(TaskStatus.TERMINAL),
        ).first()

        if not existing:
            task = DocumentTask(
                document_id=doc.id,
                assigned_department_id=suggestion.suggested_department_id,
                assigned_by=current_user.id,
                task_title=f"พิจารณาเอกสาร: {doc.title}",
                task_detail=f"มอบหมายโดยระบบอัตโนมัติ - {suggestion.reason}",
                status=TaskStatus.ASSIGNED,
            )
            db.add(task)
            db.flush()
            db.add(TaskStatusLog(
                task_id=task.id,
                from_status=None,
                to_status=TaskStatus.ASSIGNED,
                changed_by=current_user.id,
                note="มอบหมายงานโดยระบบอัตโนมัติ",
            ))

        old_status = doc.status
        doc.status = DocumentStatus.ASSIGNED
        doc.updated_at = datetime.utcnow()
        _log_status(
            db, doc.id, old_status, DocumentStatus.ASSIGNED, current_user.id,
            f"ระบบมอบหมายอัตโนมัติ: {suggestion.reason}",
        )
        return AutoAssignmentResult(
            assigned=True,
            department_id=suggestion.suggested_department_id,
            department_name=suggestion.department_name,
            confidence=suggestion.confidence,
            matched_keywords=suggestion.matched_keywords,
            reason=suggestion.reason,
            fallback_to_chief=False,
        )

    # No routing match — forward to chief for review
    old_status = doc.status
    doc.status = DocumentStatus.WAIT_CHIEF_REVIEW
    doc.updated_at = datetime.utcnow()
    _log_status(
        db, doc.id, old_status, DocumentStatus.WAIT_CHIEF_REVIEW, current_user.id,
        "ระบบไม่พบกฎ Routing ที่ตรงกัน — ส่งให้ผู้อำนวยการพิจารณา",
    )
    return AutoAssignmentResult(
        assigned=False,
        reason=suggestion.reason or "ไม่พบกฎ Routing ที่ตรงกัน",
        fallback_to_chief=True,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=DocumentUploadOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    incoming_no: Optional[str] = Form(None),
    sender: Optional[str] = Form(None),
    received_date: Optional[str] = Form(None),
    document_type: str = Form("OTHER"),
    priority: str = Form("NORMAL"),
    summary: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="อนุญาตเฉพาะไฟล์ PDF เท่านั้น")

    content = await file.read()
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="ไฟล์ที่อัปโหลดไม่ใช่ PDF จริง")

    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(settings.STORAGE_PATH, stored_name)
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    with open(stored_path, "wb") as fp:
        fp.write(content)

    recv_dt = None
    if received_date:
        try:
            recv_dt = datetime.fromisoformat(received_date)
        except ValueError:
            pass

    ocr_text = extract_text_from_pdf(stored_path)

    doc = Document(
        document_no=_doc_no(db),
        incoming_no=incoming_no,
        title=title,
        sender=sender,
        received_date=recv_dt or datetime.utcnow(),
        document_type=document_type,
        priority=priority,
        status=DocumentStatus.RECEIVED,
        ocr_text=ocr_text,
        summary=summary,
        created_by=current_user.id,
        current_owner_id=current_user.id,
    )
    db.add(doc)
    db.flush()

    db.add(DocumentFile(
        document_id=doc.id,
        original_filename=file.filename,
        stored_path=stored_path,
        file_type="pdf",
        file_size=len(content),
        uploaded_by=current_user.id,
    ))
    _log_status(db, doc.id, None, DocumentStatus.RECEIVED, current_user.id, "อัปโหลดเอกสารใหม่")

    auto_result = _auto_assign(db, doc, ocr_text, title, document_type, current_user)

    db.commit()

    return _to_doc_upload_out(_load_doc(db, doc.id), auto_result)


@router.get("", response_model=DocumentListOut)
def list_documents(
    status: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Document).options(
        joinedload(Document.creator),
        joinedload(Document.current_owner),
        joinedload(Document.files),
    )

    if status:
        q = q.filter(Document.status == status)
    if priority:
        q = q.filter(Document.priority == priority)
    if document_type:
        q = q.filter(Document.document_type == document_type)
    if search:
        like = f"%{search}%"
        q = q.filter(
            or_(
                Document.title.ilike(like),
                Document.document_no.ilike(like),
                Document.sender.ilike(like),
            )
        )
    if department_id:
        q = (
            q.join(DocumentTask, DocumentTask.document_id == Document.id)
            .filter(DocumentTask.assigned_department_id == department_id)
            .distinct()
        )

    total = q.count()
    docs = q.order_by(Document.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return DocumentListOut(
        items=[_to_doc_out(d) for d in docs],
        total=total,
        page=page,
        limit=limit,
    )


@router.get("/{doc_id}", response_model=DocumentDetailOut)
def get_document(doc_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = (
        db.query(Document)
        .options(
            joinedload(Document.creator),
            joinedload(Document.current_owner),
            joinedload(Document.files),
            joinedload(Document.tasks).joinedload(DocumentTask.assigned_department),
            joinedload(Document.tasks).joinedload(DocumentTask.assigned_user),
            joinedload(Document.tasks).joinedload(DocumentTask.assigner),
            joinedload(Document.status_logs).joinedload(DocumentStatusLog.changed_by_user),
        )
        .filter(Document.id == doc_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")

    base = _to_doc_out(doc)
    tasks_out = [
        {
            "id": t.id,
            "task_title": t.task_title,
            "task_detail": t.task_detail,
            "status": t.status,
            "department_name": t.assigned_department.name if t.assigned_department else None,
            "assigned_user_name": t.assigned_user.full_name if t.assigned_user else None,
            "due_date": t.due_date,
            "completed_at": t.completed_at,
            "completion_note": t.completion_note,
            "created_at": t.created_at,
        }
        for t in doc.tasks
    ]

    status_logs_out = [
        DocumentStatusLogOut(
            id=sl.id,
            from_status=sl.from_status,
            to_status=sl.to_status,
            note=sl.note,
            created_at=sl.created_at,
            changed_by_name=sl.changed_by_user.full_name if sl.changed_by_user else None,
        )
        for sl in doc.status_logs
    ]

    return DocumentDetailOut(**base.model_dump(), tasks=tasks_out, status_logs=status_logs_out)


@router.patch("/{doc_id}", response_model=DocumentOut)
def update_document(
    doc_id: int,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")

    role = get_user_role(current_user)
    if role not in ("admin", "chief", "admin_staff"):
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์แก้ไขเอกสาร")

    update_data = payload.model_dump(exclude_none=True)
    old_status = doc.status
    for key, value in update_data.items():
        setattr(doc, key, value)

    if "status" in update_data and update_data["status"] != old_status:
        _log_status(db, doc.id, old_status, update_data["status"], current_user.id)

    doc.updated_at = datetime.utcnow()
    db.commit()
    return _to_doc_out(_load_doc(db, doc_id))


@router.post("/{doc_id}/submit-review", response_model=DocumentOut)
def submit_for_review(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    if doc.status != DocumentStatus.RECEIVED:
        raise HTTPException(status_code=400, detail=f"ไม่สามารถส่งรีวิวได้ สถานะปัจจุบัน: {doc.status}")

    old_status = doc.status
    doc.status = DocumentStatus.WAIT_CHIEF_REVIEW
    doc.updated_at = datetime.utcnow()
    _log_status(db, doc.id, old_status, DocumentStatus.WAIT_CHIEF_REVIEW, current_user.id, "ส่งให้ผู้อำนวยการพิจารณา")
    db.commit()
    return _to_doc_out(_load_doc(db, doc_id))


@router.post("/{doc_id}/assign", response_model=DocumentOut)
def assign_document(
    doc_id: int,
    payload: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = get_user_role(current_user)
    if role not in ("admin", "chief"):
        raise HTTPException(status_code=403, detail="เฉพาะ Chief หรือ Admin เท่านั้น")

    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    if not payload.assignments:
        raise HTTPException(status_code=400, detail="ต้องระบุหน่วยงานอย่างน้อย 1 หน่วยงาน")

    old_status = doc.status
    for item in payload.assignments:
        task = DocumentTask(
            document_id=doc.id,
            assigned_department_id=item.department_id,
            assigned_to_user_id=item.assigned_to_user_id,
            assigned_by=current_user.id,
            task_title=item.task_title,
            task_detail=item.task_detail,
            status=TaskStatus.ASSIGNED,
            due_date=item.due_date,
        )
        db.add(task)
        db.flush()
        db.add(TaskStatusLog(
            task_id=task.id,
            from_status=None,
            to_status=TaskStatus.ASSIGNED,
            changed_by=current_user.id,
            note=f"มอบหมายงานโดย {current_user.full_name}",
        ))

    doc.status = DocumentStatus.ASSIGNED
    doc.updated_at = datetime.utcnow()
    _log_status(db, doc.id, old_status, DocumentStatus.ASSIGNED, current_user.id, payload.note)
    db.commit()
    return _to_doc_out(_load_doc(db, doc_id))


@router.post("/{doc_id}/close", response_model=DocumentOut)
def close_document(
    doc_id: int,
    payload: CloseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = get_user_role(current_user)
    if role not in ("admin", "admin_staff"):
        raise HTTPException(status_code=403, detail="เฉพาะ Admin หรือ Admin Staff เท่านั้น")

    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")
    if doc.status not in (
        DocumentStatus.RETURNED_TO_ADMIN,
        DocumentStatus.DONE_BY_SECTION,
        DocumentStatus.ASSIGNED,
    ):
        raise HTTPException(status_code=400, detail=f"ไม่สามารถปิดเรื่องได้ สถานะปัจจุบัน: {doc.status}")

    old_status = doc.status
    doc.status = DocumentStatus.CLOSED
    doc.updated_at = datetime.utcnow()
    _log_status(db, doc.id, old_status, DocumentStatus.CLOSED, current_user.id, payload.closing_note)
    db.commit()
    return _to_doc_out(_load_doc(db, doc_id))


@router.get("/{doc_id}/timeline", response_model=List[TimelineEntry])
def get_timeline(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(Document).filter(Document.id == doc_id).first():
        raise HTTPException(status_code=404, detail="ไม่พบเอกสาร")

    entries: List[TimelineEntry] = []

    # Document status logs — eager-load changer
    status_logs = (
        db.query(DocumentStatusLog)
        .options(joinedload(DocumentStatusLog.changed_by_user))
        .filter(DocumentStatusLog.document_id == doc_id)
        .order_by(DocumentStatusLog.created_at)
        .all()
    )
    for sl in status_logs:
        entries.append(TimelineEntry(
            event_type="status_change",
            timestamp=sl.created_at,
            description=f"สถานะเปลี่ยน: {sl.from_status or 'เริ่มต้น'} → {sl.to_status}",
            actor=sl.changed_by_user.full_name if sl.changed_by_user else None,
            note=sl.note,
        ))

    # Tasks — eager-load related objects and their status logs
    tasks = (
        db.query(DocumentTask)
        .options(
            joinedload(DocumentTask.assigned_department),
            joinedload(DocumentTask.assigner),
            joinedload(DocumentTask.status_logs).joinedload(TaskStatusLog.changed_by_user),
        )
        .filter(DocumentTask.document_id == doc_id)
        .all()
    )
    for task in tasks:
        entries.append(TimelineEntry(
            event_type="task_created",
            timestamp=task.created_at,
            description=f"สร้างงาน: {task.task_title} → {task.assigned_department.name if task.assigned_department else ''}",
            actor=task.assigner.full_name if task.assigner else None,
        ))
        for tsl in task.status_logs:
            entries.append(TimelineEntry(
                event_type="task_status",
                timestamp=tsl.created_at,
                description=f"งาน '{task.task_title}': {tsl.from_status or '-'} → {tsl.to_status}",
                actor=tsl.changed_by_user.full_name if tsl.changed_by_user else None,
                note=tsl.note,
            ))

    entries.sort(key=lambda e: e.timestamp)
    return entries
