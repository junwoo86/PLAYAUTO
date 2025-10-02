from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User
from app.services.group_service import GroupService
from app.schemas.auth import GroupResponse, PermissionResponse
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter()


class GroupCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class GroupUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class GroupPermissionsUpdate(BaseModel):
    permission_ids: List[int]


def check_admin_permission(current_user: User = Depends(get_current_user)):
    """관리자 권한 체크"""
    if current_user.group and current_user.group.name == '시스템 관리자':
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="관리자 권한이 필요합니다"
    )


@router.get("/", response_model=List[GroupResponse])
def get_all_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """전체 그룹 목록 조회"""
    groups = GroupService.get_all_groups(db)

    group_responses = []
    for group in groups:
        permissions = GroupService.get_group_permissions(db, group.id)
        permission_codes = [p.code for p in permissions]

        group_response = GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            permissions=permission_codes,
            created_at=group.created_at
        )
        group_responses.append(group_response)

    return group_responses


@router.get("/permissions", response_model=List[PermissionResponse])
def get_all_permissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """전체 권한 목록 조회"""
    permissions = GroupService.get_all_permissions(db)

    permission_responses = []
    for perm in permissions:
        perm_response = PermissionResponse(
            id=perm.id,
            code=perm.code,
            name=perm.name,
            description=perm.description,
            created_at=perm.created_at
        )
        permission_responses.append(perm_response)

    return permission_responses


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """특정 그룹 정보 조회"""
    group = GroupService.get_group_by_id(db, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="그룹을 찾을 수 없습니다"
        )

    permissions = GroupService.get_group_permissions(db, group.id)
    permission_codes = [p.code for p in permissions]

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        permissions=permission_codes,
        created_at=group.created_at
    )


@router.get("/{group_id}/permissions", response_model=List[PermissionResponse])
def get_group_permissions(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """그룹의 권한 목록 조회"""
    group = GroupService.get_group_by_id(db, group_id)

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="그룹을 찾을 수 없습니다"
        )

    permissions = GroupService.get_group_permissions(db, group_id)

    permission_responses = []
    for perm in permissions:
        perm_response = PermissionResponse(
            id=perm.id,
            code=perm.code,
            name=perm.name,
            description=perm.description,
            created_at=perm.created_at
        )
        permission_responses.append(perm_response)

    return permission_responses


@router.post("/", response_model=GroupResponse)
def create_group(
    request: GroupCreateRequest,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """새 그룹 생성 (관리자 전용)"""
    try:
        group = GroupService.create_group(
            db,
            request.name,
            request.description,
            current_user.email
        )

        return GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            permissions=[],
            created_at=group.created_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: int,
    request: GroupUpdateRequest,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """그룹 정보 수정 (관리자 전용)"""
    try:
        group = GroupService.update_group(
            db,
            group_id,
            request.name,
            request.description,
            current_user.email
        )

        permissions = GroupService.get_group_permissions(db, group.id)
        permission_codes = [p.code for p in permissions]

        return GroupResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            permissions=permission_codes,
            created_at=group.created_at
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{group_id}/permissions")
def update_group_permissions(
    group_id: int,
    request: GroupPermissionsUpdate,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """그룹 권한 업데이트 (관리자 전용)"""
    try:
        permissions = GroupService.update_group_permissions(
            db,
            group_id,
            request.permission_ids,
            current_user.email
        )

        return {
            "success": True,
            "message": "권한이 업데이트되었습니다",
            "group_id": group_id,
            "permissions": [p.code for p in permissions]
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/{group_id}")
def delete_group(
    group_id: int,
    current_user: User = Depends(check_admin_permission),
    db: Session = Depends(get_db)
):
    """그룹 삭제 (관리자 전용)"""
    # 시스템 관리자 그룹은 삭제 불가
    group = GroupService.get_group_by_id(db, group_id)
    if group and group.name == '시스템 관리자':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="시스템 관리자 그룹은 삭제할 수 없습니다"
        )

    try:
        GroupService.delete_group(db, group_id)
        return {
            "success": True,
            "message": "그룹이 삭제되었습니다"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )