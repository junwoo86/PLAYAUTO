"""
Database configuration and session management
"""
from sqlalchemy import create_engine, MetaData, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from typing import Generator
import logging

from app.core.config import settings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQLAlchemy 설정
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# 엔진 생성 (연결 풀 비활성화 - 개발 환경)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=NullPool,
    echo=settings.DEBUG,  # SQL 쿼리 로깅
    future=True
)

# 세션 팩토리
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base 클래스 생성 - 모든 모델이 상속받을 클래스
metadata = MetaData(schema=settings.DB_SCHEMA)
Base = declarative_base(metadata=metadata)


def get_db() -> Generator[Session, None, None]:
    """
    데이터베이스 세션 의존성
    FastAPI의 Depends에서 사용
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_database():
    """
    데이터베이스 초기화
    스키마 존재 확인 및 생성만 수행
    """
    with engine.connect() as conn:
        # 스키마 존재 확인
        result = conn.execute(
            text(f"SELECT schema_name FROM information_schema.schemata WHERE schema_name = '{settings.DB_SCHEMA}'")
        )
        
        if not result.fetchone():
            # 스키마가 없으면 생성
            conn.execute(text(f"CREATE SCHEMA {settings.DB_SCHEMA}"))
            conn.commit()
            logger.info(f"Schema '{settings.DB_SCHEMA}' created")
        else:
            logger.info(f"Schema '{settings.DB_SCHEMA}' already exists")
            
        # 스키마 경로 설정
        conn.execute(text(f"SET search_path TO {settings.DB_SCHEMA}"))
        conn.commit()


def create_tables():
    """필요한 테이블만 생성 (기존 테이블은 유지)"""
    # 모든 모델을 import하여 Base.metadata에 등록
    import app.models  # 모델들을 import
    
    # checkfirst=True 옵션으로 기존 테이블은 건너뛰고 없는 테이블만 생성
    Base.metadata.create_all(bind=engine, checkfirst=True)
    logger.info("Database tables checked and created if needed")


def test_connection():
    """데이터베이스 연결 테스트"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            logger.info(f"Successfully connected to PostgreSQL: {version}")
            
            # 현재 스키마 확인
            result = conn.execute(text("SELECT current_schema()"))
            current_schema = result.fetchone()[0]
            logger.info(f"Current schema: {current_schema}")
            
            return True
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return False