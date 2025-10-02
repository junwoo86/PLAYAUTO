"""
통합 에러 핸들러 및 커스텀 예외 클래스
"""
from typing import Any, Optional, Dict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger(__name__)


class AppException(Exception):
    """애플리케이션 기본 예외 클래스"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        headers: Optional[Dict[str, Any]] = None,
    ):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.headers = headers
        super().__init__(detail)


class NotFoundError(AppException):
    """리소스를 찾을 수 없음"""
    def __init__(self, detail: str = "리소스를 찾을 수 없습니다"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND"
        )


class BadRequestError(AppException):
    """잘못된 요청"""
    def __init__(self, detail: str = "잘못된 요청입니다"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="BAD_REQUEST"
        )


class UnauthorizedError(AppException):
    """인증 실패"""
    def __init__(self, detail: str = "인증이 필요합니다"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHORIZED"
        )


class ForbiddenError(AppException):
    """권한 없음"""
    def __init__(self, detail: str = "권한이 없습니다"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN"
        )


class ConflictError(AppException):
    """충돌 발생"""
    def __init__(self, detail: str = "데이터 충돌이 발생했습니다"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code="CONFLICT"
        )


class InternalServerError(AppException):
    """서버 내부 오류"""
    def __init__(self, detail: str = "서버 내부 오류가 발생했습니다"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="INTERNAL_SERVER_ERROR"
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """커스텀 애플리케이션 예외 핸들러"""
    logger.error(f"AppException: {exc.error_code} - {exc.detail}")

    # CORS 헤더 추가
    headers = exc.headers or {}
    origin = request.headers.get("origin")
    if origin:
        headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        })

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "path": str(request.url.path),
                "method": request.method
            }
        },
        headers=headers
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """HTTP 예외 핸들러"""
    logger.error(f"HTTPException: {exc.status_code} - {exc.detail}")

    error_codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        500: "INTERNAL_SERVER_ERROR",
        503: "SERVICE_UNAVAILABLE"
    }

    # CORS 헤더 추가
    headers = {}
    origin = request.headers.get("origin")
    if origin:
        headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        })

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": error_codes.get(exc.status_code, "HTTP_ERROR"),
                "message": exc.detail,
                "path": str(request.url.path),
                "method": request.method
            }
        },
        headers=headers
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """검증 오류 핸들러"""
    logger.error(f"ValidationError: {exc.errors()}")

    # 에러 메시지를 더 읽기 쉽게 포맷팅
    error_messages = []
    for error in exc.errors():
        loc = " -> ".join(str(l) for l in error['loc'])
        msg = f"{loc}: {error['msg']}"
        error_messages.append(msg)

    # CORS 헤더 추가
    headers = {}
    origin = request.headers.get("origin")
    if origin:
        headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "입력값 검증에 실패했습니다",
                "details": error_messages,
                "path": str(request.url.path),
                "method": request.method
            }
        },
        headers=headers
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """일반 예외 핸들러"""
    logger.error(f"Unexpected error: {type(exc).__name__} - {str(exc)}", exc_info=True)

    # 개발 환경에서는 상세 에러 정보 제공
    from app.core.config import settings

    # CORS 헤더 추가
    headers = {}
    origin = request.headers.get("origin")
    if origin:
        headers.update({
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        })

    if settings.DEBUG:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "서버 내부 오류가 발생했습니다",
                    "debug": {
                        "type": type(exc).__name__,
                        "message": str(exc)
                    },
                    "path": str(request.url.path),
                    "method": request.method
                }
            },
            headers=headers
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "서버 내부 오류가 발생했습니다",
                "path": str(request.url.path),
                "method": request.method
            }
        },
        headers=headers
    )


def register_exception_handlers(app):
    """예외 핸들러를 앱에 등록"""
    from fastapi.exceptions import RequestValidationError
    from starlette.exceptions import HTTPException as StarletteHTTPException

    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)