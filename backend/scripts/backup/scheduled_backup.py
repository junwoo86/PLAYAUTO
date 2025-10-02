#!/usr/bin/env python3
"""
백업 스케줄러 통합
APScheduler를 사용한 자동 백업 관리
"""

import sys
from pathlib import Path
from datetime import datetime, time
import logging

# 프로젝트 경로 추가
sys.path.append(str(Path(__file__).parent.parent.parent))

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from scripts.backup.backup_database import DatabaseBackup
from scripts.backup.backup_config import backup_config
from app.core.scheduler import scheduler_instance


class ScheduledBackup:
    """스케줄된 백업 관리 클래스"""

    def __init__(self):
        self.backup = DatabaseBackup()
        self.logger = logging.getLogger(__name__)
        self.setup_logging()

    def setup_logging(self):
        """로깅 설정"""
        log_file = backup_config.get_log_filename("scheduled_backup")
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )

    def daily_backup(self):
        """일일 백업 실행"""
        self.logger.info("=" * 60)
        self.logger.info("🌅 일일 백업 시작")

        try:
            success, result = self.backup.run_backup(
                backup_type="daily",
                description="자동 일일 백업"
            )

            if success:
                self.logger.info(f"✅ 일일 백업 성공: {result}")
                self._cleanup_old_daily_backups()
            else:
                self.logger.error(f"❌ 일일 백업 실패: {result}")

            return success

        except Exception as e:
            self.logger.error(f"일일 백업 중 오류: {e}")
            return False

    def weekly_backup(self):
        """주간 백업 실행"""
        self.logger.info("=" * 60)
        self.logger.info("📅 주간 백업 시작")

        try:
            success, result = self.backup.run_backup(
                backup_type="weekly",
                description="자동 주간 백업"
            )

            if success:
                self.logger.info(f"✅ 주간 백업 성공: {result}")
            else:
                self.logger.error(f"❌ 주간 백업 실패: {result}")

            return success

        except Exception as e:
            self.logger.error(f"주간 백업 중 오류: {e}")
            return False

    def monthly_backup(self):
        """월간 백업 실행"""
        self.logger.info("=" * 60)
        self.logger.info("📆 월간 백업 시작")

        try:
            success, result = self.backup.run_backup(
                backup_type="monthly",
                description="자동 월간 백업"
            )

            if success:
                self.logger.info(f"✅ 월간 백업 성공: {result}")
            else:
                self.logger.error(f"❌ 월간 백업 실패: {result}")

            return success

        except Exception as e:
            self.logger.error(f"월간 백업 중 오류: {e}")
            return False

    def _cleanup_old_daily_backups(self):
        """일일 백업 특별 정리 (7일만 보관)"""
        from datetime import timedelta

        backup_dir = backup_config.backup_dir / "daily"
        cutoff_date = datetime.now() - timedelta(days=7)

        for file_path in backup_dir.iterdir():
            if file_path.is_file():
                file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_time < cutoff_date:
                    self.logger.info(f"오래된 일일 백업 삭제: {file_path.name}")
                    file_path.unlink()

                    # 메타데이터 파일도 삭제
                    info_file = Path(f"{file_path}.info.json")
                    if info_file.exists():
                        info_file.unlink()

    def register_jobs(self, scheduler: BackgroundScheduler = None):
        """스케줄러에 작업 등록"""
        if scheduler is None:
            scheduler = scheduler_instance.scheduler

        # 기존 백업 작업 제거
        existing_jobs = scheduler.get_jobs()
        for job in existing_jobs:
            if job.id.startswith('backup_'):
                scheduler.remove_job(job.id)
                self.logger.info(f"기존 작업 제거: {job.id}")

        # 일일 백업 (매일 새벽 2시)
        scheduler.add_job(
            func=self.daily_backup,
            trigger=CronTrigger(hour=2, minute=0),
            id='backup_daily',
            name='일일 백업',
            misfire_grace_time=3600,  # 1시간
            coalesce=True,
            max_instances=1,
            replace_existing=True
        )
        self.logger.info("✅ 일일 백업 스케줄 등록 (매일 02:00)")

        # 주간 백업 (매주 일요일 새벽 3시)
        scheduler.add_job(
            func=self.weekly_backup,
            trigger=CronTrigger(day_of_week='sun', hour=3, minute=0),
            id='backup_weekly',
            name='주간 백업',
            misfire_grace_time=7200,  # 2시간
            coalesce=True,
            max_instances=1,
            replace_existing=True
        )
        self.logger.info("✅ 주간 백업 스케줄 등록 (일요일 03:00)")

        # 월간 백업 (매월 1일 새벽 4시)
        scheduler.add_job(
            func=self.monthly_backup,
            trigger=CronTrigger(day=1, hour=4, minute=0),
            id='backup_monthly',
            name='월간 백업',
            misfire_grace_time=14400,  # 4시간
            coalesce=True,
            max_instances=1,
            replace_existing=True
        )
        self.logger.info("✅ 월간 백업 스케줄 등록 (매월 1일 04:00)")

        # 이벤트 리스너 등록
        scheduler.add_listener(self._job_executed, EVENT_JOB_EXECUTED)
        scheduler.add_listener(self._job_error, EVENT_JOB_ERROR)

        self.logger.info("=" * 60)
        self.logger.info("백업 스케줄 등록 완료!")
        self.print_schedule(scheduler)

    def _job_executed(self, event):
        """작업 실행 이벤트 핸들러"""
        if event.job_id.startswith('backup_'):
            self.logger.info(f"✅ 백업 작업 실행 완료: {event.job_id}")

    def _job_error(self, event):
        """작업 오류 이벤트 핸들러"""
        if event.job_id.startswith('backup_'):
            self.logger.error(f"❌ 백업 작업 오류: {event.job_id}")
            self.logger.error(f"오류: {event.exception}")

    def print_schedule(self, scheduler: BackgroundScheduler = None):
        """현재 스케줄 출력"""
        if scheduler is None:
            scheduler = scheduler_instance.scheduler

        backup_jobs = [job for job in scheduler.get_jobs() if job.id.startswith('backup_')]

        if backup_jobs:
            print("\n📅 백업 스케줄:")
            print("-" * 60)
            for job in backup_jobs:
                next_run = job.next_run_time
                if next_run:
                    next_run_str = next_run.strftime("%Y-%m-%d %H:%M:%S")
                else:
                    next_run_str = "스케줄 없음"

                print(f"  - {job.name} ({job.id})")
                print(f"    다음 실행: {next_run_str}")
                print(f"    트리거: {job.trigger}")
            print("-" * 60)
        else:
            print("\n등록된 백업 스케줄이 없습니다.")

    def run_test_backup(self):
        """테스트 백업 실행"""
        self.logger.info("🧪 테스트 백업 실행")
        success, result = self.backup.run_backup(
            backup_type="manual",
            description="테스트 백업"
        )
        return success


