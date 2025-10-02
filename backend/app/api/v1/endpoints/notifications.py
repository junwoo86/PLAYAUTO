from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.user import User, Group, NotificationSetting
from app.api.v1.endpoints.auth import get_current_user
from app.services.email_service import email_service

router = APIRouter()


class NotificationSettingRequest(BaseModel):
    notification_type: str
    is_enabled: bool


class NotificationSettingsUpdate(BaseModel):
    low_stock_alert: Optional[bool] = None
    order_status_change: Optional[bool] = None
    daily_report: Optional[bool] = None
    system_error: Optional[bool] = None


class NotificationSettingResponse(BaseModel):
    group_id: int
    group_name: str
    settings: dict  # {notification_type: is_enabled}

    class Config:
        from_attributes = True


def check_admin_permission(current_user: User = Depends(get_current_user)):
    """관리자 권한 체크"""
    if current_user.group and current_user.group.name == '시스템 관리자':
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="관리자 권한이 필요합니다"
    )


@router.get("/", response_model=List[NotificationSettingResponse])
def get_all_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """전체 알림 설정 목록 조회"""
    # 관리자는 모든 그룹의 설정 조회 가능
    if current_user.group and current_user.group.name == '시스템 관리자':
        # 모든 그룹 가져오기
        groups = db.query(Group).all()
    else:
        # 일반 사용자는 자신의 그룹만
        if not current_user.group_id:
            return []
        groups = [current_user.group]

    responses = []
    for group in groups:
        settings = db.query(NotificationSetting).filter(
            NotificationSetting.group_id == group.id
        ).all()

        settings_dict = {}
        for setting in settings:
            settings_dict[setting.notification_type] = setting.is_enabled

        # 기본값 설정 (없는 알림 타입은 False)
        for notification_type in ['low_stock_alert', 'order_status_change', 'daily_report', 'system_error']:
            if notification_type not in settings_dict:
                settings_dict[notification_type] = False

        response = NotificationSettingResponse(
            group_id=group.id,
            group_name=group.name,
            settings=settings_dict
        )
        responses.append(response)

    return responses


@router.get("/group/{group_id}", response_model=NotificationSettingResponse)
def get_group_notification_settings(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """특정 그룹의 알림 설정 조회"""
    # 권한 체크: 관리자 또는 해당 그룹 멤버만 조회 가능
    if current_user.group:
        if current_user.group.name != '시스템 관리자' and current_user.group_id != group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 그룹의 알림 설정을 조회할 권한이 없습니다"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="그룹에 속하지 않은 사용자입니다"
        )

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="그룹을 찾을 수 없습니다"
        )

    settings = db.query(NotificationSetting).filter(
        NotificationSetting.group_id == group_id
    ).all()

    settings_dict = {}
    for setting in settings:
        settings_dict[setting.notification_type] = setting.is_enabled

    # 기본값 설정 (없는 알림 타입은 False)
    for notification_type in ['low_stock_alert', 'order_status_change', 'daily_report', 'system_error']:
        if notification_type not in settings_dict:
            settings_dict[notification_type] = False

    return NotificationSettingResponse(
        group_id=group.id,
        group_name=group.name,
        settings=settings_dict
    )


@router.put("/group/{group_id}")
def update_group_notification_settings(
    group_id: int,
    settings_update: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """그룹의 알림 설정 업데이트"""
    # 권한 체크: 관리자 또는 해당 그룹 멤버만 수정 가능
    if current_user.group:
        if current_user.group.name != '시스템 관리자' and current_user.group_id != group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 그룹의 알림 설정을 수정할 권한이 없습니다"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="그룹에 속하지 않은 사용자입니다"
        )

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="그룹을 찾을 수 없습니다"
        )

    # 각 알림 타입별로 설정 업데이트 또는 생성
    settings = settings_update.dict(exclude_none=True)
    for notification_type, is_enabled in settings.items():
        if notification_type not in ['low_stock_alert', 'order_status_change', 'daily_report', 'system_error']:
            continue  # 유효하지 않은 타입은 무시

        setting = db.query(NotificationSetting).filter(
            NotificationSetting.group_id == group_id,
            NotificationSetting.notification_type == notification_type
        ).first()

        if setting:
            # 기존 설정 업데이트
            setting.is_enabled = is_enabled
            setting.updated_at = datetime.utcnow()
            setting.updated_by = current_user.email
        else:
            # 새 설정 생성
            setting = NotificationSetting(
                group_id=group_id,
                notification_type=notification_type,
                is_enabled=is_enabled,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                updated_by=current_user.email
            )
            db.add(setting)

    db.commit()

    # 업데이트된 설정 반환
    updated_settings = db.query(NotificationSetting).filter(
        NotificationSetting.group_id == group_id
    ).all()

    settings_dict = {}
    for setting in updated_settings:
        settings_dict[setting.notification_type] = setting.is_enabled

    # 기본값 설정
    for notification_type in ['low_stock_alert', 'order_status_change', 'daily_report', 'system_error']:
        if notification_type not in settings_dict:
            settings_dict[notification_type] = False

    return {
        "group_id": group.id,
        "group_name": group.name,
        "settings": settings_dict
    }


@router.get("/event-types")
def get_available_event_types(
    current_user: User = Depends(get_current_user)
):
    """사용 가능한 이벤트 타입 목록"""
    return {
        "event_types": [
            {
                "code": "low_stock_alert",
                "name": "재고 부족 알림",
                "description": "제품 재고가 최소 수준 이하로 떨어졌을 때"
            },
            {
                "code": "order_status_change",
                "name": "발주 상태 변경",
                "description": "발주 상태가 변경되었을 때"
            },
            {
                "code": "daily_report",
                "name": "일일 보고서",
                "description": "일일 재고 및 거래 보고서"
            },
            {
                "code": "system_error",
                "name": "시스템 오류",
                "description": "시스템에 오류가 발생했을 때"
            }
        ]
    }


class TestNotificationRequest(BaseModel):
    group_id: int
    notification_type: str


@router.post("/test")
def test_notification(
    request: TestNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """알림 테스트 전송"""
    # 권한 체크: 관리자 또는 해당 그룹 멤버만 테스트 가능
    if current_user.group:
        if current_user.group.name != '시스템 관리자' and current_user.group_id != request.group_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="해당 그룹의 알림을 테스트할 권한이 없습니다"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="그룹에 속하지 않은 사용자입니다"
        )

    setting = db.query(NotificationSetting).filter(
        NotificationSetting.group_id == request.group_id,
        NotificationSetting.notification_type == request.notification_type
    ).first()

    if not setting or not setting.is_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"해당 알림 타입({request.notification_type})이 비활성화되어 있거나 설정되지 않았습니다"
        )

    # 실제 이메일 발송
    group = db.query(Group).filter(Group.id == request.group_id).first()
    group_name = group.name if group else "Unknown"

    # 현재 사용자의 이메일로 테스트 알림 발송
    email_sent = email_service.send_notification_email(
        to_email=current_user.email,
        notification_type=request.notification_type,
        group_name=group_name,
        test=True
    )

    if email_sent:
        message = f"테스트 알림이 {current_user.email}로 전송되었습니다"
    else:
        message = "테스트 알림 전송에 실패했습니다 (이메일 서버 설정 확인 필요)"

    return {
        "success": email_sent,
        "message": message,
        "details": {
            "recipient": current_user.email,
            "group": group_name,
            "notification_type": request.notification_type
        }
    }