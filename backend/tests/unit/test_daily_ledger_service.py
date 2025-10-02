"""
Daily Ledger Service 단위 테스트
일일 원장 생성 및 관리 로직 테스트
"""
import pytest
from datetime import date, datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.daily_ledger_service import DailyLedgerService
from app.models.daily_ledger import DailyLedger
from app.models.product import Product
from app.models.transaction import Transaction


@pytest.fixture
def mock_db():
    """Mock 데이터베이스 세션"""
    return MagicMock(spec=Session)


@pytest.fixture
def daily_ledger_service(mock_db):
    """DailyLedgerService 인스턴스"""
    return DailyLedgerService(mock_db)


@pytest.fixture
def sample_products():
    """테스트용 제품 목록"""
    return [
        Product(id=1, code="PROD001", name="제품1", quantity=100, category="제품"),
        Product(id=2, code="PROD002", name="제품2", quantity=200, category="원재료"),
        Product(id=3, code="PROD003", name="제품3", quantity=150, category="제품")
    ]


@pytest.fixture
def sample_transactions():
    """테스트용 거래 목록"""
    return [
        Transaction(id=1, product_code="PROD001", type="입고", quantity=50, date=date(2025, 1, 15)),
        Transaction(id=2, product_code="PROD001", type="출고", quantity=30, date=date(2025, 1, 15)),
        Transaction(id=3, product_code="PROD002", type="입고", quantity=100, date=date(2025, 1, 15))
    ]


