"""
Product Model
"""
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Product(BaseModel):
    """제품 마스터 테이블"""
    __tablename__ = "products"
    
    # 기본 정보
    product_code = Column(String(50), unique=True, nullable=False, index=True)
    product_name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), index=True)
    manufacturer = Column(String(200))
    
    # 공급업체 정보
    supplier = Column(String(200))
    supplier_email = Column(String(200))
    order_email_template = Column(Text)
    
    # 위치 및 단위
    zone_id = Column(String(50))
    unit = Column(String(20), default='개')
    
    # 재고 정보
    price = Column(Numeric(12, 2), default=0)
    current_stock = Column(Integer, default=0)
    safety_stock = Column(Integer, default=0)
    is_auto_calculated = Column(Boolean, default=False)
    
    # 발주 정보
    moq = Column(Integer, default=1)  # Minimum Order Quantity
    lead_time_days = Column(Integer, default=7)
    
    # 상태
    is_active = Column(Boolean, default=True)
    
    # 관계
    transactions = relationship("Transaction", back_populates="product", cascade="all, delete-orphan")
    discrepancies = relationship("Discrepancy", back_populates="product", cascade="all, delete-orphan")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="product")
    daily_ledgers = relationship("DailyLedger", back_populates="product", cascade="all, delete-orphan")
    
    # BOM 관계 (세트상품)
    parent_boms = relationship("ProductBOM", foreign_keys="ProductBOM.parent_product_id", back_populates="parent_product")
    child_boms = relationship("ProductBOM", foreign_keys="ProductBOM.child_product_id", back_populates="child_product")
    
    def __repr__(self):
        return f"<Product {self.product_code}: {self.product_name}>"