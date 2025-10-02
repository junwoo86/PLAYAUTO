from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import (
    Token,
    LoginRequest,
    SignupRequest,
    RefreshTokenRequest,
    UserResponse,
    GroupResponse
)
from app.core.security import decode_token

router = APIRouter()
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """현재 인증된 사용자 가져오기"""
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = AuthService.get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # inactive 사용자는 접근 불가
    if user.status == 'inactive':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다"
        )

    return user


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """로그인"""
    user = AuthService.authenticate_user(db, request.email, request.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )

    # inactive 사용자는 로그인 불가
    if user.status == 'inactive':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다"
        )

    # 토큰 생성
    tokens = AuthService.create_tokens(user)

    # 리프레시 토큰 저장
    AuthService.save_refresh_token(db, user.id, tokens["refresh_token"])

    # 사용자 권한 조회
    permissions = AuthService.get_user_permissions(db, user)

    # 응답 구성
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
        user_response.group = GroupResponse(
            id=user.group.id,
            name=user.group.name,
            description=user.group.description,
            permissions=permissions,
            created_at=user.group.created_at
        )

    return Token(
        access_token=tokens["access_token"],
        token_type="bearer",
        user=user_response
    )


@router.post("/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """회원가입"""
    try:
        user = AuthService.create_user(db, request)
        return {
            "success": True,
            "message": "회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.",
            "user_id": user.id
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="회원가입 처리 중 오류가 발생했습니다"
        )


@router.post("/logout")
def logout(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """로그아웃"""
    # 현재는 클라이언트에서 토큰을 삭제하는 방식
    # 필요시 토큰 블랙리스트 구현 가능
    return {
        "success": True,
        "message": "로그아웃되었습니다"
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """현재 사용자 정보"""
    permissions = AuthService.get_user_permissions(db, current_user)

    user_response = UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        status=current_user.status,
        last_login=current_user.last_login,
        created_at=current_user.created_at,
        created_by=current_user.created_by
    )

    if current_user.group:
        user_response.group = GroupResponse(
            id=current_user.group.id,
            name=current_user.group.name,
            description=current_user.group.description,
            permissions=permissions,
            created_at=current_user.group.created_at
        )

    return user_response


@router.post("/refresh", response_model=Token)
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """토큰 갱신"""
    user = AuthService.validate_refresh_token(db, request.refresh_token)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 유효하지 않습니다"
        )

    # 새 토큰 생성
    tokens = AuthService.create_tokens(user)

    # 새 리프레시 토큰 저장
    AuthService.save_refresh_token(db, user.id, tokens["refresh_token"])

    # 사용자 권한 조회
    permissions = AuthService.get_user_permissions(db, user)

    # 응답 구성
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
        user_response.group = GroupResponse(
            id=user.group.id,
            name=user.group.name,
            description=user.group.description,
            permissions=permissions,
            created_at=user.group.created_at
        )

    return Token(
        access_token=tokens["access_token"],
        token_type="bearer",
        user=user_response
    )