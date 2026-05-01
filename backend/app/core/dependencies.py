from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole, Role

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = (
        db.query(User)
        .options(
            joinedload(User.user_roles).joinedload(UserRole.role),
            joinedload(User.department),
        )
        .filter(User.id == int(user_id), User.is_active == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def get_user_role(user: User) -> str:
    """Return the primary role name of the user."""
    if user.user_roles:
        return user.user_roles[0].role.name
    return "viewer"


def require_roles(*allowed_roles: str):
    """Dependency factory that checks user has one of the allowed roles."""
    def checker(current_user: User = Depends(get_current_user)) -> User:
        role = get_user_role(current_user)
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}",
            )
        return current_user
    return checker


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    role = get_user_role(current_user)
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def require_chief_or_admin(current_user: User = Depends(get_current_user)) -> User:
    role = get_user_role(current_user)
    if role not in ("admin", "chief"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chief or Admin access required")
    return current_user