def integrate_with_main_scheduler():
    """메인 스케줄러와 통합"""
    from app.core.scheduler import scheduler_instance

    # 스케줄러가 실행 중이 아니면 시작
    if not scheduler_instance.scheduler.running:
        scheduler_instance.start()

    # 백업 작업 등록
    scheduled_backup = ScheduledBackup()
    scheduled_backup.register_jobs(scheduler_instance.scheduler)

    return scheduled_backup


def main():
    """독립 실행용 메인 함수"""
    import argparse
    import signal
    import time

    parser = argparse.ArgumentParser(description="백업 스케줄러")
    parser.add_argument('--test', action='store_true', help='테스트 백업 실행')
    parser.add_argument('--daemon', action='store_true', help='데몬 모드로 실행')
    parser.add_argument('--integrate', action='store_true', help='메인 스케줄러와 통합')

    args = parser.parse_args()

    scheduled_backup = ScheduledBackup()

    if args.test:
        # 테스트 백업 실행
        success = scheduled_backup.run_test_backup()
        sys.exit(0 if success else 1)

    elif args.integrate:
        # 메인 스케줄러와 통합
        scheduled_backup = integrate_with_main_scheduler()
        print("✅ 메인 스케줄러와 통합 완료")

    elif args.daemon:
        # 독립 데몬 모드
        print("🚀 백업 스케줄러 시작 (데몬 모드)")

        scheduler = BackgroundScheduler()
        scheduled_backup.register_jobs(scheduler)
        scheduler.start()

        # 종료 시그널 처리
        def signal_handler(signum, frame):
            print("\n⏹️  백업 스케줄러 종료 중...")
            scheduler.shutdown()
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        try:
            # 계속 실행
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            scheduler.shutdown()

    else:
        # 스케줄 정보만 출력
        scheduler = BackgroundScheduler()
        scheduled_backup.register_jobs(scheduler)
        scheduled_backup.print_schedule(scheduler)


if __name__ == "__main__":
    main()