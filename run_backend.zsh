#!/bin/zsh

# 백엔드 서버 실행 스크립트
echo "🚀 PLAYAUTO 백엔드 서버를 시작합니다..."

# 백엔드 디렉토리로 이동
cd /Users/junwoo/Developer/Work/PLAYAUTO/backend

# Python 가상환경 활성화 (없으면 생성)
if [[ ! -d "venv" ]]; then
    echo "📦 Python 가상환경을 생성합니다..."
    python3 -m venv venv
fi

# 가상환경 활성화
source venv/bin/activate

# 필요한 패키지 설치
echo "📦 필요한 패키지를 설치합니다..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# 환경변수 설정
export DATABASE_URL=postgresql://postgres:bico0211@15.164.112.237:5432/dashboard
export DB_SCHEMA=playauto_platform

# Uvicorn 서버 실행 (0.0.0.0으로 외부 접속 허용)
echo "✅ 백엔드 서버를 시작합니다 (http://0.0.0.0:8000)"
echo "📖 API 문서: http://localhost:8000/docs"
echo "💡 종료하려면 Ctrl+C를 누르세요"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000