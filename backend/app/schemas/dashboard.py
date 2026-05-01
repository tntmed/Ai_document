from pydantic import BaseModel
from typing import Dict, List, Optional


class DashboardSummary(BaseModel):
    total_documents: int
    by_status: Dict[str, int]
    pending_chief_review: int
    total_tasks: int
    active_tasks: int
    overdue_tasks: int
    completed_today: int


class DepartmentStat(BaseModel):
    department_id: int
    department_name: str
    total_tasks: int
    assigned: int
    in_progress: int
    completed: int
    overdue: int


class OverdueTask(BaseModel):
    task_id: int
    task_title: str
    document_no: str
    document_title: str
    department_name: str
    due_date: str
    days_overdue: int
    assigned_user: Optional[str] = None
