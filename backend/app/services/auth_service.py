from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import Optional
import uuid

from app.models.user import User, Group, Permission, GroupPermission, RefreshToken
from app.schemas.auth import UserCreate, LoginRequest
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)


class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """사용자 인증"""
        user = db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None

        # 마지막 로그인 시간 업데이트
        user.last_login = datetime.utcnow()
        db.commit()

        return user

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """새 사용자 생성 (회원가입)"""
        # 이메일 중복 체크
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise ValueError("이미 등록된 이메일입니다.")

        # 사용자 생성 (pending 상태로)
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            name=user_data.name,
            status='pending',
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """이메일로 사용자 조회"""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """ID로 사용자 조회"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_permissions(db: Session, user: User) -> list[str]:
        """사용자의 권한 목록 조회"""
        if not user.group_id:
            return []

        permissions = db.query(Permission.code).join(
            GroupPermission,
            Permission.id == GroupPermission.permission_id
        ).filter(
            GroupPermission.group_id == user.group_id
        ).all()

        return [p[0] for p in permissions]

    @staticmethod
    def create_tokens(user: User) -> dict:
        """액세스 토큰과 리프레시 토큰 생성"""
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id}
        )
        refresh_token = create_refresh_token(
            data={"sub": user.email, "user_id": user.id}
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    @staticmethod
    def save_refresh_token(db: Session, user_id: int, token: str) -> RefreshToken:
        """리프레시 토큰 저장"""
        # 기존 토큰 무효화
        db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": datetime.utcnow()})

        # 새 토큰 저장
        expires_at = datetime.utcnow() + timedelta(days=7)
        refresh_token = RefreshToken(
            id=str(uuid.uuid4()),
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            created_at=datetime.utcnow()
        )

        db.add(refresh_token)
        db.commit()

        return refresh_token

    @staticmethod
    def validate_refresh_token(db: Session, token: str) -> Optional[User]:
        """리프레시 토큰 검증"""
        # 토큰 디코딩
        payload = decode_token(token)
        if not payload or payload.get("type") != "refresh":
            return None

        # DB에서 토큰 확인
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == token,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.utcnow()
        ).first()

        if not refresh_token:
            return None

        # 사용자 조회
        user = db.query(User).filter(User.id == refresh_token.user_id).first()
        return user

    @staticmethod
    def revoke_refresh_token(db: Session, token: str) -> bool:
        """리프레시 토큰 무효화"""
        result = db.query(RefreshToken).filter(
            RefreshToken.token == token,
            RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": datetime.utcnow()})

        db.commit()
        return result > 0

    @staticmethod
    def update_user_status(db: Session, user_id: int, status: str, updated_by: str) -> User:
        """사용자 상태 변경"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("사용자를 찾을 수 없습니다.")

        user.status = status
        user.updated_by = updated_by
        user.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def update_user_group(db: Session, user_id: int, group_id: int, updated_by: str) -> User:
        """사용자 그룹 변경"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("사용자를 찾을 수 없습니다.")

        # 그룹 존재 확인
        group = db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise ValueError("그룹을 찾을 수 없습니다.")

        user.group_id = group_id
        user.updated_by = updated_by
        user.updated_at = datetime.utcnow()

        # pending 상태인 경우 active로 변경
        if user.status == 'pending':
            user.status = 'active'

        db.commit()
        db.refresh(user)

        return user