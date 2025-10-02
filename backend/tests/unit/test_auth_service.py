"""
Authentication Service 단위 테스트
인증 및 권한 관리 로직 테스트
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.services.auth_service import AuthService
from app.models.user import User, Group
from app.schemas.auth import UserCreate, UserLogin
from app.core.security import get_password_hash, verify_password


@pytest.fixture
def mock_db():
    """Mock 데이터베이스 세션"""
    return MagicMock(spec=Session)


@pytest.fixture
def auth_service(mock_db):
    """AuthService 인스턴스"""
    return AuthService(mock_db)


@pytest.fixture
def sample_user():
    """테스트용 User 모델"""
    user = User(
        id=1,
        username="testuser",
        email="test@playauto.com",
        full_name="Test User",
        hashed_password=get_password_hash("TestPassword123!"),
        is_active=True,
        group_id=1
    )
    user.group = Group(id=1, name="일반 사용자")
    return user


@pytest.fixture
def sample_user_create():
    """테스트용 UserCreate 스키마"""
    return UserCreate(
        username="newuser",
        email="new@playauto.com",
        full_name="New User",
        password="SecurePass123!",
        group_id=1
    )


class TestAuthService:
    """AuthService 테스트 클래스"""

    @pytest.mark.unit
    def test_should_create_user_with_hashed_password(
        self, auth_service, mock_db, sample_user_create
    ):
        """비밀번호를 해시하여 사용자를 생성해야 한다"""
        # Arrange
        mock_db.query().filter().first.return_value = None  # 중복 없음
        mock_db.add = Mock()
        mock_db.commit = Mock()

        # Act
        result = auth_service.create_user(sample_user_create)

        # Assert
        assert mock_db.add.called
        assert mock_db.commit.called
        # 비밀번호가 해시되었는지 확인
        added_user = mock_db.add.call_args[0][0]
        assert added_user.hashed_password != sample_user_create.password
        assert verify_password(sample_user_create.password, added_user.hashed_password)

    @pytest.mark.unit
    def test_should_prevent_duplicate_username(
        self, auth_service, mock_db, sample_user_create, sample_user
    ):
        """중복된 사용자명 생성을 방지해야 한다"""
        # Arrange
        mock_db.query().filter().first.return_value = sample_user

        # Act & Assert
        with pytest.raises(ValueError, match="이미 존재하는 사용자명입니다"):
            auth_service.create_user(sample_user_create)

    @pytest.mark.unit
    def test_should_authenticate_valid_credentials(
        self, auth_service, mock_db, sample_user
    ):
        """올바른 인증 정보로 로그인해야 한다"""
        # Arrange
        login_data = UserLogin(
            username="testuser",
            password="TestPassword123!"
        )
        mock_db.query().filter().first.return_value = sample_user

        # Act
        result = auth_service.authenticate_user(login_data)

        # Assert
        assert result["user"] == sample_user
        assert "access_token" in result
        assert result["token_type"] == "bearer"

    @pytest.mark.unit
    def test_should_reject_invalid_password(
        self, auth_service, mock_db, sample_user
    ):
        """잘못된 비밀번호를 거부해야 한다"""
        # Arrange
        login_data = UserLogin(
            username="testuser",
            password="WrongPassword!"
        )
        mock_db.query().filter().first.return_value = sample_user

        # Act & Assert
        with pytest.raises(ValueError, match="잘못된 인증 정보입니다"):
            auth_service.authenticate_user(login_data)

    @pytest.mark.unit
    def test_should_reject_nonexistent_user(
        self, auth_service, mock_db
    ):
        """존재하지 않는 사용자 로그인을 거부해야 한다"""
        # Arrange
        login_data = UserLogin(
            username="nonexistent",
            password="AnyPassword123!"
        )
        mock_db.query().filter().first.return_value = None

        # Act & Assert
        with pytest.raises(ValueError, match="사용자를 찾을 수 없습니다"):
            auth_service.authenticate_user(login_data)

    @pytest.mark.unit
    def test_should_reject_inactive_user(
        self, auth_service, mock_db, sample_user
    ):
        """비활성 사용자 로그인을 거부해야 한다"""
        # Arrange
        sample_user.is_active = False
        login_data = UserLogin(
            username="testuser",
            password="TestPassword123!"
        )
        mock_db.query().filter().first.return_value = sample_user

        # Act & Assert
        with pytest.raises(ValueError, match="비활성화된 계정입니다"):
            auth_service.authenticate_user(login_data)

    @pytest.mark.unit
    def test_should_create_valid_jwt_token(
        self, auth_service, sample_user
    ):
        """유효한 JWT 토큰을 생성해야 한다"""
        # Act
        token = auth_service.create_access_token(sample_user)

        # Assert
        assert token is not None
        payload = jwt.decode(token, auth_service.SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == sample_user.username
        assert "exp" in payload

    @pytest.mark.unit
    def test_should_verify_valid_token(
        self, auth_service, mock_db, sample_user
    ):
        """유효한 토큰을 검증해야 한다"""
        # Arrange
        token = auth_service.create_access_token(sample_user)
        mock_db.query().filter().first.return_value = sample_user

        # Act
        result = auth_service.verify_token(token)

        # Assert
        assert result == sample_user

    @pytest.mark.unit
    def test_should_reject_expired_token(
        self, auth_service
    ):
        """만료된 토큰을 거부해야 한다"""
        # Arrange
        expired_payload = {
            "sub": "testuser",
            "exp": datetime.utcnow() - timedelta(hours=1)
        }
        expired_token = jwt.encode(
            expired_payload,
            auth_service.SECRET_KEY,
            algorithm="HS256"
        )

        # Act & Assert
        with pytest.raises(JWTError):
            auth_service.verify_token(expired_token)

    @pytest.mark.unit
    def test_should_check_user_permissions(
        self, auth_service, sample_user
    ):
        """사용자 권한을 확인해야 한다"""
        # Arrange
        sample_user.group.permissions = ["read", "write"]

        # Act
        has_read = auth_service.has_permission(sample_user, "read")
        has_delete = auth_service.has_permission(sample_user, "delete")

        # Assert
        assert has_read is True
        assert has_delete is False

    @pytest.mark.unit
    def test_should_update_user_password(
        self, auth_service, mock_db, sample_user
    ):
        """사용자 비밀번호를 업데이트해야 한다"""
        # Arrange
        new_password = "NewSecurePassword123!"
        mock_db.query().filter().first.return_value = sample_user

        # Act
        auth_service.update_password(sample_user.id, new_password)

        # Assert
        assert verify_password(new_password, sample_user.hashed_password)
        mock_db.commit.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.parametrize("password,is_valid", [
        ("Short1!", False),  # 너무 짧음
        ("nouppercase123!", False),  # 대문자 없음
        ("NOLOWERCASE123!", False),  # 소문자 없음
        ("NoNumbers!", False),  # 숫자 없음
        ("NoSpecial123", False),  # 특수문자 없음
        ("ValidPass123!", True),  # 유효함
    ])
    def test_should_validate_password_strength(
        self, auth_service, password, is_valid
    ):
        """비밀번호 강도를 검증해야 한다"""
        # Act
        result = auth_service.is_password_strong(password)

        # Assert
        assert result == is_valid

    @pytest.mark.unit
    def test_should_lock_account_after_failed_attempts(
        self, auth_service, mock_db, sample_user
    ):
        """로그인 실패 횟수 초과 시 계정을 잠가야 한다"""
        # Arrange
        sample_user.failed_login_attempts = 4
        mock_db.query().filter().first.return_value = sample_user

        # Act
        auth_service.record_failed_login(sample_user.username)

        # Assert
        assert sample_user.failed_login_attempts == 5
        assert sample_user.is_locked is True
        mock_db.commit.assert_called_once()