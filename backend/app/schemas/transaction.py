"""
Transaction Pydantic schemas
"""
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime


class TransactionBase(BaseModel):
    """Base transaction schema"""
    transaction_type: Literal['IN', 'OUT', 'ADJUST', 'DISPOSAL'] = Field(..., description="거래 유형")
    product_code: str = Field(..., max_length=50, description="제품 코드")
    quantity: int = Field(..., description="수량")
    reason: Optional[str] = Field(None, max_length=100, description="사유")
    memo: Optional[str] = Field(None, description="메모")
    location: Optional[str] = Field(None, max_length=100, description="위치")


class TransactionCreate(TransactionBase):
    """Transaction creation schema"""
    created_by: Optional[str] = Field(None, max_length=100, description="생성자")
    transaction_date: Optional[datetime] = Field(None, description="거래 날짜")


class TransactionResponse(TransactionBase):
    """Transaction response schema"""
    id: UUID
    previous_stock: int
    new_stock: int
    created_by: Optional[str]
    transaction_date: datetime
    created_at: datetime
    updated_at: datetime

    # Checkpoint related fields
    affects_current_stock: bool = True
    checkpoint_id: Optional[UUID] = None

    # Related product info
    product_name: Optional[str] = None
    product_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TransactionListResponse(BaseModel):
    """Transaction list response schema"""
    success: bool = True
    data: List[TransactionResponse]
    pagination: Optional[dict] = None
    message: str = "Success"


class BatchTransactionCreate(BaseModel):
    """Batch transaction creation schema"""
    transactions: List[TransactionCreate]
    
    
class StockCountItem(BaseModel):
    """Stock count item for inventory check"""
    product_code: str = Field(..., max_length=50, description="제품 코드")
    physical_stock: int = Field(..., ge=0, description="실사 재고")
    explanation: Optional[str] = Field(None, min_length=10, description="불일치 설명")


class StockCountRequest(BaseModel):
    """Stock count request schema"""
    counts: List[StockCountItem]
    created_by: Optional[str] = Field(None, max_length=100)


class DailySummary(BaseModel):
    """일별 입출고 요약"""
    date: str
    in_count: int = 0
    in_quantity: float = 0
    out_count: int = 0
    out_quantity: float = 0
    adjustment_count: int = 0
    adjustment_quantity: float = 0
    return_count: int = 0
    return_quantity: float = 0
    transfer_count: int = 0
    transfer_quantity: float = 0


class TotalSummary(BaseModel):
    """전체 기간 요약"""
    in_count: int = 0
    in_quantity: float = 0
    out_count: int = 0
    out_quantity: float = 0
    adjustment_count: int = 0
    adjustment_quantity: float = 0
    return_count: int = 0
    return_quantity: float = 0
    transfer_count: int = 0
    transfer_quantity: float = 0


class TransactionSummaryResponse(BaseModel):
    """입출고 요약 응답"""
    start_date: datetime
    end_date: datetime
    daily_summary: List[DailySummary]
    total_summary: TotalSummary