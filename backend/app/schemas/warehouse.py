"""
Warehouse Schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID

# Warehouse Base Schema
class WarehouseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="창고명")
    description: Optional[str] = Field(None, description="창고 설명")
    location: Optional[str] = Field(None, max_length=255, description="창고 위치")
    is_active: bool = Field(True, description="활성화 상태")

# Warehouse Create Schema
class WarehouseCreate(WarehouseBase):
    pass

# Warehouse Update Schema
class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="창고명")
    description: Optional[str] = Field(None, description="창고 설명")
    location: Optional[str] = Field(None, max_length=255, description="창고 위치")
    is_active: Optional[bool] = Field(None, description="활성화 상태")

# Warehouse Response Schema
class WarehouseResponse(WarehouseBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    product_count: Optional[int] = Field(0, description="창고 내 제품 수")
    
    class Config:
        from_attributes = True

# Warehouse List Response
class WarehouseListResponse(BaseModel):
    items: list[WarehouseResponse]
    total: int
    page: int
    pages: int
    limit: int