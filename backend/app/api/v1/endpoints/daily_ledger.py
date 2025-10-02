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
from app.models.stock_checkpoint import StockCheckpoint, CheckpointType
from app.schemas.daily_ledger import DailyLedgerCreate, DailyLedgerResponse

router = APIRouter()


def should_create_checkpoint(
    product_code: str,
    target_date: date,
    db: Session
) -> bool:
    """
    체크포인트를 생성해야 하는지 판단

    Args:
        product_code: 제품 코드
        target_date: 수불부 생성 날짜
        db: DB 세션

    Returns:
        True: 체크포인트 생성 필요
        False: 체크포인트 생성 불필요 (이미 있거나 미래 체크포인트 존재)
    """
    # target_date 당일 또는 이후의 체크포인트가 있는지 확인
    future_checkpoint = db.query(StockCheckpoint).filter(
        and_(
            StockCheckpoint.product_code == product_code,
            func.date(StockCheckpoint.checkpoint_date) >= target_date,
            StockCheckpoint.is_active == True
        )
    ).first()

    # 미래 체크포인트가 없으면 생성 가능
    return future_checkpoint is None


def get_beginning_stock(
    product_code: str,
    target_date: date,
    db: Session
) -> int:
    """
    beginning_stock 계산 (체크포인트를 고려한 정확한 계산)

    Args:
        product_code: 제품 코드
        target_date: 수불부 생성 날짜
        db: DB 세션

    Returns:
        beginning_stock: 해당 날짜의 기초 재고
    """
    # 1. target_date 이전의 가장 최근 체크포인트 찾기
    latest_checkpoint = db.query(StockCheckpoint).filter(
        and_(
            StockCheckpoint.product_code == product_code,
            func.date(StockCheckpoint.checkpoint_date) < target_date,
            StockCheckpoint.is_active == True
        )
    ).order_by(StockCheckpoint.checkpoint_date.desc()).first()

    if latest_checkpoint:
        # 체크포인트가 있으면 체크포인트 ~ 전날까지의 거래를 집계
        checkpoint_date = latest_checkpoint.checkpoint_date.date()
        yesterday = target_date - timedelta(days=1)

        # 체크포인트 이후 ~ 전날까지의 거래만 조회
        transactions = db.query(Transaction).filter(
            and_(
                Transaction.product_code == product_code,
                func.date(Transaction.transaction_date) > checkpoint_date,
                func.date(Transaction.transaction_date) <= yesterday,
                Transaction.affects_current_stock == True,
                Transaction.transaction_type != 'DISPOSAL'
            )
        ).all()

        # 체크포인트의 confirmed_stock부터 시작
        stock = latest_checkpoint.confirmed_stock

        # 거래 집계
        for t in transactions:
            if t.transaction_type in ['IN', 'return']:
                stock += t.quantity
            elif t.transaction_type == 'OUT':
                stock -= t.quantity
            elif t.transaction_type == 'ADJUST':
                # 조정의 경우 new_stock - previous_stock 차이를 적용
                stock += (t.new_stock - t.previous_stock)

        return stock
    else:
        # 체크포인트가 없으면 기존 로직: 전날 수불부 또는 current_stock
        yesterday = target_date - timedelta(days=1)
        yesterday_ledger = db.query(DailyLedger).filter(
            and_(
                DailyLedger.product_code == product_code,
                DailyLedger.ledger_date == yesterday
            )
        ).first()

        if yesterday_ledger:
            return yesterday_ledger.ending_stock
        else:
            product = db.query(Product).filter(
                Product.product_code == product_code
            ).first()
            return product.current_stock if product else 0


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
    create_checkpoint: bool = Query(False, description="체크포인트 명시적 생성 여부"),
    db: Session = Depends(get_current_db)
):
    """
    특정 날짜의 일일 수불부 생성/재생성

    체크포인트 생성 로직:
    1. create_checkpoint=True: 무조건 체크포인트 생성
    2. create_checkpoint=False: 스마트 판단
       - target_date에 체크포인트가 없고
       - target_date 이후의 체크포인트도 없으면
       - 자동으로 체크포인트 생성

    이를 통해 과거 날짜 수불부 생성 시에도 체크포인트가 자동 생성됨
    """
    # 기존 데이터 삭제
    db.query(DailyLedger).filter(DailyLedger.ledger_date == target_date).delete()

    # 모든 활성 제품 조회
    products = db.query(Product).filter(Product.is_active == True).all()

    ledgers_created = 0
    checkpoints_created = 0

    # 체크포인트를 생성할 날짜/시간 (해당 날짜의 23:59:59로 설정)
    checkpoint_datetime = datetime.combine(target_date, datetime.max.time())

    for product in products:
        # beginning_stock 계산 (체크포인트를 고려한 정확한 계산)
        beginning_stock = get_beginning_stock(product.product_code, target_date, db)

        # 당일 거래 집계 (체크포인트로 무효화된 거래 및 DISPOSAL 제외)
        transactions = db.query(Transaction).filter(
            and_(
                Transaction.product_code == product.product_code,
                func.date(Transaction.transaction_date) == target_date,
                Transaction.affects_current_stock == True,  # 유효한 트랜잭션만 포함
                Transaction.transaction_type != 'DISPOSAL'  # 폐기 거래 제외
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

        # 체크포인트 생성 판단
        # 1. create_checkpoint=True: 명시적으로 생성 요청
        # 2. create_checkpoint=False이지만 should_create_checkpoint()가 True: 자동 생성
        should_create = create_checkpoint or should_create_checkpoint(
            product.product_code, target_date, db
        )

        if should_create:
            # 기존 체크포인트 확인 (중복 생성 방지)
            existing_checkpoint = db.query(StockCheckpoint).filter(
                and_(
                    StockCheckpoint.product_code == product.product_code,
                    func.date(StockCheckpoint.checkpoint_date) == target_date,
                    StockCheckpoint.checkpoint_type == CheckpointType.DAILY_CLOSE
                )
            ).first()

            if not existing_checkpoint:
                checkpoint = StockCheckpoint(
                    product_code=product.product_code,
                    checkpoint_date=checkpoint_datetime,
                    checkpoint_type=CheckpointType.DAILY_CLOSE,
                    confirmed_stock=ending_stock,
                    reason=f"{target_date} 일일 마감",
                    created_by="system",
                    is_active=True
                )
                db.add(checkpoint)
                db.flush()

                # 이 체크포인트 이전의 모든 거래를 affects_current_stock = False로 변경
                db.query(Transaction).filter(
                    and_(
                        Transaction.product_code == product.product_code,
                        Transaction.transaction_date <= checkpoint_datetime,
                        Transaction.affects_current_stock == True
                    )
                ).update(
                    {
                        "affects_current_stock": False,
                        "checkpoint_id": checkpoint.id
                    },
                    synchronize_session=False
                )

                checkpoints_created += 1

    db.commit()

    result = {
        "message": f"{target_date} 일자 수불부 생성 완료",
        "ledgers_created": ledgers_created,
        "checkpoints_created": checkpoints_created
    }

    if checkpoints_created > 0:
        result["checkpoint_message"] = f"{checkpoints_created}개의 일일 마감 체크포인트 생성됨 (자동 생성 포함)"

    return result


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