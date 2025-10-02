from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional['UserResponse'] = None


class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None


class GroupResponse(GroupBase):
    id: int
    permissions: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr
    name: str
    status: str = 'pending'


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserResponse(UserBase):
    id: int
    group: Optional[GroupResponse] = None
    last_login: Optional[datetime] = None
    created_at: datetime
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class UserStatusUpdate(BaseModel):
    status: str  # 'pending', 'active', 'inactive'


class UserGroupUpdate(BaseModel):
    group_id: int


class PermissionResponse(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True