from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from app.database import get_db
from app.models.user import User, Role, UserRole, Department
from app.core.dependencies import get_current_user, require_admin, get_user_role
from app.core.security import hash_password
from app.schemas.user import UserCreate, UserUpdate, UserOut, UserListOut, DepartmentOut

router = APIRouter(prefix="/users", tags=["users"])

VALID_ROLES = {"admin", "chief", "admin_staff", "department_head", "staff", "viewer"}


def _get_or_create_role(db: Session, role_name: str) -> Role:
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name)
        db.add(role)
        db.flush()
    return role


def _to_out(user: User) -> UserOut:
    role = user.role
    dept = DepartmentOut(id=user.department.id, name=user.department.name, code=user.department.code) \
           if user.department else None
    return UserOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        display_name=user.display_name,
        role=role,
        department_id=user.department_id,
        department=dept,
        is_active=user.is_active,
        employee_code=user.employee_code,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
        position=user.position,
        sub_department=user.sub_department,
        is_force_password_change=user.is_force_password_change,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _load_user(db: Session, user_id: int) -> User:
    return db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role),
        joinedload(User.department),
    ).filter(User.id == user_id).first()


@router.get("", response_model=UserListOut)
def list_users(
    role: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caller_role = get_user_role(current_user)
    if caller_role not in ("admin", "chief"):
        raise HTTPException(status_code=403, detail="ต้องการสิทธิ์ Admin หรือ Chief")

    q = db.query(User).options(
        joinedload(User.user_roles).joinedload(UserRole.role),
        joinedload(User.department),
    )
    if department_id:
        q = q.filter(User.department_id == department_id)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)

    total = q.count()
    users = q.order_by(User.full_name).offset((page - 1) * limit).limit(limit).all()

    items = [_to_out(u) for u in users]
    if role:
        items = [u for u in items if u.role == role]

    return UserListOut(items=items, total=total)


@router.get("/departments/members", response_model=UserListOut)
def department_members(
    department_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return active members of a given department.
    department_head may only query their own department.
    admin/chief can query any department.
    """
    caller_role = get_user_role(current_user)
    if caller_role not in ("admin", "chief"):
        if caller_role == "department_head":
            if current_user.department_id != department_id:
                raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ดูสมาชิกของหน่วยงานอื่น")
        else:
            raise HTTPException(status_code=403, detail="ต้องการสิทธิ์ Admin, Chief หรือหัวหน้าหน่วยงาน")

    users = (
        db.query(User)
        .options(joinedload(User.user_roles).joinedload(UserRole.role), joinedload(User.department))
        .filter(User.department_id == department_id, User.is_active == True)
        .order_by(User.full_name)
        .all()
    )
    return UserListOut(items=[_to_out(u) for u in users], total=len(users))


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    depts = db.query(Department).order_by(Department.name).all()
    return [DepartmentOut(id=d.id, name=d.name, code=d.code) for d in depts]


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Role ไม่ถูกต้อง: {payload.role}")

    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username นี้ถูกใช้งานแล้ว")

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        department_id=payload.department_id,
        employee_code=payload.employee_code,
        first_name=payload.first_name,
        last_name=payload.last_name,
        display_name=payload.display_name,
        email=payload.email,
        phone=payload.phone,
        position=payload.position,
        sub_department=payload.sub_department,
        is_force_password_change=payload.is_force_password_change,
    )
    db.add(user)
    db.flush()

    role_obj = _get_or_create_role(db, payload.role)
    db.add(UserRole(user_id=user.id, role_id=role_obj.id))
    db.commit()

    return _to_out(_load_user(db, user.id))


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    caller_role = get_user_role(current_user)
    if caller_role not in ("admin", "chief") and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์")

    user = _load_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")
    return _to_out(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = _load_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")

    # Core fields
    if payload.full_name      is not None: user.full_name      = payload.full_name
    if payload.department_id  is not None: user.department_id  = payload.department_id
    if payload.is_active      is not None: user.is_active      = payload.is_active
    if payload.password:                   user.password_hash  = hash_password(payload.password)

    # Enterprise profile fields
    if payload.employee_code  is not None: user.employee_code  = payload.employee_code
    if payload.first_name     is not None: user.first_name     = payload.first_name
    if payload.last_name      is not None: user.last_name      = payload.last_name
    if payload.display_name   is not None: user.display_name   = payload.display_name
    if payload.email          is not None: user.email          = payload.email
    if payload.phone          is not None: user.phone          = payload.phone
    if payload.position       is not None: user.position       = payload.position
    if payload.sub_department is not None: user.sub_department = payload.sub_department
    if payload.is_force_password_change is not None:
        user.is_force_password_change = payload.is_force_password_change

    if payload.role:
        if payload.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Role ไม่ถูกต้อง: {payload.role}")
        # Replace existing roles
        db.query(UserRole).filter(UserRole.user_id == user_id).delete()
        role_obj = _get_or_create_role(db, payload.role)
        db.add(UserRole(user_id=user_id, role_id=role_obj.id))

    db.commit()
    return _to_out(_load_user(db, user_id))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="ไม่สามารถลบตัวเองได้")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")

    user.is_active = False
    db.commit()
