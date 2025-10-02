"""
Pytest configuration and fixtures for PLAYAUTO backend tests
"""
import os
import sys
from pathlib import Path
import pytest
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from fastapi.testclient import TestClient

# 프로젝트 루트 디렉토리를 Python 경로에 추가
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings

# 테스트용 데이터베이스 URL (실제 DB와 다른 테스트 DB 사용)
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite:///./test.db"  # 기본값: SQLite 인메모리 DB
)

# 테스트용 엔진과 세션 생성
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def setup_database():
    """테스트 시작 전 데이터베이스 설정"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(setup_database) -> Generator[Session, None, None]:
    """각 테스트마다 독립적인 데이터베이스 세션 제공"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """테스트용 FastAPI 클라이언트"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client: TestClient) -> dict:
    """인증된 요청을 위한 헤더"""
    # 테스트용 사용자 생성 및 로그인
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": "test_user",
            "password": "test_password"
        }
    )

    if response.status_code == 200:
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    # 로그인 실패 시 테스트용 토큰 반환
    return {"Authorization": "Bearer test_token"}


@pytest.fixture
def sample_product_data():
    """테스트용 제품 데이터"""
    return {
        "code": "TEST001",
        "name": "테스트 제품",
        "category": "원재료",
        "quantity": 100,
        "unit": "kg",
        "price": 10000
    }


@pytest.fixture
def sample_transaction_data():
    """테스트용 거래 데이터"""
    return {
        "product_code": "TEST001",
        "type": "입고",
        "quantity": 50,
        "date": "2025-01-01",
        "description": "테스트 입고"
    }


@pytest.fixture
def sample_user_data():
    """테스트용 사용자 데이터"""
    return {
        "username": "testuser",
        "email": "test@playauto.com",
        "full_name": "Test User",
        "password": "SecurePassword123!",
        "group_id": 1
    }


# 테스트 실행 시 경고 무시 설정
def pytest_configure(config):
    """Pytest 설정"""
    import warnings
    warnings.filterwarnings("ignore", category=DeprecationWarning)
    warnings.filterwarnings("ignore", category=PendingDeprecationWarning)