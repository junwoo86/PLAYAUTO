#!/bin/bash

# GitHub Secrets 설정 스크립트
# 이 스크립트는 GitHub CLI를 사용하여 리포지토리 시크릿을 설정합니다

echo "🔧 GitHub Secrets 설정 스크립트"
echo "================================"

# GitHub CLI 설치 확인
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI가 설치되어 있지 않습니다."
    echo "📦 Homebrew를 사용하여 설치하시겠습니까? (y/n)"
    read -r install_gh
    if [ "$install_gh" = "y" ]; then
        echo "Installing GitHub CLI..."
        brew install gh
    else
        echo "GitHub CLI 설치가 필요합니다:"
        echo "https://cli.github.com/manual/installation"
        exit 1
    fi
fi

# GitHub 인증 상태 확인
echo "🔐 GitHub 인증 상태 확인..."
if ! gh auth status &> /dev/null; then
    echo "GitHub CLI 로그인이 필요합니다."
    gh auth login
fi

# 리포지토리 설정
echo ""
echo "📁 GitHub 리포지토리 설정"
echo "GitHub 사용자명을 입력하세요:"
read -r GITHUB_USER
echo "리포지토리 이름을 입력하세요 (기본값: PLAYAUTO):"
read -r REPO_NAME
REPO_NAME=${REPO_NAME:-PLAYAUTO}

REPO="$GITHUB_USER/$REPO_NAME"

# 리포지토리가 존재하는지 확인
if ! gh repo view "$REPO" &> /dev/null; then
    echo "❌ 리포지토리 $REPO를 찾을 수 없습니다."
    echo "새 리포지토리를 생성하시겠습니까? (y/n)"
    read -r create_repo
    if [ "$create_repo" = "y" ]; then
        echo "리포지토리를 public으로 생성하시겠습니까? (y: public, n: private)"
        read -r is_public
        if [ "$is_public" = "y" ]; then
            gh repo create "$REPO" --public --description "PLAYAUTO 재고 관리 시스템"
        else
            gh repo create "$REPO" --private --description "PLAYAUTO 재고 관리 시스템"
        fi
        
        # 원격 저장소 추가
        git remote add origin "https://github.com/$REPO.git"
        echo "✅ 리포지토리가 생성되었습니다: https://github.com/$REPO"
    else
        echo "리포지토리 생성이 취소되었습니다."
        exit 1
    fi
fi

# Secrets 설정
echo ""
echo "🔑 GitHub Secrets 설정"
echo "========================"

# Claude OAuth Token 설정 여부 확인
echo "Claude Code OAuth 토큰을 설정하시겠습니까? (Max 플랜 사용자) (y/n)"
read -r use_oauth
if [ "$use_oauth" = "y" ]; then
    echo ""
    echo "📝 Claude OAuth 토큰 생성 방법:"
    echo "1. 터미널에서 새 창을 열고 다음 명령 실행:"
    echo "   claude setup-token"
    echo "2. 브라우저가 열리면 로그인 후 토큰 복사"
    echo ""
    echo "생성한 OAuth 토큰을 입력하세요:"
    read -rs CLAUDE_TOKEN
    
    if [ -n "$CLAUDE_TOKEN" ]; then
        echo "$CLAUDE_TOKEN" | gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo="$REPO"
        echo "✅ CLAUDE_CODE_OAUTH_TOKEN이 설정되었습니다."
    fi
fi

# Anthropic API Key 설정 여부 확인
echo ""
echo "Anthropic API 키를 설정하시겠습니까? (y/n)"
read -r use_api_key
if [ "$use_api_key" = "y" ]; then
    echo "Anthropic API 키를 입력하세요 (sk-ant-로 시작):"
    read -rs API_KEY
    
    if [ -n "$API_KEY" ]; then
        echo "$API_KEY" | gh secret set ANTHROPIC_API_KEY --repo="$REPO"
        echo "✅ ANTHROPIC_API_KEY가 설정되었습니다."
    fi
fi

# Claude GitHub App 설치 안내
echo ""
echo "📱 Claude GitHub App 설치"
echo "========================="
echo "다음 링크에서 Claude GitHub App을 설치하세요:"
echo "https://github.com/apps/claude"
echo ""
echo "$REPO 리포지토리를 선택하여 권한을 부여하세요."
echo ""

# 설정 확인
echo "📋 설정 확인"
echo "============"
echo "리포지토리: https://github.com/$REPO"
echo "설정된 Secrets:"
gh secret list --repo="$REPO"

echo ""
echo "✅ 설정이 완료되었습니다!"
echo ""
echo "다음 단계:"
echo "1. 코드를 커밋하고 푸시:"
echo "   git add ."
echo "   git commit -m 'Initial commit with Claude GitHub Action'"
echo "   git push -u origin main"
echo ""
echo "2. Pull Request를 생성하면 Claude가 자동으로 코드 리뷰를 시작합니다."
echo "3. 이슈에 'claude-help' 라벨을 추가하면 Claude가 도움을 제공합니다."