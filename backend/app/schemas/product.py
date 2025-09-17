"""
Product Pydantic schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from decimal import Decimal
from datetime import datetime, date
from enum import Enum
from uuid import UUID


class CurrencyEnum(str, Enum):
    """Supported currencies"""
    KRW = "KRW"  # Korean Won
    USD = "USD"  # US Dollar


class ProductBase(BaseModel):
    """Base product schema"""
    product_code: str = Field(..., max_length=50, description="제품 코드")
    product_name: str = Field(..., max_length=200, description="제품명")
    barcode: Optional[str] = Field(None, max_length=100, description="바코드")
    category: Optional[str] = Field(None, max_length=100, description="카테고리")
    manufacturer: Optional[str] = Field(None, max_length=200, description="제조사")
    supplier: Optional[str] = Field(None, max_length=200, description="공급업체")
    supplier_email: Optional[str] = Field(None, max_length=200, description="공급업체 연락처")
    contact_email: Optional[EmailStr] = Field(None, description="담당자 이메일")
    order_email_template: Optional[str] = Field(None, description="주문 이메일 템플릿")
    zone_id: Optional[str] = Field(None, max_length=50, description="구역 ID")
    unit: str = Field(default='개', max_length=20, description="단위")
    warehouse_id: Optional[UUID] = Field(None, description="창고 ID")
    purchase_currency: CurrencyEnum = Field(default=CurrencyEnum.KRW, description="구매 통화 단위")
    sale_currency: CurrencyEnum = Field(default=CurrencyEnum.KRW, description="판매 통화 단위")
    purchase_price: Decimal = Field(default=0, ge=0, description="구매가")
    sale_price: Decimal = Field(default=0, ge=0, description="판매가")
    moq: int = Field(default=1, ge=1, description="최소 주문 수량")
    lead_time_days: int = Field(default=7, ge=0, description="리드타임(일)")
    memo: Optional[str] = Field(None, description="제품 메모")


class ProductCreate(ProductBase):
    """Product creation schema"""
    current_stock: int = Field(default=0, ge=0, description="현재 재고")
    safety_stock: int = Field(default=0, ge=0, description="안전 재고")
    is_auto_calculated: bool = Field(default=False, description="자동 계산 여부")


class ProductUpdate(BaseModel):
    """Product update schema"""
    product_code: Optional[str] = Field(None, max_length=50)
    product_name: Optional[str] = Field(None, max_length=200)
    barcode: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=200)
    supplier: Optional[str] = Field(None, max_length=200)
    supplier_email: Optional[str] = Field(None, max_length=200, description="공급업체 연락처")
    contact_email: Optional[EmailStr] = Field(None, description="담당자 이메일")
    order_email_template: Optional[str] = None
    zone_id: Optional[str] = Field(None, max_length=50)
    unit: Optional[str] = Field(None, max_length=20)
    warehouse_id: Optional[UUID] = Field(None, description="창고 ID")
    purchase_currency: Optional[CurrencyEnum] = Field(None, description="구매 통화 단위")
    sale_currency: Optional[CurrencyEnum] = Field(None, description="판매 통화 단위")
    purchase_price: Optional[Decimal] = Field(None, ge=0)
    sale_price: Optional[Decimal] = Field(None, ge=0)
    current_stock: Optional[int] = Field(None, ge=0)
    safety_stock: Optional[int] = Field(None, ge=0)
    is_auto_calculated: Optional[bool] = None
    moq: Optional[int] = Field(None, ge=1)
    lead_time_days: Optional[int] = Field(None, ge=0)
    memo: Optional[str] = Field(None, description="제품 메모")
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Product response schema"""
    purchase_currency: CurrencyEnum = Field(default=CurrencyEnum.KRW, description="구매 통화 단위")
    sale_currency: CurrencyEnum = Field(default=CurrencyEnum.KRW, description="판매 통화 단위")
    purchase_price: Decimal = Field(default=0, description="구매가")
    sale_price: Decimal = Field(default=0, description="판매가")
    current_stock: int = Field(default=0, description="현재 재고")
    safety_stock: int = Field(default=0, description="안전 재고")
    is_auto_calculated: bool = Field(default=False, description="자동 계산 여부")
    is_active: bool = Field(default=True, description="활성 상태")
    created_at: datetime
    updated_at: datetime
    
    # 불일치 정보 추가
    discrepancy: int = Field(default=0, description="7일간 재고 불일치 합계")
    has_pending_discrepancy: bool = Field(default=False, description="미해결 불일치 여부")
    last_discrepancy_date: Optional[datetime] = Field(None, description="마지막 불일치 날짜")
    discrepancy_count: int = Field(default=0, description="7일간 조정 건수")
    
    # 창고 정보 추가
    warehouse_id: Optional[UUID] = Field(None, description="창고 ID")
    warehouse_name: Optional[str] = Field(None, description="창고명")

    # 메모 필드 추가
    memo: Optional[str] = Field(None, description="제품 메모")

    # BOM 정보 추가
    bom: List[Dict[str, Any]] = Field(default_factory=list, description="BOM 구성 정보")

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    """Product list response schema"""
    success: bool = True
    data: List[ProductResponse]
    pagination: Optional[dict] = None
    message: str = "Success"


class PastQuantityResponse(BaseModel):
    """과거 수량 조회 응답"""
    product_code: str
    product_name: str
    target_date: date
    quantity: int
    current_stock: int
    transactions: List[Dict[str, Any]]