from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models.user import User, Department
from app.models.document import Document, DocumentStatus
from app.models.task import DocumentTask, TaskStatus
from app.core.dependencies import get_current_user
from app.schemas.dashboard import DashboardSummary, DepartmentStat, OverdueTask

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()

    status_counts = (
        db.query(Document.status, func.count(Document.id))
        .group_by(Document.status)
        .all()
    )
    by_status = {s: c for s, c in status_counts}
    total_docs = sum(by_status.values())
    pending_review = by_status.get(DocumentStatus.WAIT_CHIEF_REVIEW, 0)

    total_tasks = db.query(DocumentTask).count()
    active_tasks = db.query(DocumentTask).filter(
        DocumentTask.status.in_(TaskStatus.ACTIVE)
    ).count()
    overdue_count = db.query(DocumentTask).filter(
        DocumentTask.due_date < now,
        DocumentTask.status.notin_(TaskStatus.TERMINAL),
    ).count()

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    completed_today = db.query(DocumentTask).filter(
        DocumentTask.status == TaskStatus.COMPLETED,
        DocumentTask.completed_at >= today_start,
    ).count()

    return DashboardSummary(
        total_documents=total_docs,
        by_status=by_status,
        pending_chief_review=pending_review,
        total_tasks=total_tasks,
        active_tasks=active_tasks,
        overdue_tasks=overdue_count,
        completed_today=completed_today,
    )


@router.get("/by-department", response_model=list[DepartmentStat])
def by_department(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    departments = db.query(Department).all()
    result = []

    for dept in departments:
        tasks = db.query(DocumentTask).filter(
            DocumentTask.assigned_department_id == dept.id
        ).all()

        total = len(tasks)
        assigned_count = sum(1 for t in tasks if t.status == TaskStatus.ASSIGNED)
        in_progress = sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS)
        completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        overdue = sum(
            1 for t in tasks
            if t.due_date and t.due_date < now and t.status not in TaskStatus.TERMINAL
        )
        result.append(DepartmentStat(
            department_id=dept.id,
            department_name=dept.name,
            total_tasks=total,
            assigned=assigned_count,
            in_progress=in_progress,
            completed=completed,
            overdue=overdue,
        ))
    return result


@router.get("/overdue-tasks", response_model=list[OverdueTask])
def overdue_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    tasks = (
        db.query(DocumentTask)
        .options(
            joinedload(DocumentTask.document),
            joinedload(DocumentTask.assigned_department),
            joinedload(DocumentTask.assigned_user),
        )
        .filter(
            DocumentTask.due_date < now,
            DocumentTask.status.notin_(TaskStatus.TERMINAL),
        )
        .order_by(DocumentTask.due_date.asc())
        .limit(50)
        .all()
    )

    result = []
    for t in tasks:
        days_overdue = (now - t.due_date).days if t.due_date else 0
        result.append(OverdueTask(
            task_id=t.id,
            task_title=t.task_title,
            document_no=t.document.document_no if t.document else "",
            document_title=t.document.title if t.document else "",
            department_name=t.assigned_department.name if t.assigned_department else "",
            due_date=t.due_date.isoformat() if t.due_date else "",
            days_overdue=days_overdue,
            assigned_user=t.assigned_user.full_name if t.assigned_user else None,
        ))
    return result
