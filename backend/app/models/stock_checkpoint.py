"""
Stock Checkpoint Model - 재고 체크포인트 관리
재고 조정, 일일 마감 등의 시점에서 재고를 확정하여 무결성 유지
"""
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
import uuid

from app.core.database import Base


class CheckpointType(enum.Enum):
    """체크포인트 유형"""
    ADJUST = "ADJUST"           # 재고 조정
    DAILY_CLOSE = "DAILY_CLOSE" # 일일 마감
    MONTHLY = "MONTHLY"         # 월말 결산


class StockCheckpoint(Base):
    """재고 체크포인트 모델"""
    __tablename__ = "stock_checkpoints"
    __table_args__ = {"schema": "playauto_platform"}

    # 기본 필드
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False
    )

    # 제품 정보
    product_code = Column(
        String(50),
        ForeignKey("playauto_platform.products.product_code", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # 체크포인트 정보
    checkpoint_date = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )

    checkpoint_type = Column(
        Enum(CheckpointType),
        nullable=False
    )

    # 확정 재고량
    confirmed_stock = Column(
        Integer,
        nullable=False
    )

    # 추가 정보
    reason = Column(Text)
    created_by = Column(String(100))
    created_at = Column(
        DateTime(timezone=True),
        server_default='CURRENT_TIMESTAMP',
        nullable=False
    )

    # 활성 상태
    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    # 관계 설정
    product = relationship("Product", back_populates="checkpoints")
    transactions = relationship("Transaction", back_populates="checkpoint")

    def __repr__(self):
        return f"<StockCheckpoint(product_code={self.product_code}, type={self.checkpoint_type}, date={self.checkpoint_date})>"

    def dict(self):
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "product_code": self.product_code,
            "checkpoint_date": self.checkpoint_date.isoformat() if self.checkpoint_date else None,
            "checkpoint_type": self.checkpoint_type.value if self.checkpoint_type else None,
            "confirmed_stock": self.confirmed_stock,
            "reason": self.reason,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_active": self.is_active
        }