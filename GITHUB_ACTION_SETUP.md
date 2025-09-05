# 🤖 Claude Code GitHub Action 설정 가이드

## 📋 설정 완료 상태
✅ GitHub Actions 워크플로우 파일 생성 완료 (`.github/workflows/claude.yml`)

## 🔐 필수 설정 사항

### 1. Claude GitHub 앱 설치
1. https://github.com/apps/claude 방문
2. "Install" 버튼 클릭
3. PLAYAUTO 리포지토리 선택
4. 권한 승인

### 2. GitHub Secrets 설정

#### 방법 A: Claude Code OAuth 토큰 사용 (Max 플랜 - 권장)
1. 로컬에서 Claude Code CLI 실행:
   ```bash
   claude setup-token
   ```
2. 생성된 토큰 복사
3. GitHub 리포지토리 설정:
   - Settings → Secrets and variables → Actions
   - "New repository secret" 클릭
   - Name: `CLAUDE_CODE_OAUTH_TOKEN`
   - Value: 복사한 토큰 붙여넣기
   - "Add secret" 클릭

#### 방법 B: Anthropic API 키 사용
1. https://console.anthropic.com 에서 API 키 생성
2. GitHub 리포지토리 설정:
   - Settings → Secrets and variables → Actions
   - "New repository secret" 클릭
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-`로 시작하는 API 키
   - "Add secret" 클릭

## 🎯 워크플로우 기능

### 자동 PR 리뷰
- Pull Request 생성/업데이트 시 자동으로 코드 리뷰
- 한글로 상세한 피드백 제공
- 보안 취약점 검사
- 코드 품질 검사
- 베스트 프랙티스 제안

### 이슈 도우미
- `claude-help` 라벨이 붙은 이슈에 자동 응답
- 문제 해결 방안 제시
- 구현 예시 코드 제공

### 리뷰 포커스
1. React/TypeScript 베스트 프랙티스
2. FastAPI/SQLAlchemy 패턴
3. 보안 취약점 (SQL Injection, XSS 등)
4. 성능 최적화
5. 코드 재사용성 및 유지보수성
6. 에러 처리
7. API 응답 형식 일관성
8. 데이터베이스 쿼리 최적화

## 🚀 사용 방법

### PR 리뷰 받기
1. 브랜치를 생성하고 코드 변경
2. Pull Request 생성
3. 자동으로 Claude가 리뷰 시작
4. 코멘트 확인 및 피드백 반영

### 이슈에서 도움 받기
1. 새 이슈 생성
2. `claude-help` 라벨 추가
3. Claude가 자동으로 응답

### PR 코멘트로 Claude 호출
PR 코멘트에서 `@claude` 멘션하여 추가 리뷰 요청 가능

## 📝 워크플로우 수정
필요시 `.github/workflows/claude.yml` 파일을 수정하여 설정 변경 가능:
- 모델 변경
- 리뷰 언어 변경
- 커스텀 지침 수정
- 검사 항목 활성화/비활성화

## ⚠️ 주의사항
- API 키나 토큰을 코드에 직접 포함하지 마세요
- 항상 GitHub Secrets 사용
- 정기적으로 토큰 갱신 권장
- PR이나 이슈에 민감한 정보 노출 주의

## 🔗 참고 링크
- [Claude GitHub Action 문서](https://github.com/anthropics/claude-code-action)
- [GitHub Actions Secrets 문서](https://docs.github.com/en/actions/security-guides/encrypted-secrets)