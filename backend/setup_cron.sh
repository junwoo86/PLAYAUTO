#!/bin/bash

# PLAYAUTO Daily Ledger 자동화 crontab 설정 스크립트

echo "======================================================"
echo "📅 PLAYAUTO Daily Ledger 자동화 설정"
echo "======================================================"

# Python 경로 확인
PYTHON_PATH=$(which python3)
if [ -z "$PYTHON_PATH" ]; then
    echo "❌ Python3를 찾을 수 없습니다."
    exit 1
fi
echo "✅ Python 경로: $PYTHON_PATH"

# 스크립트 경로
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DAILY_LEDGER_SCRIPT="$SCRIPT_DIR/daily_ledger_automation.py"
PURCHASE_ORDER_SCRIPT="$SCRIPT_DIR/process_purchase_orders.py"
SCHEDULER_SCRIPT="$SCRIPT_DIR/scheduler.py"

# 스크립트 존재 확인
if [ ! -f "$DAILY_LEDGER_SCRIPT" ]; then
    echo "❌ Daily Ledger 스크립트를 찾을 수 없습니다: $DAILY_LEDGER_SCRIPT"
    exit 1
fi

if [ ! -f "$PURCHASE_ORDER_SCRIPT" ]; then
    echo "❌ 발주서 처리 스크립트를 찾을 수 없습니다: $PURCHASE_ORDER_SCRIPT"
    exit 1
fi

echo "✅ 스크립트 위치 확인 완료"

# 로그 디렉토리 생성
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
echo "✅ 로그 디렉토리 생성: $LOG_DIR"

# cron 작업 내용
CRON_JOBS=$(cat <<EOF
# PLAYAUTO Daily Ledger 자동화
# 매일 자정 5분에 전날의 일일 수불부 생성
5 0 * * * $PYTHON_PATH $DAILY_LEDGER_SCRIPT >> $LOG_DIR/daily_ledger.log 2>&1

# 매일 오전 9시에 Draft 상태 발주서 처리
0 9 * * * $PYTHON_PATH $PURCHASE_ORDER_SCRIPT >> $LOG_DIR/purchase_order.log 2>&1

# 또는 Python 스케줄러 사용 (하나만 선택)
# @reboot $PYTHON_PATH $SCHEDULER_SCRIPT --daemon >> $LOG_DIR/scheduler.log 2>&1
EOF
)

echo ""
echo "📋 추가할 cron 작업:"
echo "======================================================"
echo "$CRON_JOBS"
echo "======================================================"
echo ""

# 사용자 선택
echo "어떻게 설정하시겠습니까?"
echo "1) crontab에 자동 추가"
echo "2) 수동으로 추가할 내용 표시"
echo "3) Python 스케줄러 테스트 실행"
echo "4) 취소"
read -p "선택 (1-4): " choice

case $choice in
    1)
        # 현재 crontab 백업
        crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S).txt 2>/dev/null
        
        # 새 cron 작업 추가
        (crontab -l 2>/dev/null; echo "$CRON_JOBS") | crontab -
        
        echo "✅ crontab에 작업이 추가되었습니다."
        echo ""
        echo "현재 crontab 내용:"
        crontab -l | grep PLAYAUTO -A 2
        ;;
        
    2)
        echo ""
        echo "다음 명령어로 crontab을 편집하세요:"
        echo "  crontab -e"
        echo ""
        echo "그리고 위의 cron 작업을 추가하세요."
        ;;
        
    3)
        echo ""
        echo "Python 스케줄러 테스트 모드 실행..."
        $PYTHON_PATH $SCHEDULER_SCRIPT --test
        ;;
        
    4)
        echo "취소되었습니다."
        exit 0
        ;;
        
    *)
        echo "잘못된 선택입니다."
        exit 1
        ;;
esac

echo ""
echo "======================================================"
echo "✅ 설정 완료!"
echo ""
echo "📌 참고사항:"
echo "  - 로그 확인: tail -f $LOG_DIR/daily_ledger.log"
echo "  - crontab 확인: crontab -l"
echo "  - crontab 편집: crontab -e"
echo "  - 수동 실행: python3 $DAILY_LEDGER_SCRIPT"
echo ""
echo "  백필이 필요한 경우:"
echo "  python3 $DAILY_LEDGER_SCRIPT --backfill --start-date YYYY-MM-DD --end-date YYYY-MM-DD"
echo "======================================================"