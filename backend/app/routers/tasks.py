from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_

from app.database import get_db
from app.models.user import User
from app.models.task import DocumentTask, TaskStatusLog, TaskStatus
from app.models.document import Document, DocumentStatusLog, DocumentStatus
from app.core.dependencies import get_current_user, get_user_role
from app.schemas.task import TaskOut, TaskDetailOut, TaskListOut, TaskStatusUpdate, TaskComplete, TaskAssignUser

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _is_overdue(task: DocumentTask) -> bool:
    return (
        task.due_date is not None
        and task.status not in TaskStatus.TERMINAL
        and task.due_date < datetime.utcnow()
    )


def _to_task_out(task: DocumentTask) -> TaskOut:
    return TaskOut(
        id=task.id,
        document_id=task.document_id,
        document_no=task.document.document_no if task.document else None,
        document_title=task.document.title if task.document else None,
        assigned_department_id=task.assigned_department_id,
        department_name=task.assigned_department.name if task.assigned_department else None,
        assigned_to_user_id=task.assigned_to_user_id,
        assigned_user_name=task.assigned_user.full_name if task.assigned_user else None,
        assigned_by=task.assigned_by,
        assigner_name=task.assigner.full_name if task.assigner else None,
        task_title=task.task_title,
        task_detail=task.task_detail,
        status=task.status,
        due_date=task.due_date,
        completed_at=task.completed_at,
        completion_note=task.completion_note,
        is_overdue=_is_overdue(task),
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _base_query(db: Session):
    return db.query(DocumentTask).options(
        joinedload(DocumentTask.document),
        joinedload(DocumentTask.assigned_department),
        joinedload(DocumentTask.assigned_user),
        joinedload(DocumentTask.assigner),
    )


# ---------------------------------------------------------------------------
# List all tasks (admin / chief / dept filtered)
# ---------------------------------------------------------------------------

@router.get("", response_model=TaskListOut)
def list_tasks(
    status: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    overdue: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = get_user_role(current_user)
    q = _base_query(db)

    if status:
        q = q.filter(DocumentTask.status == status)
    if department_id:
        q = q.filter(DocumentTask.assigned_department_id == department_id)

    # Non-admin/chief users can only see their department's tasks
    if role in ("staff", "department_head"):
        if current_user.department_id:
            q = q.filter(DocumentTask.assigned_department_id == current_user.department_id)

    total = q.count()
    tasks = q.order_by(DocumentTask.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    items = [_to_task_out(t) for t in tasks]
    if overdue is not None:
        items = [t for t in items if t.is_overdue == overdue]

    return TaskListOut(items=items, total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# My tasks — role-aware
# ---------------------------------------------------------------------------

@router.get("/my", response_model=TaskListOut)
def my_tasks(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = get_user_role(current_user)

    if role in ("admin", "chief"):
        # admin / chief — see all tasks
        q = _base_query(db)

    elif role == "department_head":
        # department_head sees:
        #   (a) tasks directly assigned to them personally
        #   (b) dept-level tasks with no individual assigned yet (งานรอมอบหมายในแผนก)
        conditions = [DocumentTask.assigned_to_user_id == current_user.id]
        if current_user.department_id:
            conditions.append(
                and_(
                    DocumentTask.assigned_department_id == current_user.department_id,
                    DocumentTask.assigned_to_user_id == None,
                )
            )
        q = _base_query(db).filter(or_(*conditions))

    else:
        # staff — only tasks explicitly assigned to this user (งานที่มอบหมายให้ฉัน)
        q = _base_query(db).filter(DocumentTask.assigned_to_user_id == current_user.id)

    if status:
        q = q.filter(DocumentTask.status == status)

    total = q.count()
    tasks = q.order_by(DocumentTask.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return TaskListOut(items=[_to_task_out(t) for t in tasks], total=total, page=page, limit=limit)


# ---------------------------------------------------------------------------
# Get single task
# ---------------------------------------------------------------------------

@router.get("/{task_id}", response_model=TaskDetailOut)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = _base_query(db).options(
        joinedload(DocumentTask.status_logs).joinedload(TaskStatusLog.changed_by_user)
    ).filter(DocumentTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบงาน")

    base = _to_task_out(task)
    logs_out = [
        {
            "id": sl.id,
            "from_status": sl.from_status,
            "to_status": sl.to_status,
            "note": sl.note,
            "created_at": sl.created_at,
            "changed_by_name": sl.changed_by_user.full_name if sl.changed_by_user else None,
        }
        for sl in task.status_logs
    ]
    return TaskDetailOut(**base.model_dump(), status_logs=logs_out)


# ---------------------------------------------------------------------------
# Update task status
# ---------------------------------------------------------------------------

@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _base_query(db).filter(DocumentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบงาน")

    if payload.status not in TaskStatus.ALL:
        raise HTTPException(status_code=400, detail=f"สถานะไม่ถูกต้อง: {payload.status}")

    role = get_user_role(current_user)
    if role == "staff":
        allowed = [TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS]
        if payload.status not in allowed:
            raise HTTPException(status_code=403, detail="Staff สามารถเปลี่ยนเป็น ACCEPTED หรือ IN_PROGRESS เท่านั้น")

    old_status = task.status
    task.status = payload.status
    task.updated_at = datetime.utcnow()

    db.add(TaskStatusLog(
        task_id=task.id,
        from_status=old_status,
        to_status=payload.status,
        changed_by=current_user.id,
        note=payload.note,
    ))

    db.flush()
    _check_document_completion(db, task.document_id, current_user.id)
    db.commit()
    return _to_task_out(_base_query(db).filter(DocumentTask.id == task_id).first())


# ---------------------------------------------------------------------------
# Complete task
# ---------------------------------------------------------------------------

@router.post("/{task_id}/complete", response_model=TaskOut)
def complete_task(
    task_id: int,
    payload: TaskComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _base_query(db).filter(DocumentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบงาน")

    if task.status == TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="งานนี้เสร็จสิ้นแล้ว")

    old_status = task.status
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
    task.completion_note = payload.completion_note
    task.updated_at = datetime.utcnow()

    db.add(TaskStatusLog(
        task_id=task.id,
        from_status=old_status,
        to_status=TaskStatus.COMPLETED,
        changed_by=current_user.id,
        note=payload.completion_note,
    ))

    db.flush()
    _check_document_completion(db, task.document_id, current_user.id)
    db.commit()
    db.refresh(task)
    return _to_task_out(task)


# ---------------------------------------------------------------------------
# Sub-assign task to a specific user within the department
# ---------------------------------------------------------------------------

@router.patch("/{task_id}/assign-user", response_model=TaskOut)
def assign_task_to_user(
    task_id: int,
    payload: TaskAssignUser,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sub-assign a department-level task to a specific user within that department.
    Allowed for: admin, chief, department_head of the same department.
    """
    task = _base_query(db).filter(DocumentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบงาน")

    role = get_user_role(current_user)

    if role not in ("admin", "chief"):
        if role == "department_head":
            if current_user.department_id != task.assigned_department_id:
                raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์มอบหมายงานข้ามหน่วยงาน")
        else:
            raise HTTPException(status_code=403, detail="เฉพาะ Admin, Chief หรือหัวหน้าหน่วยงานเท่านั้น")

    from app.models.user import User as UserModel
    target_user = db.query(UserModel).filter(
        UserModel.id == payload.user_id,
        UserModel.is_active == True,
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้งาน")
    if target_user.department_id != task.assigned_department_id:
        raise HTTPException(status_code=400, detail="ผู้ใช้งานไม่ได้อยู่ในหน่วยงานที่รับผิดชอบงานนี้")

    if task.status in TaskStatus.TERMINAL:
        raise HTTPException(status_code=400, detail="ไม่สามารถมอบหมายงานที่เสร็จสิ้นแล้ว")

    prev_user_id = task.assigned_to_user_id
    prev_user_name = task.assigned_user.full_name if task.assigned_user else "ไม่ระบุ"

    task.assigned_to_user_id = payload.user_id
    task.updated_at = datetime.utcnow()

    note = payload.note or f"มอบหมายให้ {target_user.full_name} โดย {current_user.full_name}"
    if prev_user_id:
        note = f"โอนจาก {prev_user_name} → {target_user.full_name} โดย {current_user.full_name}"
        if payload.note:
            note += f" ({payload.note})"

    db.add(TaskStatusLog(
        task_id=task.id,
        from_status=task.status,
        to_status=task.status,
        changed_by=current_user.id,
        note=note,
    ))

    db.commit()
    return _to_task_out(_base_query(db).filter(DocumentTask.id == task_id).first())


# ---------------------------------------------------------------------------
# Internal: auto-close document when all tasks are done
# ---------------------------------------------------------------------------

def _check_document_completion(db: Session, document_id: int, user_id: int):
    """If all active tasks for the document are completed, advance document status."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return

    all_tasks = db.query(DocumentTask).filter(DocumentTask.document_id == document_id).all()
    if not all_tasks:
        return

    active = [t for t in all_tasks if t.status not in TaskStatus.TERMINAL]
    if not active:
        old_status = doc.status
        if doc.status not in (DocumentStatus.DONE_BY_SECTION, DocumentStatus.RETURNED_TO_ADMIN, DocumentStatus.CLOSED):
            doc.status = DocumentStatus.RETURNED_TO_ADMIN
            doc.updated_at = datetime.utcnow()
            db.add(DocumentStatusLog(
                document_id=doc.id,
                from_status=old_status,
                to_status=DocumentStatus.RETURNED_TO_ADMIN,
                changed_by=user_id,
                note="งานทั้งหมดเสร็จสิ้น ส่งคืนธุรการ",
            ))
