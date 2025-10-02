"""
Disposal Loss Report API
폐기 손실 리포트 API
"""
from typing import Optional, List
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.api.deps import get_current_db
from app.models.transaction import Transaction
from app.models.product import Product
from pydantic import BaseModel

router = APIRouter()


class DisposalSummary(BaseModel):
    """폐기 요약 정보"""
    total_disposal_count: int  # 총 폐기 건수
    total_disposal_quantity: int  # 총 폐기 수량
    total_loss_amount: float  # 총 손실 금액
    period_start: date
    period_end: date


class DisposalDetail(BaseModel):
    """폐기 상세 정보"""
    id: str
    product_code: str
    product_name: str
    disposal_date: datetime
    quantity: int
    unit_price: float
    loss_amount: float
    reason: Optional[str]
    created_by: Optional[str]


class DisposalByProduct(BaseModel):
    """제품별 폐기 집계"""
    product_code: str
    product_name: str
    total_quantity: int
    total_loss: float
    disposal_count: int


class DisposalByReason(BaseModel):
    """사유별 폐기 집계"""
    reason: str
    count: int
    total_quantity: int
    total_loss: float


@router.get("/summary", response_model=DisposalSummary)
def get_disposal_summary(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    db: Session = Depends(get_current_db)
):
    """
    폐기 손실 요약 정보 조회
    """
    # 기본값: 최근 30일
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # DISPOSAL 타입 거래 조회
    query = db.query(
        func.count(Transaction.id).label('count'),
        func.sum(Transaction.quantity).label('total_quantity'),
        func.sum(Transaction.quantity * Product.purchase_price).label('total_loss')
    ).join(
        Product, Transaction.product_code == Product.product_code
    ).filter(
        and_(
            Transaction.transaction_type == 'DISPOSAL',
            func.date(Transaction.transaction_date) >= start_date,
            func.date(Transaction.transaction_date) <= end_date
        )
    )

    result = query.first()

    return DisposalSummary(
        total_disposal_count=result.count or 0,
        total_disposal_quantity=result.total_quantity or 0,
        total_loss_amount=float(result.total_loss or 0),
        period_start=start_date,
        period_end=end_date
    )


@router.get("/details", response_model=List[DisposalDetail])
def get_disposal_details(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    product_code: Optional[str] = Query(None, description="제품 코드"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_current_db)
):
    """
    폐기 상세 내역 조회
    """
    # 기본값: 최근 30일
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    query = db.query(Transaction).join(
        Product, Transaction.product_code == Product.product_code
    ).filter(
        Transaction.transaction_type == 'DISPOSAL'
    )

    # 날짜 필터
    query = query.filter(
        and_(
            func.date(Transaction.transaction_date) >= start_date,
            func.date(Transaction.transaction_date) <= end_date
        )
    )

    # 제품 필터
    if product_code:
        query = query.filter(Transaction.product_code == product_code)

    # 정렬 및 페이징
    transactions = query.order_by(
        Transaction.transaction_date.desc()
    ).offset(skip).limit(limit).all()

    results = []
    for trans in transactions:
        product = trans.product
        loss_amount = trans.quantity * float(product.purchase_price or 0)

        results.append(DisposalDetail(
            id=str(trans.id),
            product_code=trans.product_code,
            product_name=product.product_name,
            disposal_date=trans.transaction_date,
            quantity=trans.quantity,
            unit_price=float(product.purchase_price or 0),
            loss_amount=loss_amount,
            reason=trans.reason,
            created_by=trans.created_by
        ))

    return results


@router.get("/by-product", response_model=List[DisposalByProduct])
def get_disposal_by_product(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    limit: int = Query(10, ge=1, le=100, description="상위 N개"),
    db: Session = Depends(get_current_db)
):
    """
    제품별 폐기 현황 (상위 N개)
    """
    # 기본값: 최근 30일
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    query = db.query(
        Transaction.product_code,
        Product.product_name,
        func.sum(Transaction.quantity).label('total_quantity'),
        func.sum(Transaction.quantity * Product.purchase_price).label('total_loss'),
        func.count(Transaction.id).label('disposal_count')
    ).join(
        Product, Transaction.product_code == Product.product_code
    ).filter(
        and_(
            Transaction.transaction_type == 'DISPOSAL',
            func.date(Transaction.transaction_date) >= start_date,
            func.date(Transaction.transaction_date) <= end_date
        )
    ).group_by(
        Transaction.product_code,
        Product.product_name
    ).order_by(
        func.sum(Transaction.quantity * Product.purchase_price).desc()
    ).limit(limit)

    results = []
    for row in query.all():
        results.append(DisposalByProduct(
            product_code=row.product_code,
            product_name=row.product_name,
            total_quantity=row.total_quantity or 0,
            total_loss=float(row.total_loss or 0),
            disposal_count=row.disposal_count or 0
        ))

    return results


@router.get("/by-reason", response_model=List[DisposalByReason])
def get_disposal_by_reason(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    db: Session = Depends(get_current_db)
):
    """
    사유별 폐기 현황
    """
    # 기본값: 최근 30일
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    query = db.query(
        Transaction.reason,
        func.count(Transaction.id).label('count'),
        func.sum(Transaction.quantity).label('total_quantity'),
        func.sum(Transaction.quantity * Product.purchase_price).label('total_loss')
    ).join(
        Product, Transaction.product_code == Product.product_code
    ).filter(
        and_(
            Transaction.transaction_type == 'DISPOSAL',
            func.date(Transaction.transaction_date) >= start_date,
            func.date(Transaction.transaction_date) <= end_date
        )
    ).group_by(
        Transaction.reason
    ).order_by(
        func.sum(Transaction.quantity * Product.purchase_price).desc()
    )

    results = []
    for row in query.all():
        reason_display = row.reason or '미지정'
        if row.reason == 'return_damaged':
            reason_display = '반품(파손)'
        elif row.reason == 'expiry':
            reason_display = '유효기간 만료'
        elif row.reason == 'quality_issue':
            reason_display = '품질 문제'

        results.append(DisposalByReason(
            reason=reason_display,
            count=row.count or 0,
            total_quantity=row.total_quantity or 0,
            total_loss=float(row.total_loss or 0)
        ))

    return results