"""
Stock Checkpoint API Endpoints
"""
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from app.core.database import get_db
from app.models.stock_checkpoint import StockCheckpoint, CheckpointType
from app.models.product import Product
from app.models.transaction import Transaction
from app.schemas.stock_checkpoint import (
    StockCheckpointCreate,
    StockCheckpointUpdate,
    StockCheckpointResponse,
    StockCheckpointValidation
)

router = APIRouter()


@router.post("/", response_model=StockCheckpointResponse)
def create_checkpoint(
    checkpoint: StockCheckpointCreate,
    db: Session = Depends(get_db)
):
    """체크포인트 생성"""

    # 제품 확인
    product = db.query(Product).filter(Product.product_code == checkpoint.product_code).first()
    if not product:
        raise HTTPException(status_code=404, detail=f"제품을 찾을 수 없습니다: {checkpoint.product_code}")

    # 동일 날짜, 동일 타입의 체크포인트가 이미 있는지 확인
    existing = db.query(StockCheckpoint).filter(
        and_(
            StockCheckpoint.product_code == checkpoint.product_code,
            StockCheckpoint.checkpoint_date == checkpoint.checkpoint_date,
            StockCheckpoint.checkpoint_type == checkpoint.checkpoint_type.value
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="동일한 날짜와 타입의 체크포인트가 이미 존재합니다"
        )

    # 체크포인트 생성
    db_checkpoint = StockCheckpoint(
        product_code=checkpoint.product_code,
        checkpoint_date=checkpoint.checkpoint_date,
        checkpoint_type=CheckpointType[checkpoint.checkpoint_type.value],
        confirmed_stock=checkpoint.confirmed_stock,
        reason=checkpoint.reason,
        created_by=checkpoint.created_by,
        is_active=True
    )

    db.add(db_checkpoint)

    # 이 체크포인트 이전의 모든 거래를 affects_current_stock = False로 변경
    db.query(Transaction).filter(
        and_(
            Transaction.product_code == checkpoint.product_code,
            Transaction.transaction_date < checkpoint.checkpoint_date,
            Transaction.affects_current_stock == True
        )
    ).update(
        {
            "affects_current_stock": False,
            "checkpoint_id": db_checkpoint.id
        },
        synchronize_session=False
    )

    # 제품의 현재 재고를 체크포인트 재고로 업데이트
    product.current_stock = checkpoint.confirmed_stock

    db.commit()
    db.refresh(db_checkpoint)

    return db_checkpoint


@router.get("/{checkpoint_id}", response_model=StockCheckpointResponse)
def get_checkpoint(
    checkpoint_id: UUID,
    db: Session = Depends(get_db)
):
    """체크포인트 조회"""
    checkpoint = db.query(StockCheckpoint).filter(StockCheckpoint.id == checkpoint_id).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="체크포인트를 찾을 수 없습니다")

    return checkpoint


@router.get("/", response_model=List[StockCheckpointResponse])
def get_checkpoints(
    product_code: Optional[str] = None,
    checkpoint_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_active: Optional[bool] = True,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """체크포인트 목록 조회"""
    query = db.query(StockCheckpoint)

    if product_code:
        query = query.filter(StockCheckpoint.product_code == product_code)

    if checkpoint_type:
        query = query.filter(StockCheckpoint.checkpoint_type == CheckpointType[checkpoint_type])

    if start_date:
        query = query.filter(StockCheckpoint.checkpoint_date >= start_date)

    if end_date:
        query = query.filter(StockCheckpoint.checkpoint_date <= end_date)

    if is_active is not None:
        query = query.filter(StockCheckpoint.is_active == is_active)

    checkpoints = query.order_by(desc(StockCheckpoint.checkpoint_date)).offset(skip).limit(limit).all()

    return checkpoints


@router.put("/{checkpoint_id}", response_model=StockCheckpointResponse)
def update_checkpoint(
    checkpoint_id: UUID,
    checkpoint_update: StockCheckpointUpdate,
    db: Session = Depends(get_db)
):
    """체크포인트 수정 (사유, 활성 상태만 변경 가능)"""
    checkpoint = db.query(StockCheckpoint).filter(StockCheckpoint.id == checkpoint_id).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="체크포인트를 찾을 수 없습니다")

    if checkpoint_update.reason is not None:
        checkpoint.reason = checkpoint_update.reason

    if checkpoint_update.is_active is not None:
        checkpoint.is_active = checkpoint_update.is_active

    db.commit()
    db.refresh(checkpoint)

    return checkpoint


from pydantic import BaseModel

class TransactionValidationRequest(BaseModel):
    product_code: str
    transaction_date: datetime

@router.post("/validate-transaction", response_model=StockCheckpointValidation)
def validate_transaction(
    request: TransactionValidationRequest,
    db: Session = Depends(get_db)
):
    """거래 날짜가 체크포인트 이전인지 검증"""

    # 해당 제품의 가장 최근 활성 체크포인트 조회
    latest_checkpoint = db.query(StockCheckpoint).filter(
        and_(
            StockCheckpoint.product_code == request.product_code,
            StockCheckpoint.is_active == True,
            StockCheckpoint.checkpoint_date <= request.transaction_date
        )
    ).order_by(desc(StockCheckpoint.checkpoint_date)).first()

    if latest_checkpoint:
        # 체크포인트가 존재하고 거래 날짜가 체크포인트 이후인 경우
        return StockCheckpointValidation(
            is_valid=False,
            message=f"이 거래는 {latest_checkpoint.checkpoint_date.strftime('%Y-%m-%d')} 체크포인트 이전 거래입니다. 현재 재고에는 반영되지 않습니다.",
            affects_current_stock=False,
            checkpoint_id=latest_checkpoint.id
        )

    # 체크포인트가 없거나 거래 날짜가 모든 체크포인트 이후인 경우
    return StockCheckpointValidation(
        is_valid=True,
        message=None,
        affects_current_stock=True,
        checkpoint_id=None
    )


@router.delete("/{checkpoint_id}")
def delete_checkpoint(
    checkpoint_id: UUID,
    db: Session = Depends(get_db)
):
    """체크포인트 삭제 (비활성화)"""
    checkpoint = db.query(StockCheckpoint).filter(StockCheckpoint.id == checkpoint_id).first()
    if not checkpoint:
        raise HTTPException(status_code=404, detail="체크포인트를 찾을 수 없습니다")

    # 실제로 삭제하지 않고 비활성화만 함
    checkpoint.is_active = False

    # 관련 거래들의 affects_current_stock를 다시 True로 변경
    db.query(Transaction).filter(
        Transaction.checkpoint_id == checkpoint_id
    ).update(
        {
            "affects_current_stock": True,
            "checkpoint_id": None
        },
        synchronize_session=False
    )

    db.commit()

    return {"message": "체크포인트가 비활성화되었습니다"}