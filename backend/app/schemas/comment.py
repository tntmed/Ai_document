from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CommentCreate(BaseModel):
    document_id: Optional[int] = None
    task_id: Optional[int] = None
    comment_text: str


class CommentOut(BaseModel):
    id: int
    document_id: Optional[int] = None
    task_id: Optional[int] = None
    user_id: int
    user_full_name: Optional[str] = None
    comment_text: str
    created_at: datetime

    class Config:
        from_attributes = True


class CommentListOut(BaseModel):
    items: List[CommentOut]
    total: int
