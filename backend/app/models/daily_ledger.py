"""
일일 수불부 모델
"""
from sqlalchemy import Column, String, Integer, Date, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class DailyLedger(Base):
    """일일 수불부 모델"""
    __tablename__ = "daily_ledgers"
    __table_args__ = (
        UniqueConstraint('ledger_date', 'product_code', name='uq_ledger_date_product'),
        {"schema": "playauto_platform"}
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ledger_date = Column(Date, nullable=False)
    product_code = Column(String(50), ForeignKey("products.product_code"), nullable=False)
    beginning_stock = Column(Integer, nullable=False)
    total_inbound = Column(Integer, default=0)
    total_outbound = Column(Integer, default=0)
    adjustments = Column(Integer, default=0)
    ending_stock = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 관계
    product = relationship("Product", foreign_keys=[product_code], back_populates="daily_ledgers")
    
    # 유니크 제약조건: 날짜-제품코드 조합 유니크
    __table_args__ = (
        UniqueConstraint('ledger_date', 'product_code', name='uq_ledger_date_product_code'),
        {"schema": "playauto_platform"}
    )