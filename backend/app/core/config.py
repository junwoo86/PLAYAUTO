"""
Application configuration using Pydantic Settings
"""
from typing import Optional, List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "PLAYAUTO Backend API"
    APP_VERSION: str = "1.0.6"  # bcrypt 바이트 단위 처리 수정
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    DB_SCHEMA: str = "playauto_platform"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120  # 2시간 (120분)
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3001"
    BACKEND_CORS_ORIGINS: List[str] = []

    # Email Settings
    EMAIL_ENABLED: bool = False  # 이메일 발송 활성화 여부
    EMAIL_HOST: str = "smtp.gmail.com"  # 환경변수에서 오버라이드 가능
    EMAIL_PORT: int = 587  # 환경변수에서 오버라이드 가능
    EMAIL_USERNAME: str = "ai@biocom.kr"  # 환경변수에서 오버라이드 가능
    EMAIL_PASSWORD: Optional[str] = None  # Gmail 앱 비밀번호
    EMAIL_FROM: str = "ai@biocom.kr"  # 환경변수에서 오버라이드 가능
    EMAIL_FROM_NAME: str = "PLAYAUTO 시스템"  # 환경변수에서 오버라이드 가능
    EMAIL_USE_TLS: bool = True  # 환경변수에서 오버라이드 가능
    
    @property
    def cors_origins(self) -> List[str]:
        """Get CORS origins"""
        origins = []

        # FRONTEND_URL이 설정되어 있으면 추가
        if self.FRONTEND_URL:
            origins.append(self.FRONTEND_URL)

        # Production 도메인 추가
        origins.append("https://playauto.vercel.app")

        # 기본 개발 환경 URL들 추가
        origins.extend([
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5173"
        ])

        # 추가 CORS origins
        if self.BACKEND_CORS_ORIGINS:
            origins.extend(self.BACKEND_CORS_ORIGINS)

        # 중복 제거 후 반환
        return list(set(origins))
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields in .env file


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()