from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


# ── Create ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username:      str
    password:      str
    full_name:     str
    role:          str
    department_id: Optional[int] = None

    # Optional enterprise fields
    employee_code:  Optional[str] = None
    first_name:     Optional[str] = None
    last_name:      Optional[str] = None
    display_name:   Optional[str] = None
    email:          Optional[str] = None
    phone:          Optional[str] = None
    position:       Optional[str] = None
    sub_department: Optional[str] = None
    is_force_password_change: bool = True


# ── Update ─────────────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    full_name:      Optional[str]  = None
    role:           Optional[str]  = None
    department_id:  Optional[int]  = None
    is_active:      Optional[bool] = None
    password:       Optional[str]  = None

    # Enterprise profile fields
    employee_code:  Optional[str]  = None
    first_name:     Optional[str]  = None
    last_name:      Optional[str]  = None
    display_name:   Optional[str]  = None
    email:          Optional[str]  = None
    phone:          Optional[str]  = None
    position:       Optional[str]  = None
    sub_department: Optional[str]  = None
    is_force_password_change: Optional[bool] = None


# ── Out ────────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id:            int
    username:      str
    full_name:     str
    display_name:  Optional[str] = None   # frontend: use display_name ?? full_name
    role:          str
    department_id: Optional[int]        = None
    department:    Optional[DepartmentOut] = None
    is_active:     bool

    # Enterprise profile
    employee_code:  Optional[str] = None
    first_name:     Optional[str] = None
    last_name:      Optional[str] = None
    email:          Optional[str] = None
    phone:          Optional[str] = None
    position:       Optional[str] = None
    sub_department: Optional[str] = None
    is_force_password_change: bool = False

    # Timestamps
    last_login_at: Optional[datetime] = None
    created_at:    datetime
    updated_at:    Optional[datetime] = None

    class Config:
        from_attributes = True


class UserListOut(BaseModel):
    items: List[UserOut]
    total: int
