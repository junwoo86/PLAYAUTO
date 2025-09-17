# 🚀 PLAYAUTO GitHub 설정 다음 단계

## ✅ 완료된 작업
1. Git 리포지토리 초기화 완료
2. 모든 파일 커밋 완료
3. GitHub CLI 설치 완료
4. Claude GitHub Action 워크플로우 설정 완료

## 📋 진행해야 할 단계

### 1️⃣ 터미널에서 Claude OAuth 토큰 생성
```bash
# 새 터미널 창을 열고 실행
claude setup-token
```
브라우저가 열리면 로그인 후 토큰을 복사해두세요.

### 2️⃣ GitHub CLI 로그인
```bash
gh auth login
```
- GitHub.com 선택
- HTTPS 선택
- Authenticate with browser 선택
- 브라우저에서 인증 완료

### 3️⃣ GitHub 리포지토리 생성 및 푸시
```bash
# 리포지토리 생성 (private으로 생성하려면 --private 추가)
gh repo create PLAYAUTO --public --description "PLAYAUTO 재고 관리 시스템"

# 원격 저장소 추가 (이미 생성된 경우)
git remote add origin https://github.com/YOUR_USERNAME/PLAYAUTO.git

# 코드 푸시
git push -u origin main
```

### 4️⃣ GitHub Secrets 설정
```bash
# Claude OAuth 토큰 설정 (1단계에서 복사한 토큰 사용)
echo "YOUR_CLAUDE_TOKEN" | gh secret set CLAUDE_CODE_OAUTH_TOKEN

# 또는 Anthropic API 키 설정
echo "sk-ant-YOUR_API_KEY" | gh secret set ANTHROPIC_API_KEY
```

### 5️⃣ Claude GitHub App 설치
1. https://github.com/apps/claude 방문
2. "Install" 버튼 클릭
3. PLAYAUTO 리포지토리 선택
4. 권한 승인

## 🎯 설정 완료 확인

### 리포지토리 확인
```bash
# 리포지토리 정보 확인
gh repo view

# Secrets 확인
gh secret list
```

### 테스트 PR 생성
```bash
# 새 브랜치 생성
git checkout -b test-claude-action

# 작은 변경 사항 만들기
echo "# Test PR for Claude Action" >> README.md
git add README.md
git commit -m "Test: Claude Action PR review"

# PR 생성
git push -u origin test-claude-action
gh pr create --title "Test Claude Action" --body "Testing Claude GitHub Action review"
```

## 🔗 유용한 링크
- GitHub 리포지토리: https://github.com/YOUR_USERNAME/PLAYAUTO
- Claude GitHub App: https://github.com/apps/claude
- GitHub Actions 로그: https://github.com/YOUR_USERNAME/PLAYAUTO/actions

## 📝 참고사항
- GitHub 사용자명을 YOUR_USERNAME 부분에 실제 사용자명으로 변경하세요
- Private 리포지토리로 만들려면 `--public`을 `--private`으로 변경하세요
- API 키는 절대 코드에 직접 포함하지 마세요

## 🆘 문제 해결
- GitHub CLI 인증 실패 시: `gh auth logout` 후 다시 로그인
- 리포지토리 생성 실패 시: GitHub 웹사이트에서 직접 생성 후 `git remote add` 명령 사용
- Secrets 설정 실패 시: GitHub 웹사이트 Settings → Secrets에서 직접 추가