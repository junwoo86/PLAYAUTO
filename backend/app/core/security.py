from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
import secrets
import os
from app.core.config import settings

# JWT 설정
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES  # config.py에서 가져옴
REFRESH_TOKEN_EXPIRE_DAYS = 7

# 비밀번호 해싱
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """액세스 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """리프레시 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증 (bcrypt 72바이트 제한 처리)"""
    # bcrypt는 72바이트까지만 처리 가능
    truncated_password = plain_password[:72] if len(plain_password.encode('utf-8')) > 72 else plain_password
    return pwd_context.verify(truncated_password, hashed_password)


def get_password_hash(password: str) -> str:
    """비밀번호 해시 생성 (bcrypt 72바이트 제한 처리)"""
    # bcrypt는 72바이트까지만 처리 가능
    truncated_password = password[:72] if len(password.encode('utf-8')) > 72 else password
    return pwd_context.hash(truncated_password)


def decode_token(token: str) -> dict:
    """토큰 디코딩"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None