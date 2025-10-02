"""
백그라운드 스케줄러 설정
FastAPI 애플리케이션과 통합된 스케줄러
"""
import asyncio
from datetime import datetime, date, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import sys
import os
import pytz
import time
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.core.database import SessionLocal
from app.models.scheduler_log import SchedulerLog, JobStatus
from app.models.daily_ledger import DailyLedger
from app.models.transaction import Transaction
from app.models.product import Product
from app.models.stock_checkpoint import StockCheckpoint, CheckpointType

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

        # 발주서 처리 (비활성화 - 이메일 기능 미구현)
        # self.scheduler.add_job(
        #     self.run_purchase_order_check,
        #     CronTrigger(hour=9, minute=0, timezone=KST),
        #     id='purchase_order_check',
        #     name='발주서 상태 확인',
        #     misfire_grace_time=3600
        # )

        # 데이터베이스 백업 (매일 새벽 2시 - 한국 시간)
        self.scheduler.add_job(
            self.run_daily_backup,
            CronTrigger(hour=2, minute=0, timezone=KST),
            id='daily_backup',
            name='일일 데이터베이스 백업',
            misfire_grace_time=3600
        )

        # 안전 재고량 자동 업데이트 (매일 새벽 3시 - 한국 시간)
        self.scheduler.add_job(
            self.run_safety_stock_update,
            CronTrigger(hour=3, minute=0, timezone=KST),
            id='safety_stock_update',
            name='안전 재고량 자동 업데이트',
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
        logger.info("  - DB 백업: 매일 02:00")
        logger.info("  - 안전 재고량 업데이트: 매일 03:00")
        logger.info("  - 헬스 체크: 매시간")
    
    def _get_beginning_stock(self, product_code: str, target_date: date, db: Session) -> int:
        """
        beginning_stock 계산 (체크포인트를 고려한 정확한 계산)
        """
        # target_date 이전의 가장 최근 체크포인트 찾기
        latest_checkpoint = db.query(StockCheckpoint).filter(
            and_(
                StockCheckpoint.product_code == product_code,
                func.date(StockCheckpoint.checkpoint_date) < target_date,
                StockCheckpoint.is_active == True
            )
        ).order_by(StockCheckpoint.checkpoint_date.desc()).first()

        if latest_checkpoint:
            # 체크포인트가 있으면 체크포인트 ~ 전날까지의 거래를 집계
            checkpoint_date = latest_checkpoint.checkpoint_date.date()
            yesterday = target_date - timedelta(days=1)

            # 체크포인트 이후 ~ 전날까지의 거래만 조회
            transactions = db.query(Transaction).filter(
                and_(
                    Transaction.product_code == product_code,
                    func.date(Transaction.transaction_date) > checkpoint_date,
                    func.date(Transaction.transaction_date) <= yesterday,
                    Transaction.affects_current_stock == True,
                    Transaction.transaction_type != 'DISPOSAL'
                )
            ).all()

            # 체크포인트의 confirmed_stock부터 시작
            stock = latest_checkpoint.confirmed_stock

            # 거래 집계
            for t in transactions:
                if t.transaction_type in ['IN', 'return']:
                    stock += t.quantity
                elif t.transaction_type == 'OUT':
                    stock -= t.quantity
                elif t.transaction_type == 'ADJUST':
                    stock += (t.new_stock - t.previous_stock)

            return stock
        else:
            # 체크포인트가 없으면 전날 수불부 또는 current_stock
            yesterday = target_date - timedelta(days=1)
            yesterday_ledger = db.query(DailyLedger).filter(
                and_(
                    DailyLedger.product_code == product_code,
                    DailyLedger.ledger_date == yesterday
                )
            ).first()

            if yesterday_ledger:
                return yesterday_ledger.ending_stock
            else:
                product = db.query(Product).filter(
                    Product.product_code == product_code
                ).first()
                return product.current_stock if product else 0

    def _should_create_checkpoint(self, product_code: str, target_date: date, db: Session) -> bool:
        """
        체크포인트를 생성해야 하는지 판단
        """
        # target_date 당일 또는 이후의 체크포인트가 있는지 확인
        future_checkpoint = db.query(StockCheckpoint).filter(
            and_(
                StockCheckpoint.product_code == product_code,
                func.date(StockCheckpoint.checkpoint_date) >= target_date,
                StockCheckpoint.is_active == True
            )
        ).first()

        # 미래 체크포인트가 없으면 생성 가능
        return future_checkpoint is None

    async def run_daily_ledger(self):
        """일일 수불부 생성 작업 (내부 로직)"""
        start_time = time.time()
        log_id = await self._log_job_start("Daily Ledger 생성", "daily_ledger")

        try:
            # 어제 날짜의 수불부 생성
            yesterday = date.today() - timedelta(days=1)
            logger.info(f"🔄 Daily Ledger 생성 시작: {yesterday}")

            db = self._get_db()
            try:
                # 기존 데이터 삭제
                db.query(DailyLedger).filter(DailyLedger.ledger_date == yesterday).delete()

                # 모든 활성 제품 조회
                products = db.query(Product).filter(Product.is_active == True).all()

                ledgers_created = 0
                checkpoints_created = 0

                # 체크포인트 날짜/시간 (해당 날짜의 23:59:59)
                checkpoint_datetime = datetime.combine(yesterday, datetime.max.time())

                for product in products:
                    # beginning_stock 계산
                    beginning_stock = self._get_beginning_stock(product.product_code, yesterday, db)

                    # 당일 거래 집계
                    transactions = db.query(Transaction).filter(
                        and_(
                            Transaction.product_code == product.product_code,
                            func.date(Transaction.transaction_date) == yesterday,
                            Transaction.affects_current_stock == True,
                            Transaction.transaction_type != 'DISPOSAL'
                        )
                    ).all()

                    total_inbound = sum(t.quantity for t in transactions if t.transaction_type in ['IN', 'return'])
                    total_outbound = sum(t.quantity for t in transactions if t.transaction_type == 'OUT')
                    adjustments = sum(
                        t.new_stock - t.previous_stock
                        for t in transactions
                        if t.transaction_type == 'ADJUST'
                    )

                    ending_stock = beginning_stock + total_inbound - total_outbound + adjustments

                    # 일일 수불부 생성
                    ledger = DailyLedger(
                        ledger_date=yesterday,
                        product_code=product.product_code,
                        beginning_stock=beginning_stock,
                        total_inbound=total_inbound,
                        total_outbound=total_outbound,
                        adjustments=adjustments,
                        ending_stock=ending_stock
                    )

                    db.add(ledger)
                    ledgers_created += 1

                    # 체크포인트 생성 판단
                    if self._should_create_checkpoint(product.product_code, yesterday, db):
                        # 기존 체크포인트 확인 (중복 방지)
                        existing_checkpoint = db.query(StockCheckpoint).filter(
                            and_(
                                StockCheckpoint.product_code == product.product_code,
                                func.date(StockCheckpoint.checkpoint_date) == yesterday,
                                StockCheckpoint.checkpoint_type == CheckpointType.DAILY_CLOSE
                            )
                        ).first()

                        if not existing_checkpoint:
                            checkpoint = StockCheckpoint(
                                product_code=product.product_code,
                                checkpoint_date=checkpoint_datetime,
                                checkpoint_type=CheckpointType.DAILY_CLOSE,
                                confirmed_stock=ending_stock,
                                reason=f"{yesterday} 일일 마감",
                                created_by="system",
                                is_active=True
                            )
                            db.add(checkpoint)
                            db.flush()

                            # 체크포인트 이전 거래 무효화
                            db.query(Transaction).filter(
                                and_(
                                    Transaction.product_code == product.product_code,
                                    Transaction.transaction_date <= checkpoint_datetime,
                                    Transaction.affects_current_stock == True
                                )
                            ).update(
                                {
                                    "affects_current_stock": False,
                                    "checkpoint_id": checkpoint.id
                                },
                                synchronize_session=False
                            )

                            checkpoints_created += 1

                db.commit()

                result_summary = {
                    "date": yesterday.isoformat(),
                    "ledgers_created": ledgers_created,
                    "checkpoints_created": checkpoints_created
                }

                logger.info(f"✅ Daily Ledger 생성 성공 ({yesterday})")
                logger.info(f"  - 수불부: {ledgers_created}개")
                logger.info(f"  - 체크포인트: {checkpoints_created}개")

                if log_id:
                    await self._log_job_complete(
                        log_id, True,
                        result_summary=result_summary,
                        start_time=start_time
                    )

            finally:
                db.close()

        except Exception as e:
            error_msg = f"Daily Ledger 실행 오류: {e}"
            logger.error(f"❌ {error_msg}")
            if log_id:
                await self._log_job_complete(log_id, False, error_msg, start_time=start_time)
    
    # 발주서 처리 작업 비활성화 (이메일 기능 미구현)
    # async def run_purchase_order_check(self):
    #     """발주서 상태 확인 및 처리 (비활성화)"""
    #     pass
    
    async def run_daily_backup(self):
        """데이터베이스 일일 백업 작업 (내부 로직)"""
        start_time = time.time()
        log_id = await self._log_job_start("데이터베이스 백업", "daily_backup")

        try:
            logger.info("🔄 데이터베이스 백업 시작")

            # backup_database.py import 시도
            try:
                sys.path.insert(0, os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                    'scripts', 'backup'
                ))
                from backup_database import DatabaseBackup

                # 백업 실행
                backup = DatabaseBackup()
                success, message = backup.run_backup(backup_type="daily", description="자동 일일 백업")

                if success:
                    logger.info(f"✅ 데이터베이스 백업 성공: {message}")
                    if log_id:
                        await self._log_job_complete(
                            log_id, True,
                            result_summary={"type": "daily", "message": message},
                            start_time=start_time
                        )
                else:
                    error_msg = f"데이터베이스 백업 실패: {message}"
                    logger.error(f"❌ {error_msg}")
                    if log_id:
                        await self._log_job_complete(log_id, False, error_msg, start_time=start_time)

            except ImportError as ie:
                # 백업 스크립트를 import할 수 없는 경우 스킵
                error_msg = f"백업 모듈을 불러올 수 없습니다: {ie}"
                logger.warning(f"⚠️ {error_msg}")
                logger.warning("Railway 환경에서는 백업 기능이 비활성화됩니다")
                if log_id:
                    await self._log_job_complete(
                        log_id, True,
                        result_summary={"type": "daily", "message": "백업 스킵 (모듈 없음)"},
                        start_time=start_time
                    )

        except Exception as e:
            error_msg = f"백업 실행 오류: {e}"
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

    async def run_safety_stock_update(self):
        """안전 재고량 자동 업데이트 작업"""
        start_time = time.time()
        log_id = await self._log_job_start("안전 재고량 자동 업데이트", "safety_stock_update")

        try:
            logger.info("🔄 안전 재고량 자동 업데이트 시작")

            db = self._get_db()
            try:
                from app.services.product_service import ProductService

                # 안전 재고량 자동 업데이트 실행
                result = ProductService.update_auto_safety_stocks(db)

                # 결과 로깅
                logger.info(
                    f"✅ 안전 재고량 업데이트 완료\n"
                    f"  - 전체 제품: {result['total_products']}개\n"
                    f"  - 자동 계산 활성화: {result['updated_count']}개\n"
                    f"  - 자동 계산 비활성화: {result['disabled_count']}개\n"
                    f"  - 오류: {len(result['errors'])}개"
                )

                if result['errors']:
                    logger.warning(f"⚠️ 오류 발생한 제품: {result['errors']}")

                if log_id:
                    await self._log_job_complete(
                        log_id, True,
                        result_summary=result,
                        start_time=start_time
                    )

            finally:
                db.close()

        except Exception as e:
            error_msg = f"안전 재고량 업데이트 오류: {e}"
            logger.error(f"❌ {error_msg}")
            if log_id:
                await self._log_job_complete(log_id, False, error_msg, start_time=start_time)

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
                "next_run": job.next_run_time.isoformat() if hasattr(job, 'next_run_time') and job.next_run_time else None,
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