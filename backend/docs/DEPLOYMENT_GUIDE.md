# 🚀 PLAYAUTO 배포 가이드

## 📋 배포 아키텍처

```
Frontend (Vercel) → Backend API (Railway) ← GitHub Actions (Scheduler)
                           ↓
                    PostgreSQL (External)
```

## 🔧 배포 준비 체크리스트

### 1. GitHub 저장소 설정
- [ ] Frontend 코드를 별도 저장소 또는 `/frontend` 폴더로 구성
- [ ] Backend 코드를 별도 저장소 또는 `/backend` 폴더로 구성
- [ ] GitHub Secrets 설정 (Settings → Secrets and variables → Actions)
  - `BACKEND_URL`: Railway 배포 후 받는 URL
  - `SCHEDULER_TOKEN`: 스케줄러 인증용 토큰

### 2. Railway 배포 (Backend)

#### 2.1 Railway 프로젝트 생성
```bash
# Railway CLI 설치 (선택사항)
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init
```

#### 2.2 환경변수 설정 (Railway Dashboard)
```env
# 데이터베이스
DATABASE_URL=postgresql://user:password@host:5432/dbname

# 보안
JWT_SECRET_KEY=your-secret-key
SCHEDULER_TOKEN=your-scheduler-token

# 환경 설정
ENVIRONMENT=production
TZ=Asia/Seoul
PORT=8000

# 기존 DB 정보 (현재 사용 중)
DB_HOST=15.164.112.237
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=bico0211
DB_NAME=dashboard
```

#### 2.3 배포 명령
```bash
# GitHub 연결 방식 (추천)
# Railway Dashboard에서 GitHub 저장소 연결

# 또는 CLI 방식
railway up
```

### 3. Vercel 배포 (Frontend)

#### 3.1 Vercel 프로젝트 생성
```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

#### 3.2 환경변수 설정 (Vercel Dashboard)
```env
VITE_API_URL=https://your-app.railway.app
```

#### 3.3 빌드 설정
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

## 🕐 스케줄러 설정

### APScheduler (Railway 내장)
- **용도**: 짧은 주기 작업, 실시간 처리
- **작업**: 헬스체크 (매시간)
- **장점**: 즉시 실행 가능, 낮은 지연시간
- **단점**: 서버 재시작 시 상태 손실

### GitHub Actions (외부 스케줄러)
- **용도**: 중요한 일일 작업
- **작업**:
  - Daily Ledger 생성 (매일 00:05 KST)
  - 발주서 처리 (매일 09:00 KST)
- **장점**: 100% 신뢰성, 무료
- **단점**: 최소 5분 단위 스케줄링

## 🔒 보안 설정

### API 인증 토큰 추가
```python
# app/core/security.py
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_scheduler_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    if token != settings.SCHEDULER_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid token")
    return token

# 스케줄러 엔드포인트에 적용
@router.post("/daily-ledger/run", dependencies=[Depends(verify_scheduler_token)])
async def run_daily_ledger():
    # ...
```

## 📊 모니터링

### Railway 대시보드
- Metrics: CPU, Memory, Network
- Logs: 실시간 로그 스트리밍
- Deployments: 배포 히스토리

### GitHub Actions
- Actions 탭에서 스케줄러 실행 이력 확인
- 실패 시 이메일 알림

## 🚨 트러블슈팅

### 문제: 스케줄러가 실행되지 않음
**해결:**
1. GitHub Actions 워크플로우 확인
2. Railway 서버 상태 확인
3. 환경변수 설정 확인
4. 로그 확인

### 문제: CORS 오류
**해결:**
```python
# main.py에서 CORS 설정 확인
allow_origins=["https://your-frontend.vercel.app"]
```

### 문제: 데이터베이스 연결 실패
**해결:**
1. Railway 환경변수 확인
2. PostgreSQL 방화벽 규칙 확인
3. 연결 문자열 형식 확인

## 📝 배포 후 체크리스트

- [ ] Frontend 접속 테스트
- [ ] Backend API 헬스체크 (`/health`)
- [ ] 데이터베이스 연결 확인
- [ ] 스케줄러 수동 실행 테스트
- [ ] GitHub Actions 워크플로우 수동 실행
- [ ] 로그 모니터링 설정
- [ ] 에러 알림 설정

## 🔄 업데이트 프로세스

### 자동 배포 (CI/CD)
```yaml
# GitHub → Railway (Backend)
# main 브랜치 push 시 자동 배포

# GitHub → Vercel (Frontend)
# main 브랜치 push 시 자동 배포
```

### 수동 배포
```bash
# Backend (Railway)
railway up

# Frontend (Vercel)
vercel --prod
```

## 📞 지원

- Railway 문서: https://docs.railway.app
- Vercel 문서: https://vercel.com/docs
- GitHub Actions 문서: https://docs.github.com/actions

---

*마지막 업데이트: 2025-09-19*