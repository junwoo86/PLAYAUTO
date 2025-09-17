"""
Purchase Order Models
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Text, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class PurchaseOrder(BaseModel):
    """발주서 테이블"""
    __tablename__ = "purchase_orders"
    
    # 발주서 정보
    po_number = Column(String(50), unique=True, nullable=False, index=True)
    supplier = Column(String(200))
    
    # 상태: draft(임시저장), waiting(입고대기), partial(부분입고), completed(완료)
    status = Column(String(20), default='draft', index=True)
    
    # 금액 및 날짜
    total_amount = Column(Numeric(12, 2))
    expected_date = Column(Date)
    
    # 기타
    notes = Column(Text)
    created_by = Column(String(100))
    
    # 관계
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<PurchaseOrder {self.po_number}: {self.status}>"


class PurchaseOrderItem(BaseModel):
    """발주 상세 테이블"""
    __tablename__ = "purchase_order_items"
    
    # 발주서 참조
    po_id = Column(UUID(as_uuid=True), ForeignKey('purchase_orders.id'), nullable=False, index=True)
    
    # 제품 정보
    product_code = Column(String(50), ForeignKey('products.product_code'), nullable=False, index=True)
    
    # 수량 및 가격
    ordered_quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, default=0)
    unit_price = Column(Numeric(12, 2))
    subtotal = Column(Numeric(12, 2))
    
    # 상태: pending(대기), partial(부분입고), completed(완료)
    status = Column(String(20), default='pending')
    
    # 관계
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", foreign_keys=[product_code], back_populates="purchase_order_items")
    
    def __repr__(self):
        return f"<POItem PO:{self.po_id} Product:{self.product_code} Qty:{self.ordered_quantity}>"