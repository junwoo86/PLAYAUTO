"""
일일 수불부 API 엔드포인트
"""
from typing import List, Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.api.deps import get_current_db
from app.models.daily_ledger import DailyLedger
from app.models.transaction import Transaction
from app.models.product import Product
from app.schemas.daily_ledger import DailyLedgerCreate, DailyLedgerResponse

router = APIRouter()


@router.get("/", response_model=List[DailyLedgerResponse])
def get_daily_ledgers(
    ledger_date: Optional[date] = Query(None, description="조회할 날짜"),
    product_code: Optional[str] = Query(None, description="제품 코드"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_current_db)
):
    """
    일일 수불부 조회
    - 날짜별 조회
    - 제품별 조회
    - 전체 조회
    """
    query = db.query(DailyLedger)
    
    if ledger_date:
        query = query.filter(DailyLedger.ledger_date == ledger_date)
    if product_code:
        query = query.filter(DailyLedger.product_code == product_code)
    
    # 제품 정보와 조인
    query = query.join(Product, DailyLedger.product_code == Product.product_code)
    
    ledgers = query.order_by(DailyLedger.ledger_date.desc()).offset(skip).limit(limit).all()
    
    # 제품 정보 추가
    result = []
    for ledger in ledgers:
        product = db.query(Product).filter(Product.product_code == ledger.product_code).first()
        ledger_dict = {
            "id": str(ledger.id),
            "ledger_date": ledger.ledger_date.isoformat(),
            "product_code": ledger.product_code,
            "beginning_stock": ledger.beginning_stock,
            "total_inbound": ledger.total_inbound,
            "total_outbound": ledger.total_outbound,
            "adjustments": ledger.adjustments,
            "ending_stock": ledger.ending_stock,
            "created_at": ledger.created_at.isoformat(),
            "product": {
                "product_code": product.product_code,
                "product_name": product.product_name,
                "unit": product.unit
            } if product else None
        }
        result.append(ledger_dict)
    
    return result


@router.post("/generate", response_model=dict)
def generate_daily_ledger(
    target_date: date = Query(..., description="생성할 날짜"),
    db: Session = Depends(get_current_db)
):
    """
    특정 날짜의 일일 수불부 생성/재생성
    """
    # 기존 데이터 삭제
    db.query(DailyLedger).filter(DailyLedger.ledger_date == target_date).delete()
    
    # 모든 활성 제품 조회
    products = db.query(Product).filter(Product.is_active == True).all()
    
    ledgers_created = 0
    
    for product in products:
        # 전날 마감 재고 조회
        yesterday = target_date - timedelta(days=1)
        yesterday_ledger = db.query(DailyLedger).filter(
            and_(
                DailyLedger.product_code == product.product_code,
                DailyLedger.ledger_date == yesterday
            )
        ).first()
        
        beginning_stock = yesterday_ledger.ending_stock if yesterday_ledger else product.current_stock
        
        # 당일 거래 집계
        transactions = db.query(Transaction).filter(
            and_(
                Transaction.product_code == product.product_code,
                func.date(Transaction.created_at) == target_date
            )
        ).all()
        
        total_inbound = sum(t.quantity for t in transactions if t.transaction_type in ['IN', 'return'])
        total_outbound = sum(t.quantity for t in transactions if t.transaction_type == 'OUT')
        adjustments = sum(
            t.new_stock - t.previous_stock 
            for t in transactions 
            if t.transaction_type == 'ADJUST'
        )
        
        ending_stock = beginning_stock + total_inbound - total_outbound + adjustments
        
        # 일일 수불부 생성
        ledger = DailyLedger(
            ledger_date=target_date,
            product_code=product.product_code,
            beginning_stock=beginning_stock,
            total_inbound=total_inbound,
            total_outbound=total_outbound,
            adjustments=adjustments,
            ending_stock=ending_stock
        )
        
        db.add(ledger)
        ledgers_created += 1
    
    db.commit()
    
    return {
        "message": f"{target_date} 일자 수불부 생성 완료",
        "ledgers_created": ledgers_created
    }


@router.get("/summary", response_model=dict)
def get_ledger_summary(
    target_date: date = Query(..., description="조회할 날짜"),
    db: Session = Depends(get_current_db)
):
    """
    특정 날짜의 수불부 요약 조회
    """
    ledgers = db.query(DailyLedger).filter(
        DailyLedger.ledger_date == target_date
    ).all()
    
    if not ledgers:
        return {
            "date": target_date.isoformat(),
            "total_products": 0,
            "total_inbound": 0,
            "total_outbound": 0,
            "total_adjustments": 0
        }
    
    return {
        "date": target_date.isoformat(),
        "total_products": len(ledgers),
        "total_inbound": sum(l.total_inbound for l in ledgers),
        "total_outbound": sum(l.total_outbound for l in ledgers),
        "total_adjustments": sum(l.adjustments for l in ledgers)
    }