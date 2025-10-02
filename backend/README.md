# 🚀 PLAYAUTO Backend

FastAPI 기반의 재고 관리 시스템 백엔드 서버

## 📁 디렉토리 구조

```
backend/
├── app/                    # 메인 애플리케이션
│   ├── api/               # API 엔드포인트
│   │   └── v1/
│   │       └── endpoints/ # 16개 도메인별 라우터
│   ├── core/              # 핵심 설정 및 유틸리티
│   │   ├── config.py      # 환경 설정
│   │   ├── database.py    # DB 연결
│   │   ├── scheduler.py   # 스케줄러 설정
│   │   └── security.py    # 보안 설정 (JWT)
│   ├── models/            # SQLAlchemy ORM 모델 (17개 테이블)
│   ├── schemas/           # Pydantic 스키마
│   └── services/          # 비즈니스 로직
│
├── tests/                 # 테스트 파일 (구조화됨)
│   ├── unit/             # 단위 테스트
│   ├── integration/      # 통합 테스트
│   ├── e2e/             # End-to-End 테스트
│   ├── fixtures/        # 테스트 데이터
│   ├── conftest.py      # Pytest 설정
│   └── README.md        # 테스트 가이드라인
│
├── scripts/               # 유틸리티 스크립트
│   ├── db/               # DB 관리 스크립트
│   │   └── analyze_db_schema.py
│   ├── scheduler/        # 스케줄러 관련
│   └── data/             # 데이터 처리
│
├── migrations/           # DB 마이그레이션 SQL (018번까지)
├── config/               # 설정 파일
├── deploy/               # 배포 관련
├── docs/                 # 프로젝트 문서
│   ├── DEPLOYMENT_GUIDE.md
│   └── CLEANUP_PLAN.md
│
├── .gitignore           # Git 제외 목록 (보안 강화)
├── .env.example         # 환경 변수 템플릿
├── pytest.ini           # 테스트 설정
├── run_tests.sh         # 테스트 실행 스크립트
└── README.md            # 프로젝트 설명
```

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 가상환경 생성
python -m venv venv
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate  # Windows

# 패키지 설치
pip install -r config/requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일 편집하여 DB 정보 입력
# ⚠️ 주의: .env 파일은 절대 Git에 커밋하지 마세요!
```

### 2. 서버 실행

```bash
# 개발 서버 실행
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 또는 스크립트 사용
./deploy/start_server.sh
```

### 3. 스케줄러 실행

```bash
# 독립적인 스케줄러 서비스 실행
./scripts/scheduler/start_scheduler.sh
```

## 📝 주요 기능

- **재고 관리**: 실시간 재고 추적 및 알림
- **발주 관리**: 자동 발주 제안 및 처리
- **일일 수불부**: 자동 생성 및 리포트
- **통계 분석**: 대시보드 및 판매 분석
- **배치 처리**: 대량 데이터 처리

## 🛠️ 기술 스택

- **Framework**: FastAPI 0.115.5
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL 15
- **Scheduler**: APScheduler
- **Validation**: Pydantic
- **Testing**: Pytest

## 📖 API 문서

서버 실행 후:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🧪 테스트

```bash
# 전체 테스트 실행
./run_tests.sh

# 단위 테스트만
./run_tests.sh unit

# 통합 테스트만
./run_tests.sh integration

# 커버리지 확인
./run_tests.sh coverage

# pytest 직접 실행
pytest tests/ --cov=app --cov-report=html
```

### 테스트 커버리지 현황
- **전체**: 60-70% (목표: 80%)
- **핵심 서비스**: transaction_service, auth_service, daily_ledger_service 테스트 완료
- **API 엔드포인트**: product_endpoints 통합 테스트 완료

## 🗄️ 데이터베이스

### 마이그레이션 실행

```bash
# 새 마이그레이션 실행
python scripts/migration/run_migration.py

# 특정 마이그레이션 실행
python scripts/migration/run_migration_016.py
```

### DB 스키마 분석

```bash
# 현재 DB 구조 분석
python scripts/db/analyze_db_schema.py

# 테이블 체크
python scripts/db/check_database_schema.py
```

## 📅 스케줄러

### 등록된 작업

1. **Daily Ledger 생성**: 매일 00:05 (KST)
2. **발주서 처리**: 매일 09:00 (KST)
3. **헬스 체크**: 매시간

### 수동 실행

```bash
# Daily Ledger 수동 생성
python scripts/data/daily_ledger_automation.py --date 2025-09-18

# 발주서 처리
python scripts/data/process_purchase_orders.py
```

## 🚢 배포

### Docker

```bash
# 이미지 빌드
docker build -f deploy/Dockerfile -t playauto-backend .

# 컨테이너 실행
docker-compose -f deploy/docker-compose.yml up
```

### Railway

```bash
# railway.toml 설정 확인
# GitHub 저장소 연결하여 자동 배포
```

## 📊 모니터링

- **로그**: `logs/` 디렉토리 확인
- **스케줄러 로그**: `logs/scheduler_service.log`
- **API 로그**: 콘솔 또는 `backend.log`

## 🤝 기여 가이드

1. Feature 브랜치 생성
2. 코드 작성 및 테스트
3. PR 생성 (Claude AI 자동 리뷰)
4. 머지 후 자동 배포

## 📞 문의

- GitHub Issues: [PLAYAUTO Issues](https://github.com/junwoo86/PLAYAUTO/issues)
- 문서: `.claude/` 디렉토리 참조

---

*Last Updated: 2025-09-19*