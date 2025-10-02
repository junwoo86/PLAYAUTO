"""
Transaction Service 단위 테스트
핵심 비즈니스 로직 테스트
"""
import pytest
from datetime import datetime, date
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.transaction_service import TransactionService
from app.models.transaction import Transaction
from app.models.product import Product
from app.schemas.transaction import TransactionCreate


@pytest.fixture
def mock_db():
    """Mock 데이터베이스 세션"""
    return MagicMock(spec=Session)


@pytest.fixture
def transaction_service(mock_db):
    """TransactionService 인스턴스"""
    return TransactionService(mock_db)


@pytest.fixture
def sample_transaction_create():
    """테스트용 TransactionCreate 스키마"""
    return TransactionCreate(
        product_code="TEST001",
        type="입고",
        quantity=100,
        date=date(2025, 1, 1),
        description="테스트 입고"
    )


@pytest.fixture
def sample_product():
    """테스트용 Product 모델"""
    product = Product(
        id=1,
        code="TEST001",
        name="테스트 제품",
        category="원재료",
        quantity=500,
        unit="kg",
        price=10000
    )
    return product


class TestTransactionService:
    """TransactionService 테스트 클래스"""

    @pytest.mark.unit
    def test_should_create_transaction_with_valid_data(
        self, transaction_service, mock_db, sample_transaction_create, sample_product
    ):
        """유효한 데이터로 거래를 생성해야 한다"""
        # Arrange
        mock_db.query().filter().first.return_value = sample_product
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()

        # Act
        result = transaction_service.create_transaction(sample_transaction_create)

        # Assert
        assert mock_db.add.called
        assert mock_db.commit.called
        mock_db.query().filter().first.assert_called_once()

    @pytest.mark.unit
    def test_should_update_product_quantity_on_inbound(
        self, transaction_service, mock_db, sample_product
    ):
        """입고 시 제품 수량을 증가시켜야 한다"""
        # Arrange
        initial_quantity = sample_product.quantity
        transaction_data = TransactionCreate(
            product_code="TEST001",
            type="입고",
            quantity=50,
            date=date(2025, 1, 1)
        )
        mock_db.query().filter().first.return_value = sample_product

        # Act
        transaction_service.create_transaction(transaction_data)

        # Assert
        expected_quantity = initial_quantity + 50
        assert sample_product.quantity == expected_quantity

    @pytest.mark.unit
    def test_should_update_product_quantity_on_outbound(
        self, transaction_service, mock_db, sample_product
    ):
        """출고 시 제품 수량을 감소시켜야 한다"""
        # Arrange
        initial_quantity = sample_product.quantity
        transaction_data = TransactionCreate(
            product_code="TEST001",
            type="출고",
            quantity=30,
            date=date(2025, 1, 1)
        )
        mock_db.query().filter().first.return_value = sample_product

        # Act
        transaction_service.create_transaction(transaction_data)

        # Assert
        expected_quantity = initial_quantity - 30
        assert sample_product.quantity == expected_quantity

    @pytest.mark.unit
    def test_should_raise_error_for_nonexistent_product(
        self, transaction_service, mock_db, sample_transaction_create
    ):
        """존재하지 않는 제품에 대해 에러를 발생시켜야 한다"""
        # Arrange
        mock_db.query().filter().first.return_value = None

        # Act & Assert
        with pytest.raises(ValueError, match="제품을 찾을 수 없습니다"):
            transaction_service.create_transaction(sample_transaction_create)

    @pytest.mark.unit
    def test_should_raise_error_for_insufficient_quantity(
        self, transaction_service, mock_db, sample_product
    ):
        """재고 부족 시 에러를 발생시켜야 한다"""
        # Arrange
        sample_product.quantity = 10
        transaction_data = TransactionCreate(
            product_code="TEST001",
            type="출고",
            quantity=20,
            date=date(2025, 1, 1)
        )
        mock_db.query().filter().first.return_value = sample_product

        # Act & Assert
        with pytest.raises(ValueError, match="재고가 부족합니다"):
            transaction_service.create_transaction(transaction_data)

    @pytest.mark.unit
    def test_should_get_transactions_by_date_range(
        self, transaction_service, mock_db
    ):
        """날짜 범위로 거래를 조회해야 한다"""
        # Arrange
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        mock_transactions = [
            Transaction(id=1, product_code="TEST001", date=date(2025, 1, 5)),
            Transaction(id=2, product_code="TEST002", date=date(2025, 1, 15))
        ]
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.all.return_value = mock_transactions

        # Act
        result = transaction_service.get_transactions_by_date(start_date, end_date)

        # Assert
        assert len(result) == 2
        assert all(isinstance(t, Transaction) for t in result)

    @pytest.mark.unit
    def test_should_calculate_transaction_summary(
        self, transaction_service, mock_db
    ):
        """거래 요약 통계를 계산해야 한다"""
        # Arrange
        mock_transactions = [
            Transaction(id=1, type="입고", quantity=100, product_code="TEST001"),
            Transaction(id=2, type="출고", quantity=30, product_code="TEST001"),
            Transaction(id=3, type="입고", quantity=50, product_code="TEST002")
        ]
        mock_db.query().all.return_value = mock_transactions

        # Act
        summary = transaction_service.get_transaction_summary()

        # Assert
        assert summary["total_inbound"] == 150
        assert summary["total_outbound"] == 30
        assert summary["net_change"] == 120

    @pytest.mark.unit
    def test_should_validate_transaction_date(
        self, transaction_service, sample_transaction_create
    ):
        """거래 날짜가 미래가 아닌지 검증해야 한다"""
        # Arrange
        future_date = date(2030, 1, 1)
        sample_transaction_create.date = future_date

        # Act & Assert
        with pytest.raises(ValueError, match="미래 날짜는 입력할 수 없습니다"):
            transaction_service.validate_transaction_date(sample_transaction_create)

    @pytest.mark.unit
    @pytest.mark.parametrize("transaction_type,expected", [
        ("입고", True),
        ("출고", True),
        ("조정", True),
        ("잘못된타입", False)
    ])
    def test_should_validate_transaction_type(
        self, transaction_service, transaction_type, expected
    ):
        """거래 타입을 검증해야 한다"""
        # Act
        result = transaction_service.is_valid_transaction_type(transaction_type)

        # Assert
        assert result == expected

    @pytest.mark.unit
    def test_should_rollback_on_error(
        self, transaction_service, mock_db, sample_transaction_create, sample_product
    ):
        """에러 발생 시 롤백해야 한다"""
        # Arrange
        mock_db.query().filter().first.return_value = sample_product
        mock_db.commit.side_effect = Exception("Database error")

        # Act & Assert
        with pytest.raises(Exception):
            transaction_service.create_transaction(sample_transaction_create)

        mock_db.rollback.assert_called_once()