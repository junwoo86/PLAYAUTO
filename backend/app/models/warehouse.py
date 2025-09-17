from sqlalchemy import Column, String, Text, Boolean, UUID
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from app.core.database import Base
import uuid

class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = {"schema": "playauto_platform"}
    
    id = Column(PostgresUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(
        type_=None,
        server_default=func.current_timestamp()
    )
    updated_at = Column(
        type_=None,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp()
    )