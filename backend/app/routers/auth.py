from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models.user import User, UserRole
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user, get_user_role
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_to_info(user: User, role: str) -> UserInfo:
    return UserInfo(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=role,
        department_id=user.department_id,
        department_name=user.department.name if user.department else None,
        is_active=user.is_active,
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(
            joinedload(User.user_roles).joinedload(UserRole.role),
            joinedload(User.department),
        )
        .filter(User.username == payload.username, User.is_active == True)
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        )

    user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    role = get_user_role(user)
    return LoginResponse(access_token=token, user=_user_to_info(user, role))


@router.get("/me", response_model=UserInfo)
def me(current_user: User = Depends(get_current_user)):
    role = get_user_role(current_user)
    return _user_to_info(current_user, role)
