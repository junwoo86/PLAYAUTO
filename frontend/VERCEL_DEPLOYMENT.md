# Vercel 배포 가이드

## 환경변수 설정

Vercel에서 프로덕션 배포 시 Mixed Content 에러를 방지하려면 환경변수를 설정해야 합니다.

### 1. Vercel 대시보드에서 환경변수 설정

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. `biocom-logistics` 프로젝트 선택
3. `Settings` 탭 클릭
4. 왼쪽 메뉴에서 `Environment Variables` 선택
5. 다음 환경변수 추가:

```
Key: VITE_API_BASE_URL
Value: https://playauto-production.up.railway.app
Environment: Production, Preview, Development (모두 선택)
```

6. `Save` 클릭
7. `Deployments` 탭으로 이동
8. 최신 배포의 `...` 메뉴 클릭 → `Redeploy` 선택
9. `Redeploy` 버튼 클릭하여 재배포

### 2. 환경변수가 제대로 설정되었는지 확인

재배포 완료 후:
1. https://biocom-logistics.vercel.app 접속
2. 브라우저 개발자 도구 열기 (F12)
3. `Console` 탭 확인
4. `Network` 탭에서 API 요청 확인
5. 모든 API 요청이 `https://playauto-production.up.railway.app`로 가는지 확인

### 3. 문제 해결

만약 여전히 HTTP 요청이 발생한다면:

1. **브라우저 캐시 삭제**
   - Chrome: `Ctrl+Shift+Delete` (Windows) / `Cmd+Shift+Delete` (Mac)
   - `Cached images and files` 체크
   - `Clear data` 클릭

2. **하드 리프레시**
   - Chrome: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` (Windows) / `Cmd+Shift+R` (Mac)

3. **시크릿/프라이빗 모드에서 테스트**
   - Chrome: `Ctrl+Shift+N` (Windows) / `Cmd+Shift+N` (Mac)

## 로컬 개발 환경

로컬에서 개발 시에는 `/frontend/.env` 파일을 사용합니다:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 파일 구조

- `/frontend/.env` - 로컬 개발용 (gitignore에 포함, 커밋하지 않음)
- `/frontend/.env.production` - 프로덕션 기본값 (커밋됨)
- `/frontend/vite.config.ts` - Vite 빌드 설정 (환경변수 명시적 정의)

## Mixed Content 에러란?

HTTPS로 로드된 페이지에서 HTTP 리소스를 요청하면 브라우저가 보안상 이유로 차단합니다.

**예시:**
```
Mixed Content: The page at 'https://biocom-logistics.vercel.app' was loaded over HTTPS,
but requested an insecure XMLHttpRequest endpoint 'http://playauto-production.up.railway.app/api/v1/products'.
This request has been blocked; the content must be served over HTTPS.
```

**해결 방법:**
- 백엔드 API도 HTTPS를 사용하도록 설정
- 프론트엔드에서 HTTPS URL로 요청하도록 환경변수 설정
