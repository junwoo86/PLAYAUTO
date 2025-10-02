#!/usr/bin/env python3
"""
백엔드 서버와 독립적으로 실행되는 스케줄러 서비스
백엔드 서버가 다운되어도 스케줄러는 계속 작동합니다.
"""
import asyncio
import logging
import sys
import os
from datetime import datetime
import pytz

# 프로젝트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.scheduler import scheduler_instance
from app.core.database import SessionLocal, test_connection

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/scheduler_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 한국 시간대
KST = pytz.timezone('Asia/Seoul')

async def check_and_run_scheduler():
    """스케줄러 상태 확인 및 실행"""
    logger.info("=" * 60)
    logger.info("스케줄러 서비스 시작")
    logger.info(f"현재 시간 (KST): {datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 60)

    # 데이터베이스 연결 확인
    if not test_connection():
        logger.error("❌ 데이터베이스 연결 실패")
        return False

    logger.info("✅ 데이터베이스 연결 성공")

    try:
        # 스케줄러 시작
        scheduler_instance.start()
        logger.info("✅ 스케줄러가 시작되었습니다")

        # 등록된 작업 확인
        jobs = scheduler_instance.get_jobs()
        logger.info(f"등록된 작업 수: {len(jobs)}")
        for job in jobs:
            logger.info(f"  - {job['name']} (ID: {job['id']})")
            logger.info(f"    다음 실행: {job['next_run']}")

        # 스케줄러 계속 실행
        logger.info("스케줄러가 백그라운드에서 실행 중입니다...")
        logger.info("종료하려면 Ctrl+C를 누르세요")

        # 무한 루프로 스케줄러 유지
        while True:
            await asyncio.sleep(60)  # 1분마다 체크

            # 주기적으로 상태 출력 (10분마다)
            now = datetime.now(KST)
            if now.minute % 10 == 0:
                logger.debug(f"❤️ 스케줄러 정상 작동 중... ({now.strftime('%Y-%m-%d %H:%M:%S')})")

    except KeyboardInterrupt:
        logger.info("종료 신호를 받았습니다...")
    except Exception as e:
        logger.error(f"스케줄러 실행 중 오류 발생: {e}")
    finally:
        scheduler_instance.stop()
        logger.info("스케줄러가 종료되었습니다")

def main():
    """메인 실행 함수"""
    try:
        asyncio.run(check_and_run_scheduler())
    except Exception as e:
        logger.error(f"프로그램 실행 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()