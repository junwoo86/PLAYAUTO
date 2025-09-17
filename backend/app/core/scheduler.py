"""
백그라운드 스케줄러 설정
FastAPI 애플리케이션과 통합된 스케줄러
"""
import asyncio
from datetime import datetime, date, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import subprocess
import sys
import os
import pytz
import time
from uuid import uuid4
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.scheduler_log import SchedulerLog, JobStatus

logger = logging.getLogger(__name__)

# 한국 시간대 설정
KST = pytz.timezone('Asia/Seoul')

class BackgroundScheduler:
    """백그라운드 작업 스케줄러"""

    def __init__(self):
        # 스케줄러를 한국 시간대로 설정
        self.scheduler = AsyncIOScheduler(timezone=KST)
        self.setup_jobs()

    def _get_db(self) -> Session:
        """데이터베이스 세션 생성"""
        return SessionLocal()

    async def _log_job_start(self, job_name: str, job_id: str = None) -> str:
        """작업 시작 로그 기록"""
        db = self._get_db()
        try:
            log = SchedulerLog(
                id=uuid4(),
                job_name=job_name,
                job_id=job_id,
                execution_time=datetime.now(),
                status=JobStatus.RUNNING
            )
            db.add(log)
            db.commit()
            return str(log.id)
        except Exception as e:
            logger.error(f"작업 시작 로그 기록 실패: {e}")
            return None
        finally:
            db.close()

    async def _log_job_complete(self, log_id: str, success: bool,
                                error_message: str = None,
                                result_summary: dict = None,
                                start_time: float = None):
        """작업 완료 로그 업데이트"""
        db = self._get_db()
        try:
            log = db.query(SchedulerLog).filter(SchedulerLog.id == log_id).first()
            if log:
                log.status = JobStatus.SUCCESS if success else JobStatus.FAILED
                log.error_message = error_message
                log.result_summary = result_summary
                if start_time:
                    log.duration_seconds = time.time() - start_time
                db.commit()
        except Exception as e:
            logger.error(f"작업 완료 로그 업데이트 실패: {e}")
        finally:
            db.close()
    
    def setup_jobs(self):
        """스케줄 작업 설정"""
        # Daily Ledger 생성 (매일 자정 5분 - 한국 시간)
        self.scheduler.add_job(
            self.run_daily_ledger,
            CronTrigger(hour=0, minute=5, timezone=KST),
            id='daily_ledger',
            name='Daily Ledger 생성',
            misfire_grace_time=3600  # 1시간 내 실행 허용
        )
        
        # 발주서 처리 (매일 오전 9시 - 한국 시간)
        self.scheduler.add_job(
            self.run_purchase_order_check,
            CronTrigger(hour=9, minute=0, timezone=KST),
            id='purchase_order_check',
            name='발주서 상태 확인',
            misfire_grace_time=3600
        )
        
        # 헬스 체크 (매시간 - 한국 시간)
        self.scheduler.add_job(
            self.health_check,
            CronTrigger(minute=0, timezone=KST),
            id='health_check',
            name='시스템 헬스 체크',
            misfire_grace_time=300
        )
        
        logger.info("✅ 스케줄러 작업 설정 완료")
        logger.info("  - Daily Ledger: 매일 00:05")
        logger.info("  - 발주서 처리: 매일 09:00")
        logger.info("  - 헬스 체크: 매시간")
    
    async def run_daily_ledger(self):
        """일일 수불부 생성 작업"""
        start_time = time.time()
        log_id = await self._log_job_start("Daily Ledger 생성", "daily_ledger")

        try:
            logger.info("🔄 Daily Ledger 생성 시작")

            # 어제 날짜의 수불부 생성
            yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')

            # 스크립트 경로
            script_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                'daily_ledger_automation.py'
            )

            if not os.path.exists(script_path):
                error_msg = f"Daily Ledger 스크립트를 찾을 수 없습니다: {script_path}"
                logger.error(error_msg)
                if log_id:
                    await self._log_job_complete(log_id, False, error_msg, start_time=start_time)
                return

            # 비동기 프로세스 실행
            process = await asyncio.create_subprocess_exec(
                sys.executable, script_path, '--date', yesterday,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f"✅ Daily Ledger 생성 성공 ({yesterday})")
                if stdout:
                    logger.info(stdout.decode())
                if log_id:
                    await self._log_job_complete(
                        log_id, True,
                        result_summary={"date": yesterday, "output": stdout.decode()[:500]},
                        start_time=start_time
                    )
            else:
                error_msg = f"Daily Ledger 생성 실패: {stderr.decode()}"
                logger.error(f"❌ {error_msg}")
                if log_id:
                    await self._log_job_complete(log_id, False, error_msg, start_time=start_time)

        except Exception as e:
            error_msg = f"Daily Ledger 실행 오류: {e}"
            logger.error(f"❌ {error_msg}")
            if log_id:
                await self._log_job_complete(log_id, False, error_msg, start_time=start_time)
    
    async def run_purchase_order_check(self):
        """발주서 상태 확인 및 처리"""
        start_time = time.time()
        log_id = await self._log_job_start("발주서 상태 확인", "purchase_order_check")

        try:
            logger.info("🔄 발주서 처리 확인 시작")

            # 스크립트 경로
            script_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                'process_purchase_orders.py'
            )

            if not os.path.exists(script_path):
                error_msg = f"발주서 처리 스크립트를 찾을 수 없습니다: {script_path}"
                logger.error(error_msg)
                if log_id:
                    await self._log_job_complete(log_id, False, error_msg, start_time=start_time)
                return

            # 비동기 프로세스 실행
            process = await asyncio.create_subprocess_exec(
                sys.executable, script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info("✅ 발주서 처리 완료")
                output = stdout.decode() if stdout else ""
                email_sent = "처리할 Draft 상태의 발주서가 없습니다" not in output
                if email_sent:
                    logger.info("📧 발주 이메일 발송 완료")
                logger.info(output)
                if log_id:
                    await self._log_job_complete(
                        log_id, True,
                        result_summary={"email_sent": email_sent, "output": output[:500]},
                        start_time=start_time
                    )
            else:
                error_msg = f"발주서 처리 실패: {stderr.decode()}"
                logger.error(f"❌ {error_msg}")
                if log_id:
                    await self._log_job_complete(log_id, False, error_msg, start_time=start_time)

        except Exception as e:
            error_msg = f"발주서 처리 실행 오류: {e}"
            logger.error(f"❌ {error_msg}")
            if log_id:
                await self._log_job_complete(log_id, False, error_msg, start_time=start_time)
    
    async def health_check(self):
        """시스템 헬스 체크"""
        # 한국 시간으로 현재 시각 표시
        now_kst = datetime.now(KST)
        logger.info(f"❤️ 스케줄러 정상 작동 중... (현재 한국 시각: {now_kst.strftime('%Y-%m-%d %H:%M:%S %Z')})")
        
        # 예정된 작업 목록 출력
        jobs = self.scheduler.get_jobs()
        if jobs:
            logger.debug(f"예정된 작업 수: {len(jobs)}")
            for job in jobs:
                logger.debug(f"  - {job.name}: 다음 실행 {job.next_run_time}")
    
    def start(self):
        """스케줄러 시작"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("🚀 백그라운드 스케줄러 시작됨")
    
    def stop(self):
        """스케줄러 중지"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("🛑 백그라운드 스케줄러 중지됨")
    
    def get_jobs(self):
        """현재 등록된 작업 목록 반환"""
        return [
            {
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger)
            }
            for job in self.scheduler.get_jobs()
        ]
    
    async def run_job_manually(self, job_id: str):
        """특정 작업을 수동으로 실행"""
        job = self.scheduler.get_job(job_id)
        if job:
            logger.info(f"🔄 작업 수동 실행: {job.name}")
            await job.func()
            return True
        return False

# 싱글톤 인스턴스
scheduler_instance = BackgroundScheduler()