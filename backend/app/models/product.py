"""
Product Model
"""
from sqlalchemy import Column, String, Integer, Numeric, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
import uuid

from app.core.database import Base


class Product(Base):
    """제품 마스터 테이블"""
    __tablename__ = "products"
    
    # 기본 정보 - product_code를 Primary Key로 설정
    product_code = Column(String(50), primary_key=True, nullable=False)
    product_name = Column(String(200), nullable=False, index=True)
    barcode = Column(String(100), index=True)  # 바코드 추가
    category = Column(String(100), index=True)
    manufacturer = Column(String(200))

    # 공급업체 정보
    supplier = Column(String(200))
    supplier_email = Column(String(200))  # 공급업체 연락처로 사용
    contact_email = Column(String(200))  # 담당자 이메일 추가
    order_email_template = Column(Text)
    
    # 위치 및 단위
    zone_id = Column(String(50))
    unit = Column(String(20), default='개')
    warehouse_id = Column(PostgresUUID(as_uuid=True), ForeignKey('playauto_platform.warehouses.id'), nullable=True)
    
    # 재고 정보
    purchase_currency = Column(String(3), default='KRW', nullable=False)  # 구매 통화 단위 (KRW, USD)
    sale_currency = Column(String(3), default='KRW', nullable=False)  # 판매 통화 단위 (KRW, USD)
    purchase_price = Column(Numeric(12, 2), default=0)  # 구매가
    sale_price = Column(Numeric(12, 2), default=0)  # 판매가
    current_stock = Column(Integer, default=0)
    safety_stock = Column(Integer, default=0)
    is_auto_calculated = Column(Boolean, default=False)
    
    # 발주 정보
    moq = Column(Integer, default=1)  # Minimum Order Quantity
    lead_time_days = Column(Integer, default=7)

    # 메모
    memo = Column(Text)  # 제품 메모

    # 상태
    is_active = Column(Boolean, default=True)
    
    # 메타데이터
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # 관계
    warehouse = relationship("Warehouse", backref="products", foreign_keys=[warehouse_id])
    transactions = relationship("Transaction", back_populates="product", cascade="all, delete-orphan")
    discrepancies = relationship("Discrepancy", back_populates="product", cascade="all, delete-orphan")
    purchase_order_items = relationship("PurchaseOrderItem", back_populates="product")
    daily_ledgers = relationship("DailyLedger", back_populates="product", cascade="all, delete-orphan")
    
    # BOM 관계 (세트상품)
    parent_boms = relationship("ProductBOM", foreign_keys="ProductBOM.parent_product_code", back_populates="parent_product")
    child_boms = relationship("ProductBOM", foreign_keys="ProductBOM.child_product_code", back_populates="child_product")

    # 체크포인트 관계
    checkpoints = relationship("StockCheckpoint", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product {self.product_code}: {self.product_name}>"