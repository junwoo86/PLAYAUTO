"""
Stock Checkpoint Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum


class CheckpointTypeSchema(str, Enum):
    """체크포인트 유형"""
    ADJUST = "ADJUST"           # 재고 조정
    DAILY_CLOSE = "DAILY_CLOSE" # 일일 마감
    MONTHLY = "MONTHLY"         # 월말 결산


class StockCheckpointBase(BaseModel):
    """체크포인트 기본 스키마"""
    product_code: str = Field(..., description="제품 코드")
    checkpoint_date: datetime = Field(..., description="체크포인트 날짜")
    checkpoint_type: CheckpointTypeSchema = Field(..., description="체크포인트 유형")
    confirmed_stock: int = Field(..., description="확정 재고량")
    reason: Optional[str] = Field(None, description="사유")
    created_by: Optional[str] = Field(None, description="생성자")


class StockCheckpointCreate(StockCheckpointBase):
    """체크포인트 생성 스키마"""
    pass


class StockCheckpointUpdate(BaseModel):
    """체크포인트 수정 스키마"""
    reason: Optional[str] = None
    is_active: Optional[bool] = None


class StockCheckpointResponse(StockCheckpointBase):
    """체크포인트 응답 스키마"""
    id: UUID
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class StockCheckpointValidation(BaseModel):
    """체크포인트 검증 결과"""
    is_valid: bool
    message: Optional[str] = None
    affects_current_stock: bool = True
    checkpoint_id: Optional[UUID] = None