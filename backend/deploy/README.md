# 📦 PLAYAUTO Backend 배포 가이드

## 🚀 빠른 시작

### 1. 로컬 개발 환경
```bash
# 서버 시작 (스케줄러 자동 시작)
./start_server.sh

# 또는 Docker Compose 사용
docker-compose up -d
```

### 2. 프로덕션 배포
```bash
# 환경 변수 설정
cp .env.production.example .env.production
# .env.production 파일 편집하여 실제 값 입력

# Docker 이미지 빌드
docker build -t playauto-backend:latest .

# Docker Compose로 실행
docker-compose -f docker-compose.yml up -d
```

## 🔄 스케줄러 자동 실행

배포 시 스케줄러는 **자동으로 시작**됩니다:

### 예정된 작업
1. **일일 수불부 생성** - 매일 00:05 (KST)
2. **발주서 상태 확인** - 매일 09:00 (KST)
3. **헬스 체크** - 매시간 정각

### 스케줄러 상태 확인
```bash
# 헬스 체크 스크립트 실행
python check_scheduler_health.py

# API로 확인
curl http://localhost:8000/api/v1/scheduler/status
```

### 누락된 데이터 복구
```bash
# 누락된 일일 수불부 생성
python generate_missing_daily_ledgers.py
```

## 🐳 Docker 명령어

### 기본 명령어
```bash
# 컨테이너 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f backend

# 컨테이너 중지
docker-compose down

# 컨테이너 재시작
docker-compose restart backend

# 컨테이너 상태 확인
docker-compose ps
```

### 컨테이너 내부 접속
```bash
# bash 셸 접속
docker exec -it playauto-backend bash

# Python 셸 접속
docker exec -it playauto-backend python

# 스케줄러 상태 직접 확인
docker exec -it playauto-backend python -c "
from app.core.scheduler import SchedulerManager
sm = SchedulerManager()
print('Scheduler running:', sm.scheduler.running)
for job in sm.scheduler.get_jobs():
    print(f'Job: {job.name}, Next run: {job.next_run_time}')
"
```

## 🔧 GitHub Actions 배포

GitHub에 푸시하면 자동으로:

1. **테스트 실행** - pytest로 코드 검증
2. **스케줄러 설정 확인** - 작업이 올바르게 등록되었는지 확인
3. **Docker 이미지 빌드** - 컨테이너화
4. **프로덕션 배포** - main 브랜치 머지 시

### 필요한 GitHub Secrets
```
DEPLOY_HOST      # 배포 서버 주소
DEPLOY_USER      # 배포 서버 사용자
DEPLOY_KEY       # SSH 배포 키
DB_HOST          # 데이터베이스 호스트
DB_PORT          # 데이터베이스 포트
DB_USER          # 데이터베이스 사용자
DB_PASSWORD      # 데이터베이스 비밀번호
DB_NAME          # 데이터베이스 이름
```

## 📊 모니터링

### 헬스 체크
```bash
# 서버 상태
curl http://localhost:8000/health

# 스케줄러 상태
curl http://localhost:8000/api/v1/scheduler/status

# 스케줄러 로그
curl http://localhost:8000/api/v1/scheduler/logs?limit=20
```

### 로그 파일
```bash
# Docker 로그
docker-compose logs -f backend

# 애플리케이션 로그 (컨테이너 내부)
docker exec -it playauto-backend tail -f logs/app.log
```

## 🛠️ 트러블슈팅

### 스케줄러가 작동하지 않는 경우
1. 서버 재시작: `docker-compose restart backend`
2. 로그 확인: `docker-compose logs backend | grep scheduler`
3. 헬스 체크: `python check_scheduler_health.py`

### 일일 수불부가 생성되지 않는 경우
1. 누락된 날짜 수동 생성: `python generate_missing_daily_ledgers.py`
2. 스케줄러 작업 확인: API `/scheduler/status` 호출
3. 시간대 설정 확인: 환경 변수 `TZ=Asia/Seoul`

### 데이터베이스 연결 실패
1. 환경 변수 확인: `.env.production` 파일
2. 네트워크 연결 테스트: `docker exec -it playauto-backend pg_isready -h $DB_HOST`
3. 방화벽 규칙 확인

## 📋 체크리스트

배포 전 확인사항:
- [ ] `.env.production` 파일 설정 완료
- [ ] 데이터베이스 연결 정보 확인
- [ ] GitHub Secrets 설정
- [ ] 도메인 및 CORS 설정
- [ ] SSL 인증서 설정 (프로덕션)
- [ ] 백업 전략 수립
- [ ] 모니터링 도구 설정

배포 후 확인사항:
- [ ] 헬스 체크 통과
- [ ] 스케줄러 작동 확인
- [ ] 일일 수불부 생성 확인
- [ ] API 문서 접근 가능
- [ ] 로그 수집 정상 작동

## 📞 지원

문제 발생 시:
1. 이슈 트래커: GitHub Issues
2. 로그 확인: `docker-compose logs`
3. 헬스 체크: `check_scheduler_health.py`

---
*Last Updated: 2025-09-17*