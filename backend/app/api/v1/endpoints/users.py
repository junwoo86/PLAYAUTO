from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.user import User, Group
from app.services.auth_service import AuthService
from app.schemas.auth import (
    UserResponse,
    UserUpdate,
    UserStatusUpdate,
    UserGroupUpdate
)
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


def check_admin_permission(current_user: User = Depends(get_current_user)):
    """관리자 권한 체크"""
    if current_user.group and current_user.group.name == '시스템 관리자':
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="관리자 권한이 필요합니다"
    )


@router.get("/", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """전체 사용자 목록 조회 (관리자 전용)"""
    users = db.query(User).all()

    user_responses = []
    for user in users:
        permissions = AuthService.get_user_permissions(db, user) if user.group else []

        user_response = UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            status=user.status,
            last_login=user.last_login,
            created_at=user.created_at,
            created_by=user.created_by
        )

        if user.group:
            from app.schemas.auth import GroupResponse
            user_response.group = GroupResponse(
                id=user.group.id,
                name=user.group.name,
                description=user.group.description,
                permissions=permissions,
                created_at=user.group.created_at
            )

        user_responses.append(user_response)

    return user_responses


@router.get("/pending", response_model=List[UserResponse])
def get_pending_users(
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """승인 대기 중인 사용자 목록 (관리자 전용)"""
    pending_users = db.query(User).filter(User.status == 'pending').all()

    user_responses = []
    for user in pending_users:
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            status=user.status,
            last_login=user.last_login,
            created_at=user.created_at,
            created_by=user.created_by
        )
        user_responses.append(user_response)

    return user_responses


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """특정 사용자 정보 조회 (관리자 전용)"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    permissions = AuthService.get_user_permissions(db, user) if user.group else []

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        status=user.status,
        last_login=user.last_login,
        created_at=user.created_at,
        created_by=user.created_by
    )

    if user.group:
        from app.schemas.auth import GroupResponse
        user_response.group = GroupResponse(
            id=user.group.id,
            name=user.group.name,
            description=user.group.description,
            permissions=permissions,
            created_at=user.group.created_at
        )

    return user_response


@router.put("/{user_id}")
def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """사용자 정보 업데이트 (관리자 전용)"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    # 업데이트할 필드만 변경
    if user_update.name is not None:
        user.name = user_update.name

    if user_update.email is not None:
        # 이메일 중복 체크
        existing_user = db.query(User).filter(
            User.email == user_update.email,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 사용 중인 이메일입니다"
            )
        user.email = user_update.email

    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "사용자 정보가 업데이트되었습니다",
        "user_id": user.id
    }


@router.put("/{user_id}/status")
def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """사용자 상태 변경 (관리자 전용)"""
    if status_update.status not in ['pending', 'active', 'inactive']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="유효하지 않은 상태입니다"
        )

    try:
        user = AuthService.update_user_status(
            db,
            user_id,
            status_update.status,
            current_user.email
        )
        return {
            "success": True,
            "message": f"사용자 상태가 {status_update.status}로 변경되었습니다",
            "user_id": user.id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{user_id}/group")
def update_user_group(
    user_id: int,
    group_update: UserGroupUpdate,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """사용자 그룹 변경 (관리자 전용)"""
    try:
        user = AuthService.update_user_group(
            db,
            user_id,
            group_update.group_id,
            current_user.email
        )
        return {
            "success": True,
            "message": f"사용자 그룹이 변경되었습니다",
            "user_id": user.id,
            "group_id": user.group_id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/{user_id}/approve")
def approve_user(
    user_id: int,
    group_update: UserGroupUpdate,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """사용자 승인 (pending -> active 변경 + 그룹 할당)"""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    if user.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 처리된 사용자입니다"
        )

    # 그룹 할당 및 상태 변경
    try:
        user = AuthService.update_user_group(
            db,
            user_id,
            group_update.group_id,
            current_user.email
        )
        return {
            "success": True,
            "message": "사용자가 승인되었습니다",
            "user_id": user.id,
            "group_id": user.group_id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """사용자 삭제 (관리자 전용) - 실제로는 inactive 상태로 변경"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자기 자신을 삭제할 수 없습니다"
        )

    try:
        user = AuthService.update_user_status(
            db,
            user_id,
            'inactive',
            current_user.email
        )
        return {
            "success": True,
            "message": "사용자가 비활성화되었습니다",
            "user_id": user.id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )