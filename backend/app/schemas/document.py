from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DocumentFileOut(BaseModel):
    id: int
    original_filename: str
    stored_path: str
    file_type: str
    file_size: Optional[int] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentStatusLogOut(BaseModel):
    id: int
    from_status: Optional[str] = None
    to_status: str
    note: Optional[str] = None
    created_at: datetime
    changed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    title: str
    incoming_no: Optional[str] = None
    sender: Optional[str] = None
    received_date: Optional[datetime] = None
    document_type: str = "OTHER"
    priority: str = "NORMAL"
    summary: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    incoming_no: Optional[str] = None
    sender: Optional[str] = None
    received_date: Optional[datetime] = None
    document_type: Optional[str] = None
    priority: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None


class AssignmentItem(BaseModel):
    department_id: int
    task_title: str
    task_detail: Optional[str] = None
    due_date: Optional[datetime] = None
    assigned_to_user_id: Optional[int] = None


class AssignRequest(BaseModel):
    assignments: List[AssignmentItem]
    note: Optional[str] = None


class CloseRequest(BaseModel):
    closing_note: Optional[str] = None


class DocumentOut(BaseModel):
    id: int
    document_no: str
    incoming_no: Optional[str] = None
    title: str
    sender: Optional[str] = None
    received_date: Optional[datetime] = None
    document_type: str
    priority: str
    status: str
    current_owner_id: Optional[int] = None
    current_owner_name: Optional[str] = None
    ocr_text: Optional[str] = None
    summary: Optional[str] = None
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    files: List[DocumentFileOut] = []

    class Config:
        from_attributes = True


class DocumentDetailOut(DocumentOut):
    tasks: List = []
    status_logs: List[DocumentStatusLogOut] = []


class DocumentListOut(BaseModel):
    items: List[DocumentOut]
    total: int
    page: int
    limit: int


class TimelineEntry(BaseModel):
    event_type: str  # "status_change" | "task_created" | "task_status" | "comment"
    timestamp: datetime
    description: str
    actor: Optional[str] = None
    note: Optional[str] = None


class AutoAssignmentResult(BaseModel):
    assigned: bool
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    confidence: Optional[float] = None
    matched_keywords: List[str] = []
    reason: str = ""
    fallback_to_chief: bool = False


class DocumentUploadOut(DocumentOut):
    auto_assignment: Optional[AutoAssignmentResult] = None
