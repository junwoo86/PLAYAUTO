"""
Discrepancy Model for inventory discrepancies
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Discrepancy(BaseModel):
    """재고 불일치 추적 테이블"""
    __tablename__ = "discrepancies"
    
    # 제품 정보
    product_code = Column(String(50), ForeignKey('products.product_code'), nullable=False, index=True)
    
    # 재고 정보
    system_stock = Column(Integer, nullable=False)  # 시스템 재고
    physical_stock = Column(Integer, nullable=False)  # 실사 재고
    discrepancy = Column(Integer, nullable=False)  # 차이 (physical - system)
    
    # 처리 정보
    explanation = Column(Text)  # 불일치 원인 설명
    status = Column(String(20), default='pending', index=True)  # pending, resolved
    
    # 해결 정보
    resolved_at = Column(DateTime(timezone=True))
    resolved_by = Column(String(100))
    
    # 관계
    product = relationship("Product", foreign_keys=[product_code], back_populates="discrepancies")
    
    def __repr__(self):
        return f"<Discrepancy Product:{self.product_code} Diff:{self.discrepancy} Status:{self.status}>"