from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str
    department_id: Optional[int] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    department_id: Optional[int] = None
    department: Optional[DepartmentOut] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserListOut(BaseModel):
    items: List[UserOut]
    total: int
