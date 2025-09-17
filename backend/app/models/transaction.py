"""
Transaction Model
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import BaseModel


class Transaction(BaseModel):
    """재고 트랜잭션 테이블"""
    __tablename__ = "transactions"
    
    # 트랜잭션 유형: inbound(입고), outbound(출고), adjustment(조정)
    transaction_type = Column(String(20), nullable=False, index=True)
    
    # 제품 정보
    product_code = Column(String(50), ForeignKey('products.product_code'), nullable=False, index=True)
    
    # 수량 정보
    quantity = Column(Integer, nullable=False)  # 양수: 증가, 음수: 감소
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    
    # 트랜잭션 상세
    reason = Column(String(100))  # 조정 사유
    memo = Column(Text)  # 상세 설명
    location = Column(String(100))  # 위치
    
    # 메타데이터
    created_by = Column(String(100))
    transaction_date = Column(DateTime(timezone=True), default=func.now(), index=True)
    
    # 관계
    product = relationship("Product", foreign_keys=[product_code], back_populates="transactions")
    
    def __repr__(self):
        return f"<Transaction {self.transaction_type}: {self.quantity} @ {self.transaction_date}>"