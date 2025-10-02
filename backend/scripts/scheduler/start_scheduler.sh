#!/bin/bash

# 스케줄러 서비스 시작 스크립트
# 백엔드 서버와 독립적으로 스케줄러를 실행합니다

echo "========================================"
echo "PLAYAUTO 스케줄러 서비스 시작"
echo "========================================"

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# 로그 디렉토리 생성
mkdir -p logs

# Python 경로 설정
PYTHON_PATH="/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"

# 이미 실행 중인지 확인
PID_FILE="scheduler.pid"

if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null; then
        echo "⚠️  스케줄러가 이미 실행 중입니다 (PID: $OLD_PID)"
        echo "종료하려면: kill $OLD_PID"
        exit 1
    else
        echo "이전 PID 파일 제거"
        rm "$PID_FILE"
    fi
fi

# 스케줄러 시작
echo "스케줄러를 백그라운드로 시작합니다..."
nohup "$PYTHON_PATH" scheduler_service.py > logs/scheduler_nohup.log 2>&1 &
SCHEDULER_PID=$!

# PID 저장
echo $SCHEDULER_PID > "$PID_FILE"

echo "✅ 스케줄러가 시작되었습니다 (PID: $SCHEDULER_PID)"
echo ""
echo "로그 확인:"
echo "  tail -f logs/scheduler_service.log"
echo ""
echo "종료하려면:"
echo "  kill $SCHEDULER_PID"
echo "  rm $PID_FILE"