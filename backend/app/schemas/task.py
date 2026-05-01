from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaskStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


class TaskComplete(BaseModel):
    completion_note: Optional[str] = None


class TaskAssignUser(BaseModel):
    user_id: int
    note: Optional[str] = None


class TaskStatusLogOut(BaseModel):
    id: int
    from_status: Optional[str] = None
    to_status: str
    note: Optional[str] = None
    created_at: datetime
    changed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class TaskOut(BaseModel):
    id: int
    document_id: int
    document_no: Optional[str] = None
    document_title: Optional[str] = None
    assigned_department_id: int
    department_name: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    assigned_user_name: Optional[str] = None
    assigned_by: int
    assigner_name: Optional[str] = None
    task_title: str
    task_detail: Optional[str] = None
    status: str
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completion_note: Optional[str] = None
    is_overdue: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TaskDetailOut(TaskOut):
    status_logs: List[TaskStatusLogOut] = []


class TaskListOut(BaseModel):
    items: List[TaskOut]
    total: int
    page: int
    limit: int
