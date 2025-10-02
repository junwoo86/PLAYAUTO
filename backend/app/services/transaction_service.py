"""
Transaction Service Layer
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, desc
from fastapi import HTTPException, status

from app.models.transaction import Transaction
from app.models.product import Product
from app.models.stock_checkpoint import StockCheckpoint, CheckpointType
from app.schemas.transaction import TransactionCreate
from app.core.timezone_utils import get_current_utc_time, ensure_timezone_aware


class TransactionService:
    """Transaction business logic service"""
    
    @staticmethod
    def create_transaction(
        db: Session,
        transaction_create: TransactionCreate,
        created_by: str = "system"
    ) -> Transaction:
        """Create new transaction and update product stock"""

        # 제품 조회
        product = db.query(Product).filter(Product.product_code == transaction_create.product_code).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with code {transaction_create.product_code} not found"
            )

        # 거래 날짜 처리
        transaction_date = ensure_timezone_aware(transaction_create.transaction_date)

        # 체크포인트 검증
        affects_current_stock = True
        checkpoint_id = None

        # 해당 제품의 가장 최근 활성 체크포인트 조회
        latest_checkpoint = db.query(StockCheckpoint).filter(
            and_(
                StockCheckpoint.product_code == transaction_create.product_code,
                StockCheckpoint.is_active == True,
                StockCheckpoint.checkpoint_date > transaction_date
            )
        ).order_by(desc(StockCheckpoint.checkpoint_date)).first()

        if latest_checkpoint:
            # 체크포인트가 존재하고 거래 날짜가 체크포인트 이전인 경우
            affects_current_stock = False
            checkpoint_id = latest_checkpoint.id

        # 현재 재고 확인
        previous_stock = product.current_stock

        # 새로운 재고 계산 (affects_current_stock가 True인 경우에만)
        if affects_current_stock:
            if transaction_create.transaction_type == "IN":
                new_stock = previous_stock + transaction_create.quantity
            elif transaction_create.transaction_type == "OUT":
                # 재고 부족 체크
                if previous_stock < transaction_create.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient stock. Available: {previous_stock}, Requested: {transaction_create.quantity}"
                    )
                new_stock = previous_stock - transaction_create.quantity
            elif transaction_create.transaction_type == "ADJUST":
                # 조정은 직접 재고를 설정하는 것이 아니라 차이를 기록
                new_stock = previous_stock + transaction_create.quantity
            else:  # DISPOSAL
                # 폐기는 재고에 영향을 주지 않음
                new_stock = previous_stock
                affects_current_stock = False

            # 재고 조정 시 체크포인트 자동 생성
            if transaction_create.transaction_type == "ADJUST":
                checkpoint = StockCheckpoint(
                    product_code=transaction_create.product_code,
                    checkpoint_date=transaction_date,
                    checkpoint_type=CheckpointType.ADJUST,
                    confirmed_stock=new_stock,
                    reason=transaction_create.reason or "재고 조정",
                    created_by=transaction_create.created_by or created_by,
                    is_active=True
                )
                db.add(checkpoint)
                db.flush()  # ID를 얻기 위해 flush

                # 이 체크포인트 이전의 모든 거래를 affects_current_stock = False로 변경
                db.query(Transaction).filter(
                    and_(
                        Transaction.product_code == transaction_create.product_code,
                        Transaction.transaction_date <= transaction_date,
                        Transaction.affects_current_stock == True
                    )
                ).update(
                    {
                        "affects_current_stock": False,
                        "checkpoint_id": checkpoint.id
                    },
                    synchronize_session=False
                )
        else:
            # 체크포인트 이전 거래는 재고에 영향을 주지 않음
            new_stock = previous_stock

        # 트랜잭션 생성
        transaction = Transaction(
            transaction_type=transaction_create.transaction_type,
            product_code=transaction_create.product_code,
            quantity=transaction_create.quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            reason=transaction_create.reason,
            memo=transaction_create.memo,
            location=transaction_create.location,
            created_by=transaction_create.created_by or created_by,
            transaction_date=transaction_date,
            affects_current_stock=affects_current_stock,
            checkpoint_id=checkpoint_id
        )

        # 제품 재고 업데이트 (affects_current_stock가 True인 경우에만)
        if affects_current_stock:
            product.current_stock = new_stock

            # 자동 안전재고 계산 (출고시에만)
            if transaction_create.transaction_type == "OUT" and product.is_auto_calculated:
                product.safety_stock = TransactionService.calculate_safety_stock(db, product.product_code)

        db.add(transaction)
        db.commit()
        db.refresh(transaction)

        return transaction
    
    @staticmethod
    def get_transactions(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        product_code: Optional[str] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Transaction]:
        """Get list of transactions with filters"""
        query = db.query(Transaction)
        
        if product_code:
            query = query.filter(Transaction.product_code == product_code)
        
        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)
        
        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)
        
        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)
        
        return query.order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def batch_create_transactions(
        db: Session,
        transactions: List[TransactionCreate],
        created_by: str = "system"
    ) -> List[Transaction]:
        """Create multiple transactions in batch"""
        created_transactions = []
        
        try:
            for trans_create in transactions:
                transaction = TransactionService.create_transaction(
                    db, trans_create, created_by
                )
                created_transactions.append(transaction)
            
            return created_transactions
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    
    @staticmethod
    def calculate_safety_stock(db: Session, product_code: str) -> int:
        """
        Calculate safety stock based on 3-month average outbound

        새로운 로직:
        1. 3개월 이전에 출고 이력이 있는지 확인 (신제품 판별)
        2. 있으면: 최근 3개월 출고량 합계를 90일로 나눔 (일평균)
        3. 없으면: 자동 계산 불가 (데이터 부족)

        Safety Stock = (Lead Time + Buffer Days) * Average Daily Outbound
        """
        from datetime import timedelta

        # 제품 정보 조회
        product = db.query(Product).filter(Product.product_code == product_code).first()
        if not product:
            return 0

        # 3개월 전 날짜
        three_months_ago = get_current_utc_time() - timedelta(days=90)

        # 1. 3개월 이전에 출고 이력이 있는지 확인 (과거 이력 포함)
        has_old_outbound = db.query(Transaction).filter(
            Transaction.product_code == product_code,
            Transaction.transaction_type == "OUT",
            Transaction.transaction_date < three_months_ago
        ).first() is not None

        # 3개월 이전 출고 이력이 없으면 자동 계산 불가
        if not has_old_outbound:
            return 0

        # 2. 최근 3개월간 출고량 합계 (과거 이력 포함)
        total_outbound = db.query(func.sum(Transaction.quantity)).filter(
            Transaction.product_code == product_code,
            Transaction.transaction_type == "OUT",
            Transaction.transaction_date >= three_months_ago
        ).scalar() or 0

        # 3. 90일로 나눔 (일평균 출고량)
        avg_daily_outbound = total_outbound / 90.0

        # 안전재고 = (리드타임 + 버퍼 7일) × 일평균 출고량
        lead_time = product.lead_time_days if product.lead_time_days else 7
        safety_stock = (lead_time + 7) * avg_daily_outbound

        # MOQ 이상으로 설정
        moq = product.moq if product.moq else 1
        return max(round(safety_stock), moq)

    @staticmethod
    def get_transactions_optimized(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        product_code: Optional[str] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Transaction]:
        """최적화된 트랜잭션 목록 조회 - eager loading 사용"""
        query = db.query(Transaction).options(joinedload(Transaction.product))

        if product_code:
            query = query.filter(Transaction.product_code == product_code)

        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)

        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)

        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)

        return query.order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_transactions(
        db: Session,
        product_code: Optional[str] = None,
        transaction_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """트랜잭션 총 개수 조회"""
        query = db.query(func.count(Transaction.id))

        if product_code:
            query = query.filter(Transaction.product_code == product_code)

        if transaction_type:
            query = query.filter(Transaction.transaction_type == transaction_type)

        if start_date:
            query = query.filter(Transaction.transaction_date >= start_date)

        if end_date:
            query = query.filter(Transaction.transaction_date <= end_date)

        return query.scalar() or 0