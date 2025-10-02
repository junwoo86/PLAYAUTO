#!/usr/bin/env python3
"""
스케줄러 헬스 체크 및 복구 스크립트

스케줄러가 정상 작동하는지 확인하고,
필요시 수동으로 작업을 트리거합니다.
"""

import requests
import logging
from datetime import datetime, date, timedelta
import pytz

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 한국 시간대
KST = pytz.timezone('Asia/Seoul')

# API 엔드포인트
API_BASE_URL = "http://localhost:8000/api/v1"


def check_scheduler_status():
    """스케줄러 상태 확인"""
    try:
        response = requests.get(f"{API_BASE_URL}/scheduler/status")
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logger.error(f"스케줄러 상태 확인 실패: {e}")
    return None


def check_scheduler_logs():
    """스케줄러 로그 확인"""
    try:
        response = requests.get(f"{API_BASE_URL}/scheduler/logs?limit=10")
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logger.error(f"스케줄러 로그 확인 실패: {e}")
    return None


def trigger_daily_ledger():
    """일일 수불부 생성 수동 트리거"""
    try:
        response = requests.post(
            f"{API_BASE_URL}/scheduler/trigger",
            json={"job_name": "Daily Ledger 생성"}
        )
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        logger.error(f"Daily Ledger 트리거 실패: {e}")
    return None


def check_todays_ledger():
    """오늘의 수불부가 생성되었는지 확인"""
    yesterday = date.today() - timedelta(days=1)
    try:
        response = requests.get(
            f"{API_BASE_URL}/daily-ledger",
            params={"ledger_date": yesterday.isoformat()}
        )
        if response.status_code == 200:
            data = response.json()
            return len(data) > 0
    except Exception as e:
        logger.error(f"수불부 확인 실패: {e}")
    return False


def main():
    logger.info("=" * 60)
    logger.info("🔍 PLAYAUTO 스케줄러 헬스 체크")
    logger.info("=" * 60)

    # 현재 한국 시각
    now_kst = datetime.now(KST)
    logger.info(f"현재 한국 시각: {now_kst.strftime('%Y-%m-%d %H:%M:%S %Z')}")

    # 1. 스케줄러 상태 확인
    logger.info("\n📊 스케줄러 상태 확인...")
    status = check_scheduler_status()

    if not status:
        logger.error("❌ 스케줄러 상태를 확인할 수 없습니다!")
        logger.info("서버가 실행 중인지 확인하세요.")
        return

    if status.get("is_running"):
        logger.info("✅ 스케줄러가 실행 중입니다!")
    else:
        logger.warning("⚠️ 스케줄러가 실행되지 않고 있습니다!")

    # 2. 예정된 작업 확인
    jobs = status.get("jobs", [])
    if jobs:
        logger.info("\n📅 예정된 작업:")
        for job in jobs:
            job_name = job.get("job_name", "Unknown")
            next_run = job.get("next_run_time", "N/A")
            logger.info(f"  - {job_name}: {next_run}")
    else:
        logger.warning("⚠️ 등록된 작업이 없습니다!")

    # 3. 최근 실행 로그 확인
    logger.info("\n📜 최근 실행 로그:")
    logs_data = check_scheduler_logs()

    if logs_data and logs_data.get("items"):
        logs = logs_data["items"]
        if logs:
            for log in logs[:5]:  # 최근 5개만
                job_name = log.get("job_name", "Unknown")
                status_str = log.get("status", "Unknown")
                exec_time = log.get("execution_time", "N/A")
                logger.info(f"  - {exec_time}: {job_name} - {status_str}")
        else:
            logger.warning("  로그가 없습니다.")
    else:
        logger.warning("⚠️ 스케줄러 로그가 비어있습니다!")
        logger.info("스케줄러가 한 번도 실행되지 않았을 수 있습니다.")

    # 4. 어제 수불부 확인
    yesterday = date.today() - timedelta(days=1)
    logger.info(f"\n📋 어제({yesterday}) 수불부 생성 확인...")

    if check_todays_ledger():
        logger.info(f"✅ {yesterday} 수불부가 정상적으로 생성되었습니다!")
    else:
        logger.warning(f"⚠️ {yesterday} 수불부가 없습니다!")

        # 현재 시각이 00:05 이후라면 수동 생성 제안
        if now_kst.hour > 0 or (now_kst.hour == 0 and now_kst.minute >= 5):
            logger.info("\n🔧 수동 생성을 시도하시겠습니까?")
            logger.info("다음 명령을 실행하세요:")
            logger.info(f"  python generate_missing_daily_ledgers.py")

    # 5. 권장 사항
    logger.info("\n💡 권장 사항:")

    if not status.get("is_running"):
        logger.info("1. 서버를 재시작하여 스케줄러를 활성화하세요:")
        logger.info("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")

    if not logs_data or not logs_data.get("items"):
        logger.info("2. 스케줄러 작업을 수동으로 한 번 실행해보세요:")
        logger.info("   curl -X POST http://localhost:8000/api/v1/scheduler/daily-ledger/run")

    logger.info("\n✅ 정상 작동 시:")
    logger.info("  - 매일 00:05에 자동으로 일일 수불부 생성")
    logger.info("  - 매일 09:00에 발주서 상태 확인")
    logger.info("  - 매시간 정각에 헬스 체크")

    logger.info("\n=" * 60)


if __name__ == "__main__":
    # 서버 연결 확인
    try:
        response = requests.get(f"{API_BASE_URL.replace('/api/v1', '')}/health")
        if response.status_code != 200:
            logger.error("⚠️ 서버가 응답하지 않습니다!")
            logger.error("서버를 먼저 시작하세요:")
            logger.error("  cd /Users/junwoo/Developer/Work/PLAYAUTO/backend")
            logger.error("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
            exit(1)
    except requests.exceptions.ConnectionError:
        logger.error("⚠️ 서버에 연결할 수 없습니다!")
        logger.error("서버를 먼저 시작하세요:")
        logger.error("  cd /Users/junwoo/Developer/Work/PLAYAUTO/backend")
        logger.error("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        exit(1)

    main()