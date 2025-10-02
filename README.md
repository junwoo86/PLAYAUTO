# 🚀 PLAYAUTO - 통합 재고 관리 시스템

<div align="center">
  <img src="https://img.shields.io/badge/Version-1.5.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Python-3.13.4-green.svg" alt="Python">
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.115.6-009688.svg" alt="FastAPI">
  <img src="https://img.shields.io/badge/PostgreSQL-15+-336791.svg" alt="PostgreSQL">
</div>

## 📋 프로젝트 소개

**PLAYAUTO**는 멀티채널 전자상거래를 위한 통합 재고 관리 시스템입니다.
쿠팡, 스마트스토어, 자사몰 등 여러 판매 채널의 재고를 중앙에서 통합 관리하며, AI 기반 수요 예측과 자동 발주 시스템을 제공합니다.

### 주요 기능
- 📦 **실시간 재고 관리** - 다중 창고 지원, 실시간 재고 추적
- 🛒 **발주 자동화** - MOQ/리드타임 고려 자동 발주 제안
- 📊 **통계 및 분석** - 재고 회전율, 매출 분석, KPI 대시보드
- 📋 **일일 수불부** - 자동 생성 및 Excel 내보내기
- 🔐 **보안** - JWT 기반 인증, 역할 기반 권한 관리
- 📝 **세트 상품 BOM** - 세트 상품 구성 관리
- 🔍 **재고 체크포인트** - 재고 무결성 보장 시스템

## 🛠 기술 스택

### Frontend
- **Framework**: React 18.3.1 + TypeScript 5.6.3
- **Build Tool**: Vite 6.0.3
- **Styling**: Tailwind CSS 3.4.17
- **State Management**: React Context API
- **Charts**: Recharts 2.15.0

### Backend
- **Framework**: FastAPI 0.115.6 + Python 3.13.4
- **ORM**: SQLAlchemy 2.0.36
- **Database**: PostgreSQL 15+
- **Scheduler**: APScheduler 3.10.4
- **Authentication**: JWT (PyJWT)

### DevOps
- **Container**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Code Review**: Claude AI Integration

## 📁 프로젝트 구조

```
PLAYAUTO/
├── frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── pages/         # 26개 페이지 컴포넌트
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── services/      # API 서비스
│   │   └── contexts/      # 전역 상태 관리
│   └── package.json
│
├── backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── api/          # 17개 API 모듈
│   │   ├── models/       # SQLAlchemy 모델
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── services/     # 비즈니스 로직
│   │   └── core/         # 핵심 설정
│   ├── migrations/       # DB 마이그레이션
│   └── requirements.txt
│
├── .claude/              # AI 협업 문서
└── docker-compose.yml    # 컨테이너 오케스트레이션
```

## 🚀 시작하기

### 필수 요구사항
- Node.js 18+
- Python 3.13+
- PostgreSQL 15+
- Git

### 1. 저장소 클론
```bash
git clone https://github.com/junwoo86/PLAYAUTO.git
cd PLAYAUTO
```

### 2. Backend 설정

#### 환경 변수 설정
```bash
cd backend
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 정보 입력
```

#### 가상환경 생성 및 의존성 설치
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 데이터베이스 마이그레이션
```bash
# 마이그레이션 실행
python scripts/migration/run_migrations.py
```

#### 서버 실행
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend 설정

#### 의존성 설치
```bash
cd ../frontend
npm install
```

#### 개발 서버 실행
```bash
npm run dev
```

### 4. Docker로 실행 (권장)
```bash
# 프로젝트 루트에서
docker-compose up -d
```

## 📖 API 문서

서버 실행 후 다음 주소에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

### API 모듈 (17개)
- Auth (인증/권한)
- Users (사용자 관리)
- Groups (그룹 관리)
- Products (제품 관리)
- Transactions (재고 트랜잭션)
- Purchase Orders (발주 관리)
- Daily Ledger (일일 수불부)
- Statistics (통계)
- Inventory Analysis (재고 분석)
- Sales Analysis (매출 분석)
- Stock Checkpoints (재고 체크포인트)
- Product BOM (세트 상품)
- Warehouses (창고 관리)
- Batch Processing (일괄 처리)
- Scheduler (스케줄러)
- Notifications (알림)
- Disposal Report (폐기 리포트)

## 🧪 테스트

### Backend 테스트
```bash
cd backend
pytest tests/ --cov=app --cov-report=html
```

### Frontend 테스트
```bash
cd frontend
npm test
```

## 📊 프로젝트 현황

- **완성도**: 95%
- **API 엔드포인트**: 17개 모듈 구현 완료
- **Frontend 페이지**: 26개 페이지 구현 완료
- **데이터베이스**: 17개 테이블 운영
- **테스트 커버리지**: 65%

## 🔒 보안

- JWT 기반 인증 시스템
- 역할 기반 접근 제어 (RBAC)
- 환경 변수를 통한 민감 정보 관리
- CORS 설정
- SQL Injection 방지 (SQLAlchemy ORM)

## 📝 라이센스

이 프로젝트는 MIT 라이센스 하에 있습니다.

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

- **GitHub**: https://github.com/junwoo86/PLAYAUTO
- **Issues**: https://github.com/junwoo86/PLAYAUTO/issues

## 🙏 Acknowledgments

- FastAPI 팀
- React 팀
- Claude AI by Anthropic
- 모든 오픈소스 기여자들

---

<div align="center">
Made with ❤️ by PLAYAUTO Team
</div>