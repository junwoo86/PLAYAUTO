from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "playauto_platform"}

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default='pending')
    group_id = Column(Integer, ForeignKey('playauto_platform.groups.id'))
    last_login = Column(DateTime)
    created_by = Column(String(255))
    updated_by = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    group = relationship("Group", back_populates="users")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class Group(Base):
    __tablename__ = "groups"
    __table_args__ = {"schema": "playauto_platform"}

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String)
    created_by = Column(String(255))
    updated_by = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    users = relationship("User", back_populates="group")
    group_permissions = relationship("GroupPermission", back_populates="group", cascade="all, delete-orphan")
    notification_settings = relationship("NotificationSetting", back_populates="group", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = {"schema": "playauto_platform"}

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    group_permissions = relationship("GroupPermission", back_populates="permission")


class GroupPermission(Base):
    __tablename__ = "group_permissions"
    __table_args__ = {"schema": "playauto_platform"}

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey('playauto_platform.groups.id'), nullable=False)
    permission_id = Column(Integer, ForeignKey('playauto_platform.permissions.id'), nullable=False)
    created_by = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    group = relationship("Group", back_populates="group_permissions")
    permission = relationship("Permission", back_populates="group_permissions")


class NotificationSetting(Base):
    __tablename__ = "notification_settings"
    __table_args__ = {"schema": "playauto_platform"}

    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey('playauto_platform.groups.id'), nullable=False)
    notification_type = Column(String(50), nullable=False)
    is_enabled = Column(Boolean, default=True)
    updated_by = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    group = relationship("Group", back_populates="notification_settings")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "playauto_platform"}

    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey('playauto_platform.users.id'), nullable=False)
    token = Column(String(500), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")