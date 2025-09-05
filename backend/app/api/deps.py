"""
API Dependencies
"""
from typing import Generator
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db


def get_current_db() -> Generator[Session, None, None]:
    """Get database session dependency"""
    yield from get_db()


# 추후 인증 관련 의존성 추가 예정
# def get_current_user():
#     """Get current authenticated user"""
#     pass