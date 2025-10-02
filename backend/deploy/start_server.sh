#!/bin/bash

# PLAYAUTO Backend Server 시작 스크립트
# 이 스크립트는 서버 시작 시 스케줄러도 함께 시작합니다.

echo "==========================================="
echo "🚀 PLAYAUTO Backend Server 시작"
echo "==========================================="

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📁 작업 디렉토리: $SCRIPT_DIR"

# Python 가상환경 활성화 (있는 경우)
if [ -d "venv" ]; then
    echo "🐍 Python 가상환경 활성화..."
    source venv/bin/activate
fi

# 필요한 패키지 설치 확인
echo "📦 패키지 확인..."
pip install -q -r requirements.txt

# 환경 변수 로드
if [ -f ".env" ]; then
    echo "🔧 환경 변수 로드..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# 포트 설정
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo ""
echo "🎯 서버 설정:"
echo "  - Host: $HOST"
echo "  - Port: $PORT"
echo "  - API Docs: http://localhost:$PORT/docs"
echo ""

# 서버 시작 (스케줄러 자동 시작됨)
echo "🔄 서버 시작 중..."
echo "  - 스케줄러가 자동으로 시작됩니다"
echo "  - 일일 수불부: 매일 00:05 자동 생성"
echo "  - 발주서 확인: 매일 09:00 자동 실행"
echo ""

# uvicorn 실행
uvicorn app.main:app \
    --host $HOST \
    --port $PORT \
    --reload \
    --log-level info