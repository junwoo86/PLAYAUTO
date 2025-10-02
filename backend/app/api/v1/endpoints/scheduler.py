"""
스케줄러 관리 API 엔드포인트
"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
import logging

from app.core.database import get_db
from app.core.scheduler import scheduler_instance
from app.models.scheduler_log import SchedulerLog, JobStatus
from app.schemas.scheduler_log import (
    SchedulerLogResponse,
    SchedulerLogListResponse,
    SchedulerStatusResponse,
    TriggerJobRequest,
    TriggerJobResponse,
    SchedulerJobInfo
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/logs", response_model=SchedulerLogListResponse)
async def get_scheduler_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[JobStatus] = None,
    job_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    스케줄러 실행 로그 조회

    Args:
        skip: 건너뛸 레코드 수
        limit: 조회할 레코드 수
        status: 필터링할 상태
        job_name: 필터링할 작업 이름
    """
    try:
        query = db.query(SchedulerLog)

        if status:
            query = query.filter(SchedulerLog.status == status)
        if job_name:
            query = query.filter(SchedulerLog.job_name == job_name)

        total = query.count()
        logs = query.order_by(desc(SchedulerLog.execution_time)).offset(skip).limit(limit).all()

        return {
            "items": logs,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"로그 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status", response_model=SchedulerStatusResponse)
async def get_scheduler_status(db: Session = Depends(get_db)):
    """
    스케줄러 상태 조회

    Returns:
        스케줄러 실행 상태 및 등록된 작업 목록
    """
    try:
        # 스케줄러 작업 정보
        jobs_data = scheduler_instance.get_jobs()
        jobs = [
            SchedulerJobInfo(
                job_id=job["id"],
                job_name=job["name"],
                next_run_time=datetime.fromisoformat(job["next_run"]) if job["next_run"] else None,
                trigger=job["trigger"],
                state="scheduled"
            )
            for job in jobs_data
        ]

        # 최근 로그 10개
        recent_logs = db.query(SchedulerLog)\
            .order_by(desc(SchedulerLog.execution_time))\
            .limit(10)\
            .all()

        return {
            "is_running": scheduler_instance.scheduler.running,
            "jobs": jobs,
            "recent_logs": recent_logs
        }
    except Exception as e:
        logger.error(f"스케줄러 상태 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/trigger", response_model=TriggerJobResponse)
async def trigger_job(request: TriggerJobRequest):
    """
    작업을 수동으로 트리거

    Args:
        request: 트리거할 작업 정보
    """
    try:
        job_map = {
            "Daily Ledger 생성": "daily_ledger",
            "발주서 상태 확인": "purchase_order_check",
            "시스템 헬스 체크": "health_check",
            "안전 재고량 자동 업데이트": "safety_stock_update"
        }

        job_id = job_map.get(request.job_name)
        if not job_id:
            return TriggerJobResponse(
                success=False,
                message=f"알 수 없는 작업: {request.job_name}"
            )

        success = await scheduler_instance.run_job_manually(job_id)
        if success:
            return TriggerJobResponse(
                success=True,
                message=f"작업 '{request.job_name}'가 수동으로 실행되었습니다"
            )
        else:
            return TriggerJobResponse(
                success=False,
                message=f"작업 실행 실패"
            )
    except Exception as e:
        logger.error(f"작업 트리거 실패: {e}")
        return TriggerJobResponse(
            success=False,
            message=str(e)
        )

@router.post("/daily-ledger/run")
async def run_daily_ledger():
    """
    Daily Ledger를 수동으로 실행
    
    Returns:
        실행 결과
    """
    try:
        await scheduler_instance.run_daily_ledger()
        return {"message": "Daily Ledger가 수동으로 실행되었습니다"}
    except Exception as e:
        logger.error(f"Daily Ledger 수동 실행 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/purchase-orders/process")
async def process_purchase_orders():
    """
    발주서 처리를 수동으로 실행

    Returns:
        실행 결과
    """
    try:
        await scheduler_instance.run_purchase_order_check()
        return {"message": "발주서 처리가 수동으로 실행되었습니다"}
    except Exception as e:
        logger.error(f"발주서 처리 수동 실행 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/safety-stock/update")
async def update_safety_stock():
    """
    안전 재고량 자동 업데이트를 수동으로 실행

    Returns:
        실행 결과
    """
    try:
        await scheduler_instance.run_safety_stock_update()
        return {"message": "안전 재고량 업데이트가 수동으로 실행되었습니다"}
    except Exception as e:
        logger.error(f"안전 재고량 업데이트 수동 실행 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))