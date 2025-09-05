#!/bin/zsh

# 프론트엔드 서버 실행 스크립트
echo "🚀 PLAYAUTO 프론트엔드 서버를 시작합니다..."

# 프론트엔드 디렉토리로 이동
cd /Users/junwoo/Developer/Work/PLAYAUTO/frontend

# Node 패키지 설치 확인
if [[ ! -d "node_modules" ]]; then
    echo "📦 필요한 패키지를 설치합니다..."
    npm install
else
    echo "✅ 패키지가 이미 설치되어 있습니다."
fi

# 환경변수 설정
export VITE_API_URL=http://localhost:8000

# Vite 개발 서버 실행 (--host로 외부 접속 허용)
echo "✅ 프론트엔드 서버를 시작합니다"
echo "🌐 로컬 접속: http://localhost:3000"
echo "🌐 네트워크 접속: http://0.0.0.0:3000"
echo "💡 종료하려면 Ctrl+C를 누르세요"
npm run dev -- --host 0.0.0.0 --port 3000