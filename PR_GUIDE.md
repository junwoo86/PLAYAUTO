# 📝 Pull Request 생성 가이드

## 🎯 PR 생성을 위한 전제 조건
1. GitHub 계정이 있어야 합니다
2. 리포지토리가 GitHub에 푸시되어 있어야 합니다

## 📋 단계별 진행 방법

### 1단계: GitHub CLI 로그인
```bash
gh auth login
```
다음 옵션 선택:
- ? What account do you want to log into? **GitHub.com**
- ? What is your preferred protocol for Git operations? **HTTPS**
- ? Authenticate Git with your GitHub credentials? **Yes**
- ? How would you like to authenticate GitHub CLI? **Login with a web browser**
- 브라우저에서 인증 코드 확인 후 Enter

### 2단계: GitHub 리포지토리 생성 (아직 없는 경우)
```bash
# Public 리포지토리로 생성
gh repo create PLAYAUTO --public --source=. --push

# 또는 Private 리포지토리로 생성
gh repo create PLAYAUTO --private --source=. --push
```

### 3단계: 테스트용 브랜치 생성
```bash
# 새 브랜치 생성 및 체크아웃
git checkout -b test-claude-review

# README 파일 생성 또는 수정
echo "# PLAYAUTO 재고 관리 시스템

## 프로젝트 소개
PLAYAUTO는 통합 재고 관리 시스템입니다.

## 기능
- 실시간 재고 관리
- 입출고 처리
- 발주 관리
- 통계 대시보드
- 일일 수불부

## 기술 스택
- Frontend: React + TypeScript + Vite
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL

## Claude GitHub Action
이 프로젝트는 Claude GitHub Action을 사용하여 자동 코드 리뷰를 수행합니다." > README.md

# 변경사항 커밋
git add README.md
git commit -m "docs: Add README with project description"

# 브랜치 푸시
git push -u origin test-claude-review
```

### 4단계: Pull Request 생성
```bash
# CLI로 PR 생성
gh pr create \
  --title "Test: Claude GitHub Action 코드 리뷰 테스트" \
  --body "## 변경사항
- README.md 파일 추가
- 프로젝트 설명 추가

## 테스트 목적
Claude GitHub Action이 정상적으로 작동하는지 테스트합니다.

@claude 이 PR을 리뷰해주세요." \
  --base main
```

## 🌐 웹 브라우저에서 PR 생성하기

GitHub CLI 대신 웹에서도 생성 가능합니다:

1. https://github.com/YOUR_USERNAME/PLAYAUTO 접속
2. "Pull requests" 탭 클릭
3. "New pull request" 버튼 클릭
4. base: main ← compare: test-claude-review 선택
5. "Create pull request" 클릭
6. 제목과 설명 입력 후 생성

## 💡 PR 생성 팁

### 좋은 PR 제목 예시
- `feat: 재고 알림 기능 추가`
- `fix: 발주서 계산 오류 수정`
- `refactor: API 서비스 레이어 분리`
- `docs: API 문서 업데이트`

### PR 설명에 포함할 내용
```markdown
## 변경사항
- 무엇을 변경했는지 명확히 기술

## 이유
- 왜 이 변경이 필요한지 설명

## 테스트
- 어떻게 테스트했는지 설명

## 스크린샷 (UI 변경시)
- 변경 전/후 스크린샷 첨부

## 체크리스트
- [ ] 코드 리뷰 요청
- [ ] 테스트 통과
- [ ] 문서 업데이트
```

## 🤖 Claude 리뷰 활성화

PR이 생성되면 자동으로 Claude가 리뷰를 시작합니다.
추가 리뷰가 필요하면 PR 코멘트에 `@claude`를 멘션하세요.

## ⚡ 빠른 명령어

```bash
# 현재 브랜치에서 바로 PR 생성
gh pr create

# PR 목록 보기
gh pr list

# PR 상태 확인
gh pr status

# PR 체크아웃
gh pr checkout <PR번호>

# PR 머지
gh pr merge <PR번호>
```

## 🔧 문제 해결

### "리포지토리를 찾을 수 없음" 오류
```bash
# 원격 저장소 확인
git remote -v

# 원격 저장소 추가 (필요시)
git remote add origin https://github.com/YOUR_USERNAME/PLAYAUTO.git
```

### "권한 없음" 오류
```bash
# GitHub 재인증
gh auth refresh
```

### "브랜치가 최신이 아님" 오류
```bash
# main 브랜치 최신화
git checkout main
git pull origin main
git checkout your-branch
git rebase main
```