"""
Transaction Service Layer
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.transaction import Transaction
from app.models.product import Product
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
        
        # 현재 재고 확인
        previous_stock = product.current_stock
        
        # 새로운 재고 계산
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
        else:  # ADJUST
            # 조정은 직접 재고를 설정하는 것이 아니라 차이를 기록
            new_stock = previous_stock + transaction_create.quantity
        
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
            transaction_date=ensure_timezone_aware(transaction_create.transaction_date)
        )
        
        # 제품 재고 업데이트
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
        Safety Stock = (Lead Time + Buffer Days) * Average Daily Outbound
        """
        from datetime import timedelta
        
        # 제품 정보 조회
        product = db.query(Product).filter(Product.product_code == product_code).first()
        if not product:
            return 0
        
        # 3개월 전 날짜
        three_months_ago = get_current_utc_time() - timedelta(days=90)
        
        # 3개월간 출고량 합계
        total_outbound = db.query(func.sum(Transaction.quantity)).filter(
            Transaction.product_code == product_code,
            Transaction.transaction_type == "outbound",
            Transaction.transaction_date >= three_months_ago
        ).scalar() or 0
        
        # 출고가 있었던 일수
        days_with_outbound = db.query(func.count(func.distinct(func.date(Transaction.transaction_date)))).filter(
            Transaction.product_code == product_code,
            Transaction.transaction_type == "outbound",
            Transaction.transaction_date >= three_months_ago
        ).scalar() or 1
        
        # 일평균 출고량
        avg_daily_outbound = total_outbound / max(days_with_outbound, 1)
        
        # 안전재고 = (리드타임 + 버퍼 7일) × 일평균 출고량
        safety_stock = (product.lead_time_days + 7) * avg_daily_outbound
        
        # MOQ 이상으로 설정
        return max(round(safety_stock), product.moq)