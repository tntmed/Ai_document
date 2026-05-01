from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)

    users = relationship("User", back_populates="department", foreign_keys="User.department_id")


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # admin, chief, admin_staff, department_head, staff, viewer

    user_roles = relationship("UserRole", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    user_roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")

    # Documents created by this user
    created_documents = relationship(
        "Document", back_populates="creator", foreign_keys="Document.created_by"
    )
    # Documents currently owned by this user
    owned_documents = relationship(
        "Document", back_populates="current_owner", foreign_keys="Document.current_owner_id"
    )
    # Tasks assigned to this user
    assigned_tasks = relationship(
        "DocumentTask", back_populates="assigned_user", foreign_keys="DocumentTask.assigned_to_user_id"
    )
    # Tasks assigned by this user
    tasks_assigned_by = relationship(
        "DocumentTask", back_populates="assigner", foreign_keys="DocumentTask.assigned_by"
    )
    comments = relationship("Comment", back_populates="user")

    @property
    def role(self) -> str:
        """Primary role of the user."""
        if self.user_roles:
            return self.user_roles[0].role.name
        return "viewer"

    @property
    def role_names(self) -> list:
        return [ur.role.name for ur in self.user_roles]


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")
