"""
일일 수불부 스키마
"""
from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field


class DailyLedgerBase(BaseModel):
    """일일 수불부 기본 스키마"""
    ledger_date: date
    product_code: str
    beginning_stock: int
    total_inbound: int = 0
    total_outbound: int = 0
    adjustments: int = 0
    ending_stock: int


class DailyLedgerCreate(DailyLedgerBase):
    """일일 수불부 생성 스키마"""
    pass


class ProductInfo(BaseModel):
    """제품 정보"""
    product_code: str
    product_name: str
    unit: str


class DailyLedgerResponse(DailyLedgerBase):
    """일일 수불부 응답 스키마"""
    id: str
    created_at: str
    product: Optional[ProductInfo] = None
    
    class Config:
        from_attributes = True