class TestDailyLedgerService:
    """DailyLedgerService 테스트 클래스"""

    @pytest.mark.unit
    def test_should_generate_daily_ledger(
        self, daily_ledger_service, mock_db, sample_products, sample_transactions
    ):
        """일일 원장을 생성해야 한다"""
        # Arrange
        target_date = date(2025, 1, 15)
        mock_db.query(Product).all.return_value = sample_products
        mock_db.query(Transaction).filter().all.return_value = sample_transactions
        mock_db.query(DailyLedger).filter().first.return_value = None

        # Act
        result = daily_ledger_service.generate_daily_ledger(target_date)

        # Assert
        assert mock_db.add.called
        assert mock_db.commit.called
        assert len(result) == len(sample_products)

    @pytest.mark.unit
    def test_should_calculate_opening_balance(
        self, daily_ledger_service, mock_db
    ):
        """기초 재고를 올바르게 계산해야 한다"""
        # Arrange
        product_code = "PROD001"
        target_date = date(2025, 1, 15)

        # 이전 원장 데이터
        previous_ledger = DailyLedger(
            product_code=product_code,
            date=target_date - timedelta(days=1),
            closing_balance=80
        )
        mock_db.query(DailyLedger).filter().order_by().first.return_value = previous_ledger

        # Act
        opening_balance = daily_ledger_service.get_opening_balance(product_code, target_date)

        # Assert
        assert opening_balance == 80

    @pytest.mark.unit
    def test_should_calculate_daily_transactions_summary(
        self, daily_ledger_service, mock_db, sample_transactions
    ):
        """일일 거래 요약을 계산해야 한다"""
        # Arrange
        product_code = "PROD001"
        target_date = date(2025, 1, 15)
        product_transactions = [t for t in sample_transactions if t.product_code == product_code]
        mock_db.query(Transaction).filter().all.return_value = product_transactions

        # Act
        summary = daily_ledger_service.calculate_daily_summary(product_code, target_date)

        # Assert
        assert summary["total_inbound"] == 50
        assert summary["total_outbound"] == 30
        assert summary["net_change"] == 20

    @pytest.mark.unit
    def test_should_prevent_duplicate_ledger(
        self, daily_ledger_service, mock_db
    ):
        """중복된 원장 생성을 방지해야 한다"""
        # Arrange
        target_date = date(2025, 1, 15)
        existing_ledger = DailyLedger(
            id=1,
            product_code="PROD001",
            date=target_date
        )
        mock_db.query(DailyLedger).filter().first.return_value = existing_ledger

        # Act & Assert
        with pytest.raises(ValueError, match="해당 날짜의 원장이 이미 존재합니다"):
            daily_ledger_service.generate_daily_ledger(target_date)

    @pytest.mark.unit
    def test_should_handle_missing_previous_ledger(
        self, daily_ledger_service, mock_db
    ):
        """이전 원장이 없을 때 현재 재고를 기초 재고로 사용해야 한다"""
        # Arrange
        product = Product(code="PROD001", quantity=100)
        target_date = date(2025, 1, 15)
        mock_db.query(DailyLedger).filter().order_by().first.return_value = None
        mock_db.query(Product).filter().first.return_value = product

        # Act
        opening_balance = daily_ledger_service.get_opening_balance("PROD001", target_date)

        # Assert
        assert opening_balance == 100

    @pytest.mark.unit
    def test_should_regenerate_ledger(
        self, daily_ledger_service, mock_db
    ):
        """원장을 재생성해야 한다"""
        # Arrange
        target_date = date(2025, 1, 15)
        existing_ledger = DailyLedger(id=1, date=target_date)
        mock_db.query(DailyLedger).filter().all.return_value = [existing_ledger]

        # Act
        daily_ledger_service.regenerate_ledger(target_date)

        # Assert
        mock_db.delete.assert_called_with(existing_ledger)
        assert mock_db.commit.call_count >= 2  # 삭제 후 생성

    @pytest.mark.unit
    def test_should_validate_ledger_consistency(
        self, daily_ledger_service, mock_db
    ):
        """원장 일관성을 검증해야 한다"""
        # Arrange
        ledgers = [
            DailyLedger(
                product_code="PROD001",
                date=date(2025, 1, 14),
                opening_balance=100,
                total_inbound=50,
                total_outbound=30,
                closing_balance=120
            ),
            DailyLedger(
                product_code="PROD001",
                date=date(2025, 1, 15),
                opening_balance=120,  # 전일 마감 = 당일 기초
                total_inbound=20,
                total_outbound=10,
                closing_balance=130
            )
        ]
        mock_db.query(DailyLedger).filter().order_by().all.return_value = ledgers

        # Act
        is_consistent = daily_ledger_service.validate_consistency("PROD001")

        # Assert
        assert is_consistent is True

    @pytest.mark.unit
    def test_should_detect_ledger_inconsistency(
        self, daily_ledger_service, mock_db
    ):
        """원장 불일치를 감지해야 한다"""
        # Arrange
        ledgers = [
            DailyLedger(
                product_code="PROD001",
                date=date(2025, 1, 14),
                closing_balance=120
            ),
            DailyLedger(
                product_code="PROD001",
                date=date(2025, 1, 15),
                opening_balance=100  # 불일치: 120이어야 함
            )
        ]
        mock_db.query(DailyLedger).filter().order_by().all.return_value = ledgers

        # Act
        is_consistent = daily_ledger_service.validate_consistency("PROD001")

        # Assert
        assert is_consistent is False

    @pytest.mark.unit
    def test_should_get_ledger_by_date_range(
        self, daily_ledger_service, mock_db
    ):
        """날짜 범위로 원장을 조회해야 한다"""
        # Arrange
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        ledgers = [
            DailyLedger(date=date(2025, 1, 5)),
            DailyLedger(date=date(2025, 1, 15)),
            DailyLedger(date=date(2025, 1, 25))
        ]
        mock_db.query(DailyLedger).filter().all.return_value = ledgers

        # Act
        result = daily_ledger_service.get_ledgers_by_date_range(start_date, end_date)

        # Assert
        assert len(result) == 3
        assert all(isinstance(l, DailyLedger) for l in result)

    @pytest.mark.unit
    def test_should_handle_adjustment_transactions(
        self, daily_ledger_service, mock_db
    ):
        """조정 거래를 처리해야 한다"""
        # Arrange
        adjustment_transaction = Transaction(
            product_code="PROD001",
            type="조정",
            quantity=10,  # 양수: 증가, 음수: 감소
            date=date(2025, 1, 15)
        )
        mock_db.query(Transaction).filter().all.return_value = [adjustment_transaction]

        # Act
        summary = daily_ledger_service.calculate_daily_summary("PROD001", date(2025, 1, 15))

        # Assert
        assert summary["adjustments"] == 10
        assert summary["net_change"] == 10