#!/usr/bin/env python3
"""
스케줄러 테스트 및 누락된 Daily Ledgers 생성 스크립트
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, date
import logging

# 프로젝트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.core.scheduler import scheduler_instance
from app.models.scheduler_log import SchedulerLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_scheduler():
    """스케줄러 테스트 및 수동 실행"""
    logger.info("=" * 60)
    logger.info("스케줄러 테스트 시작")
    logger.info("=" * 60)

    # 1. 스케줄러 상태 확인
    logger.info("\n1. 현재 스케줄러 작업 목록:")
    jobs = scheduler_instance.get_jobs()
    for job in jobs:
        logger.info(f"  - {job['name']} (ID: {job['id']})")
        logger.info(f"    다음 실행: {job['next_run']}")

    # 2. 스케줄러 로그 확인
    logger.info("\n2. scheduler_logs 테이블 확인:")
    db = SessionLocal()
    try:
        log_count = db.query(SchedulerLog).count()
        logger.info(f"  - 전체 로그 수: {log_count}")

        if log_count > 0:
            recent_logs = db.query(SchedulerLog).order_by(SchedulerLog.execution_time.desc()).limit(5).all()
            logger.info("  - 최근 로그 5개:")
            for log in recent_logs:
                logger.info(f"    {log.job_name}: {log.status} at {log.execution_time}")
        else:
            logger.info("  - ⚠️ 로그가 없습니다. 스케줄러가 한 번도 실행되지 않았습니다.")
    finally:
        db.close()

    # 3. 수동으로 daily_ledger 실행
    logger.info("\n3. Daily Ledger 수동 실행:")
    try:
        # 직접 함수 호출
        await scheduler_instance.run_daily_ledger()
        logger.info("  - ✅ Daily Ledger 실행 완료")
    except Exception as e:
        logger.error(f"  - ❌ Daily Ledger 실행 실패: {e}")

    # 4. 헬스체크 수동 실행
    logger.info("\n4. Health Check 수동 실행:")
    try:
        await scheduler_instance.health_check()
        logger.info("  - ✅ Health Check 실행 완료")
    except Exception as e:
        logger.error(f"  - ❌ Health Check 실행 실패: {e}")

    # 5. 다시 로그 확인
    logger.info("\n5. 실행 후 scheduler_logs 확인:")
    db = SessionLocal()
    try:
        new_log_count = db.query(SchedulerLog).count()
        logger.info(f"  - 전체 로그 수: {new_log_count}")
        if new_log_count > log_count:
            logger.info(f"  - ✅ 새로운 로그 {new_log_count - log_count}개 추가됨")
    finally:
        db.close()

async def generate_missing_ledgers():
    """누락된 Daily Ledgers 생성"""
    logger.info("\n" + "=" * 60)
    logger.info("누락된 Daily Ledgers 생성")
    logger.info("=" * 60)

    # 2025-09-10부터 어제까지 생성
    start_date = date(2025, 9, 10)
    end_date = date.today() - timedelta(days=1)

    logger.info(f"생성 기간: {start_date} ~ {end_date}")

    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        logger.info(f"\n📅 {date_str} 수불부 생성 중...")

        # daily_ledger_automation.py 실행
        script_path = os.path.join(os.path.dirname(__file__), 'daily_ledger_automation.py')

        process = await asyncio.create_subprocess_exec(
            sys.executable, script_path, '--date', date_str,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            logger.info(f"  ✅ {date_str} 생성 성공")
            if stdout:
                output = stdout.decode()
                # 생성된 레코드 수 출력
                if "개의 일일 수불부 레코드를 생성했습니다" in output:
                    logger.info(f"  {output.split('개의')[0].split()[-1]}개 레코드 생성")
        else:
            logger.error(f"  ❌ {date_str} 생성 실패")
            if stderr:
                logger.error(f"  오류: {stderr.decode()}")

        current_date += timedelta(days=1)

    logger.info("\n✅ 누락된 Daily Ledgers 생성 완료")

async def main():
    """메인 실행 함수"""
    # 1. 스케줄러 테스트
    await test_scheduler()

    # 2. 사용자 확인
    print("\n" + "=" * 60)
    response = input("누락된 Daily Ledgers를 생성하시겠습니까? (y/n): ")

    if response.lower() == 'y':
        await generate_missing_ledgers()
    else:
        logger.info("Daily Ledgers 생성을 건너뜁니다.")

    logger.info("\n" + "=" * 60)
    logger.info("모든 작업 완료!")
    logger.info("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())