from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RoutingRuleCreate(BaseModel):
    keyword: str
    target_department_id: int
    document_type: Optional[str] = None
    priority: int = 0
    is_active: bool = True


class RoutingRuleUpdate(BaseModel):
    keyword: Optional[str] = None
    target_department_id: Optional[int] = None
    document_type: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class RoutingRuleOut(BaseModel):
    id: int
    keyword: str
    target_department_id: int
    department_name: Optional[str] = None
    document_type: Optional[str] = None
    priority: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RoutingSuggestRequest(BaseModel):
    document_id: Optional[int] = None
    text: Optional[str] = None
    title: Optional[str] = None


class RoutingSuggestion(BaseModel):
    suggested_department_id: Optional[int] = None
    department_name: Optional[str] = None
    matched_keywords: List[str] = []
    confidence: float = 0.0
    reason: str = ""


class RoutingFeedbackCreate(BaseModel):
    document_id: int
    system_suggested_department_id: Optional[int] = None
    chief_selected_department_id: int
    feedback_note: Optional[str] = None
