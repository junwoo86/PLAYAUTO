"""
스케줄러 로그 스키마
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class JobStatus(str, Enum):
    """작업 상태"""
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class SchedulerLogBase(BaseModel):
    """스케줄러 로그 기본 스키마"""
    job_name: str = Field(..., description="작업 이름")
    job_id: Optional[str] = Field(None, description="APScheduler job ID")
    execution_time: datetime = Field(..., description="실행 시간")
    status: JobStatus = Field(..., description="실행 상태")
    error_message: Optional[str] = Field(None, description="오류 메시지")
    duration_seconds: Optional[float] = Field(None, description="실행 소요 시간 (초)")
    result_summary: Optional[Dict[str, Any]] = Field(None, description="실행 결과 요약")


class SchedulerLogCreate(SchedulerLogBase):
    """스케줄러 로그 생성 스키마"""
    pass


class SchedulerLogUpdate(BaseModel):
    """스케줄러 로그 업데이트 스키마"""
    status: Optional[JobStatus] = None
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None
    result_summary: Optional[Dict[str, Any]] = None


class SchedulerLogResponse(SchedulerLogBase):
    """스케줄러 로그 응답 스키마"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SchedulerLogListResponse(BaseModel):
    """스케줄러 로그 목록 응답"""
    items: List[SchedulerLogResponse]
    total: int
    skip: int
    limit: int


class SchedulerJobInfo(BaseModel):
    """스케줄러 작업 정보"""
    job_id: str
    job_name: str
    next_run_time: Optional[datetime]
    trigger: str
    state: str


class SchedulerStatusResponse(BaseModel):
    """스케줄러 상태 응답"""
    is_running: bool
    jobs: List[SchedulerJobInfo]
    recent_logs: List[SchedulerLogResponse]


class TriggerJobRequest(BaseModel):
    """작업 수동 실행 요청"""
    job_name: str = Field(..., description="실행할 작업 이름")


class TriggerJobResponse(BaseModel):
    """작업 수동 실행 응답"""
    success: bool
    message: str
    log_id: Optional[UUID] = None