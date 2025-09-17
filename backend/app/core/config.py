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
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    DB_SCHEMA: str = "playauto_platform"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    FRONTEND_URL: str = "http://localhost:3001"
    BACKEND_CORS_ORIGINS: List[str] = []
    
    @property
    def cors_origins(self) -> List[str]:
        """Get CORS origins"""
        origins = [self.FRONTEND_URL]
        if self.BACKEND_CORS_ORIGINS:
            origins.extend(self.BACKEND_CORS_ORIGINS)
        return origins
    
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