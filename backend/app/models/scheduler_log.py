"""
스케줄러 로그 모델
"""
from sqlalchemy import Column, String, Text, DateTime, Numeric, JSON, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum
import uuid

from app.core.database import Base


class JobStatus(str, enum.Enum):
    """작업 상태"""
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class SchedulerLog(Base):
    """스케줄러 실행 로그"""
    __tablename__ = "scheduler_logs"
    __table_args__ = {"schema": "playauto_platform"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_name = Column(String(100), nullable=False, comment="작업 이름")
    job_id = Column(String(100), comment="APScheduler job ID")
    execution_time = Column(DateTime, nullable=False, comment="실행 시간")
    status = Column(
        SQLEnum(JobStatus, name='job_status_enum', create_type=False),
        nullable=False,
        comment="실행 상태"
    )
    error_message = Column(Text, comment="오류 메시지")
    duration_seconds = Column(Numeric(10, 2), comment="실행 소요 시간 (초)")
    result_summary = Column(JSON, comment="실행 결과 요약")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())