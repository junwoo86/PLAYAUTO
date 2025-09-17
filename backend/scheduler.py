#!/usr/bin/env python3
"""
PLAYAUTO 스케줄러 시스템
Daily Ledger 및 기타 정기 작업 스케줄링
"""

import schedule
import time
import subprocess
import logging
from datetime import datetime, date, timedelta
import os
import sys

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/playauto_scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 스크립트 경로 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DAILY_LEDGER_SCRIPT = os.path.join(BASE_DIR, 'daily_ledger_automation.py')
PURCHASE_ORDER_SCRIPT = os.path.join(BASE_DIR, 'process_purchase_orders.py')

def run_daily_ledger():
    """일일 수불부 생성 작업"""
    try:
        logger.info("🔄 Daily Ledger 생성 시작")
        
        # 어제 날짜의 수불부 생성
        yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
        
        result = subprocess.run(
            [sys.executable, DAILY_LEDGER_SCRIPT, '--date', yesterday],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            logger.info(f"✅ Daily Ledger 생성 성공 ({yesterday})")
            logger.info(result.stdout)
        else:
            logger.error(f"❌ Daily Ledger 생성 실패: {result.stderr}")
            
    except Exception as e:
        logger.error(f"❌ Daily Ledger 실행 오류: {e}")

def run_purchase_order_check():
    """발주서 상태 확인 및 처리"""
    try:
        logger.info("🔄 발주서 처리 확인 시작")
        
        result = subprocess.run(
            [sys.executable, PURCHASE_ORDER_SCRIPT],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            logger.info("✅ 발주서 처리 완료")
            # 처리된 발주서가 있는지 로그에서 확인
            if "처리할 Draft 상태의 발주서가 없습니다" not in result.stdout:
                logger.info("📧 발주 이메일 발송 완료")
        else:
            logger.error(f"❌ 발주서 처리 실패: {result.stderr}")
            
    except Exception as e:
        logger.error(f"❌ 발주서 처리 실행 오류: {e}")

def health_check():
    """시스템 헬스 체크"""
    logger.info(f"❤️ 스케줄러 정상 작동 중... (현재 시각: {datetime.now()})")

def run_scheduler():
    """스케줄러 메인 실행"""
    logger.info("=" * 60)
    logger.info("🚀 PLAYAUTO 스케줄러 시작")
    logger.info(f"시작 시간: {datetime.now()}")
    logger.info("=" * 60)
    
    # 스케줄 설정
    # 매일 자정 5분에 Daily Ledger 실행
    schedule.every().day.at("00:05").do(run_daily_ledger)
    
    # 매일 오전 9시에 발주서 처리 확인
    schedule.every().day.at("09:00").do(run_purchase_order_check)
    
    # 매 시간마다 헬스 체크
    schedule.every().hour.do(health_check)
    
    # 시작 시 한 번 실행 (테스트용)
    logger.info("📌 초기 작업 실행")
    health_check()
    
    # 스케줄 루프
    logger.info("⏰ 스케줄러 대기 중...")
    logger.info("  - Daily Ledger: 매일 00:05")
    logger.info("  - 발주서 처리: 매일 09:00")
    logger.info("  - 헬스 체크: 매시간")
    
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)  # 1분마다 체크
        except KeyboardInterrupt:
            logger.info("\n🛑 스케줄러 종료")
            break
        except Exception as e:
            logger.error(f"❌ 스케줄러 오류: {e}")
            time.sleep(60)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='PLAYAUTO 스케줄러')
    parser.add_argument('--test', action='store_true', help='테스트 모드 (즉시 실행)')
    parser.add_argument('--daemon', action='store_true', help='데몬 모드로 실행')
    
    args = parser.parse_args()
    
    if args.test:
        # 테스트 모드: 모든 작업 즉시 실행
        logger.info("🧪 테스트 모드 실행")
        run_daily_ledger()
        run_purchase_order_check()
        health_check()
    else:
        # 일반 스케줄러 실행
        run_scheduler()