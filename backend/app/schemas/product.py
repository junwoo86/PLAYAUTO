"""
Product Pydantic schemas
"""
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from decimal import Decimal
from uuid import UUID
from datetime import datetime


class ProductBase(BaseModel):
    """Base product schema"""
    product_code: str = Field(..., max_length=50, description="제품 코드")
    product_name: str = Field(..., max_length=200, description="제품명")
    category: Optional[str] = Field(None, max_length=100, description="카테고리")
    manufacturer: Optional[str] = Field(None, max_length=200, description="제조사")
    supplier: Optional[str] = Field(None, max_length=200, description="공급업체")
    supplier_email: Optional[EmailStr] = Field(None, description="공급업체 이메일")
    order_email_template: Optional[str] = Field(None, description="주문 이메일 템플릿")
    zone_id: Optional[str] = Field(None, max_length=50, description="구역 ID")
    unit: str = Field(default='개', max_length=20, description="단위")
    price: Decimal = Field(default=0, ge=0, description="가격")
    moq: int = Field(default=1, ge=1, description="최소 주문 수량")
    lead_time_days: int = Field(default=7, ge=0, description="리드타임(일)")


class ProductCreate(ProductBase):
    """Product creation schema"""
    current_stock: int = Field(default=0, ge=0, description="현재 재고")
    safety_stock: int = Field(default=0, ge=0, description="안전 재고")
    is_auto_calculated: bool = Field(default=False, description="자동 계산 여부")


class ProductUpdate(BaseModel):
    """Product update schema"""
    product_code: Optional[str] = Field(None, max_length=50)
    product_name: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=200)
    supplier: Optional[str] = Field(None, max_length=200)
    supplier_email: Optional[EmailStr] = None
    order_email_template: Optional[str] = None
    zone_id: Optional[str] = Field(None, max_length=50)
    unit: Optional[str] = Field(None, max_length=20)
    price: Optional[Decimal] = Field(None, ge=0)
    current_stock: Optional[int] = Field(None, ge=0)
    safety_stock: Optional[int] = Field(None, ge=0)
    is_auto_calculated: Optional[bool] = None
    moq: Optional[int] = Field(None, ge=1)
    lead_time_days: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Product response schema"""
    id: UUID
    current_stock: int
    safety_stock: int
    is_auto_calculated: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    """Product list response schema"""
    success: bool = True
    data: List[ProductResponse]
    pagination: Optional[dict] = None
    message: str = "Success"