#!/bin/zsh

# 두 서버를 동시에 실행하는 스크립트
echo "🚀 PLAYAUTO 전체 시스템을 시작합니다..."
echo ""

# 현재 디렉토리 저장
PLAYAUTO_DIR="/Users/junwoo/Developer/Work/PLAYAUTO"

# 터미널을 새로 열어서 백엔드 실행
osascript -e "tell application \"Terminal\" to do script \"cd $PLAYAUTO_DIR && ./run_backend.zsh\""

# 2초 대기 (백엔드가 먼저 시작되도록)
sleep 2

# 터미널을 새로 열어서 프론트엔드 실행
osascript -e "tell application \"Terminal\" to do script \"cd $PLAYAUTO_DIR && ./run_frontend.zsh\""

echo ""
echo "✅ 모든 서버가 시작되었습니다!"
echo ""
echo "📝 접속 정보:"
echo "   - 프론트엔드: http://localhost:3000"
echo "   - 백엔드 API: http://localhost:8000"
echo "   - API 문서: http://localhost:8000/docs"
echo ""
echo "💡 각 터미널 창에서 Ctrl+C로 서버를 종료할 수 있습니다."