"""
Product BOM 스키마 정의
"""
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, validator


class ProductBOMBase(BaseModel):
    """BOM 기본 스키마"""
    parent_product_code: str = Field(..., description="부모 제품 코드 (세트 상품)")
    child_product_code: str = Field(..., description="자식 제품 코드 (구성품)")
    quantity: int = Field(..., gt=0, description="필요 수량")

    @validator('parent_product_code', 'child_product_code')
    def validate_product_code(cls, v):
        if not v or not v.strip():
            raise ValueError("제품 코드는 필수입니다")
        return v.strip()

    @validator('quantity')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("수량은 0보다 커야 합니다")
        return v


class ProductBOMCreate(ProductBOMBase):
    """BOM 생성 스키마"""
    pass


class ProductBOMUpdate(BaseModel):
    """BOM 수정 스키마"""
    quantity: Optional[int] = Field(None, gt=0, description="필요 수량")


class ProductBOMResponse(ProductBOMBase):
    """BOM 응답 스키마"""
    id: UUID
    parent_product_name: Optional[str] = None
    child_product_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProductBOMListResponse(BaseModel):
    """BOM 목록 응답 스키마"""
    items: List[ProductBOMResponse]
    total: int
    skip: int
    limit: int


class ComponentStock(BaseModel):
    """구성품 재고 정보"""
    product_code: str
    product_name: str
    required_quantity: int = Field(..., description="세트당 필요 수량")
    current_stock: int = Field(..., description="현재 재고")
    possible_sets: int = Field(..., description="생산 가능한 세트 수")


class SetProductStockResponse(BaseModel):
    """세트 상품 재고 응답"""
    parent_product_code: str
    possible_sets: int = Field(..., description="생산 가능한 세트 수")
    components: List[ComponentStock] = Field(..., description="구성품 재고 정보")


class BOMTreeNode(BaseModel):
    """BOM 트리 구조 노드"""
    product_code: str
    product_name: str
    quantity: int
    level: int = Field(..., description="트리 레벨 (0: 최상위)")
    children: List['BOMTreeNode'] = []

    class Config:
        from_attributes = True


# Forward reference 해결
BOMTreeNode.model_rebuild()


class BOMValidationResult(BaseModel):
    """BOM 검증 결과"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []


class BOMCostCalculation(BaseModel):
    """BOM 원가 계산"""
    parent_product_code: str
    total_cost: float = Field(..., description="총 원가")
    components: List[dict] = Field(..., description="구성품별 원가")


class BulkBOMCreate(BaseModel):
    """BOM 일괄 생성"""
    parent_product_code: str = Field(..., description="세트 상품 코드")
    components: List[dict] = Field(..., description="구성품 리스트")

    @validator('components')
    def validate_components(cls, v):
        if not v:
            raise ValueError("최소 하나 이상의 구성품이 필요합니다")

        for component in v:
            if 'child_product_code' not in component:
                raise ValueError("구성품 코드가 필요합니다")
            if 'quantity' not in component or component['quantity'] <= 0:
                raise ValueError("수량은 0보다 커야 합니다")

        return v