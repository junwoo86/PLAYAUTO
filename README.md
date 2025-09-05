# PLAYAUTO 재고 관리 시스템

## 📦 프로젝트 소개
PLAYAUTO는 멀티채널 전자상거래를 위한 통합 재고 관리 시스템입니다.

## 🚀 주요 기능
- **실시간 재고 관리**: 입출고 처리 및 재고 추적
- **발주 관리**: 구매 발주서 생성 및 입고 처리
- **통계 대시보드**: 실시간 비즈니스 인사이트
- **일일 수불부**: 일일 재고 변동 내역 관리
- **배치 처리**: 대량 데이터 처리 지원
- **재고 알림**: 안전 재고 이하 알림

## 🛠 기술 스택

### Frontend
- **React 18** + **TypeScript**
- **Vite** (빌드 도구)
- **Tailwind CSS** (스타일링)
- **Recharts** (차트)
- **Axios** (HTTP 클라이언트)

### Backend
- **FastAPI** (Python 웹 프레임워크)
- **SQLAlchemy** (ORM)
- **PostgreSQL** (데이터베이스)
- **Pydantic** (데이터 검증)

## 📁 프로젝트 구조
```
PLAYAUTO/
├── frontend/               # React 프론트엔드
│   ├── src/
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── components/    # 재사용 가능한 컴포넌트
│   │   ├── services/      # API 서비스
│   │   └── contexts/      # React Context
│   └── package.json
├── backend/               # FastAPI 백엔드
│   ├── app/
│   │   ├── api/          # API 엔드포인트
│   │   ├── models/       # 데이터베이스 모델
│   │   ├── schemas/      # Pydantic 스키마
│   │   └── services/     # 비즈니스 로직
│   └── requirements.txt
└── .github/
    └── workflows/        # GitHub Actions
```

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+
- Python 3.10+
- PostgreSQL 15+

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/junwoo86/PLAYAUTO.git
cd PLAYAUTO
```

2. **백엔드 설정**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

3. **프론트엔드 설정**
```bash
cd frontend
npm install
npm run dev
```

4. **데이터베이스 설정**
PostgreSQL에서 `playauto_platform` 스키마를 생성하고 환경 변수를 설정하세요.

## 📊 API 문서
백엔드 서버 실행 후: http://localhost:8000/docs

## 🤖 Claude GitHub Action
이 프로젝트는 Claude GitHub Action을 사용하여 자동 코드 리뷰를 수행합니다.
- PR 생성 시 자동 코드 리뷰
- 보안 취약점 검사
- 코드 품질 개선 제안

## 📝 라이선스
MIT License

## 👥 기여하기
PR과 이슈를 환영합니다!

## 📞 문의
이슈 트래커를 통해 문의해주세요.