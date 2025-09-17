"""
Product BOM (Bill of Materials) Model for set products
"""
from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ProductBOM(BaseModel):
    """세트상품 BOM 테이블"""
    __tablename__ = "product_bom"
    
    # 상위 제품 (세트상품)
    parent_product_code = Column(String(50), ForeignKey('products.product_code'), nullable=False, index=True)
    
    # 하위 제품 (구성품)
    child_product_code = Column(String(50), ForeignKey('products.product_code'), nullable=False, index=True)
    
    # 수량 (상위 제품 1개당 필요한 하위 제품 수량)
    quantity = Column(Integer, nullable=False)
    
    # 관계
    parent_product = relationship("Product", foreign_keys=[parent_product_code], back_populates="parent_boms")
    child_product = relationship("Product", foreign_keys=[child_product_code], back_populates="child_boms")
    
    # 유니크 제약 조건: 상위-하위 조합은 유일해야 함
    __table_args__ = (
        UniqueConstraint('parent_product_code', 'child_product_code', name='uq_product_bom_parent_child'),
    )
    
    def __repr__(self):
        return f"<ProductBOM Parent:{self.parent_product_code} Child:{self.child_product_code} Qty:{self.quantity}>"