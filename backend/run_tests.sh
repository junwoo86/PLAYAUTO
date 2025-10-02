#!/bin/bash

# PLAYAUTO 테스트 실행 스크립트
# 사용법: ./run_tests.sh [옵션]

set -e  # 에러 발생 시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 헤더 출력
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}                           PLAYAUTO 테스트 실행기                               ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 기본 설정
TEST_TYPE=${1:-"all"}
COVERAGE_THRESHOLD=50

# Python 가상환경 활성화
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓ 가상환경 활성화됨${NC}"
else
    echo -e "${YELLOW}⚠ 가상환경이 없습니다. 생성 중...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# 필요한 패키지 설치 확인
echo -e "\n${BLUE}패키지 확인 중...${NC}"
pip install -q pytest pytest-cov pytest-html pytest-env 2>/dev/null || true

# 테스트 디렉토리 구조 확인
if [ ! -d "tests" ]; then
    echo -e "${RED}✗ tests 디렉토리가 없습니다!${NC}"
    exit 1
fi

# 테스트 실행 함수
run_tests() {
    local test_path=$1
    local test_name=$2

    echo -e "\n${BLUE}▶ ${test_name} 실행 중...${NC}"

    if pytest $test_path -v --tb=short; then
        echo -e "${GREEN}✓ ${test_name} 성공${NC}"
        return 0
    else
        echo -e "${RED}✗ ${test_name} 실패${NC}"
        return 1
    fi
}

# 테스트 타입별 실행
case $TEST_TYPE in
    unit)
        echo -e "\n${YELLOW}단위 테스트 실행${NC}"
        run_tests "tests/unit/" "단위 테스트"
        ;;

    integration)
        echo -e "\n${YELLOW}통합 테스트 실행${NC}"
        run_tests "tests/integration/" "통합 테스트"
        ;;

    e2e)
        echo -e "\n${YELLOW}E2E 테스트 실행${NC}"
        run_tests "tests/e2e/" "E2E 테스트"
        ;;

    coverage)
        echo -e "\n${YELLOW}커버리지 테스트 실행${NC}"
        pytest --cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=$COVERAGE_THRESHOLD

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ 커버리지 ${COVERAGE_THRESHOLD}% 이상 달성${NC}"
            echo -e "${BLUE}HTML 리포트: htmlcov/index.html${NC}"
        else
            echo -e "${RED}✗ 커버리지 ${COVERAGE_THRESHOLD}% 미달${NC}"
            exit 1
        fi
        ;;

    fast)
        echo -e "\n${YELLOW}빠른 테스트 실행 (slow 제외)${NC}"
        pytest -m "not slow" -v
        ;;

    all|*)
        echo -e "\n${YELLOW}전체 테스트 실행${NC}"

        # 각 테스트 타입 실행
        FAILED_TESTS=""

        run_tests "tests/unit/" "단위 테스트" || FAILED_TESTS="${FAILED_TESTS} unit"
        run_tests "tests/integration/" "통합 테스트" || FAILED_TESTS="${FAILED_TESTS} integration"

        # 커버리지 계산
        echo -e "\n${BLUE}커버리지 계산 중...${NC}"
        pytest --cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=$COVERAGE_THRESHOLD -q

        # 결과 요약
        echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}                              테스트 결과 요약                                 ${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

        if [ -z "$FAILED_TESTS" ]; then
            echo -e "${GREEN}✓ 모든 테스트 통과!${NC}"
            echo -e "${GREEN}✓ 커버리지 리포트: htmlcov/index.html${NC}"
            exit 0
        else
            echo -e "${RED}✗ 실패한 테스트:${FAILED_TESTS}${NC}"
            exit 1
        fi
        ;;
esac

# 스크립트 종료
echo -e "\n${BLUE}테스트 실행 완료${NC}"