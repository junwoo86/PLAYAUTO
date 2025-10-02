#!/usr/bin/env python3
"""
이메일 알림 테스트 스크립트
"""
import requests
import json
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000/api/v1"

def login():
    """로그인하여 토큰 획득"""
    url = f"{BASE_URL}/auth/login"
    data = {
        "email": "admin@biocom.kr",
        "password": "admin"
    }

    logger.info("로그인 시도 중...")
    response = requests.post(url, json=data)

    if response.status_code == 200:
        result = response.json()
        token = result.get("access_token")
        logger.info("✅ 로그인 성공!")
        logger.info(f"사용자: {result.get('user', {}).get('email')}")
        logger.info(f"그룹: {result.get('user', {}).get('group', {}).get('name')}")
        return token
    else:
        logger.error(f"❌ 로그인 실패: {response.status_code}")
        logger.error(response.text)
        return None

def test_notification(token):
    """알림 테스트 API 호출"""
    url = f"{BASE_URL}/notifications/test"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "group_id": 1,  # 시스템 관리자 그룹
        "notification_type": "low_stock_alert"
    }

    logger.info("\n알림 테스트 API 호출 중...")
    logger.info(f"요청 데이터: {json.dumps(data, indent=2)}")

    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        result = response.json()
        logger.info("✅ 알림 테스트 API 호출 성공!")
        logger.info(f"응답: {json.dumps(result, indent=2, ensure_ascii=False)}")
        return True
    else:
        logger.error(f"❌ 알림 테스트 API 호출 실패: {response.status_code}")
        logger.error(response.text)
        return False

def main():
    """메인 함수"""
    logger.info("=" * 60)
    logger.info("이메일 알림 테스트 시작")
    logger.info("=" * 60)

    # 1. 로그인
    token = login()
    if not token:
        logger.error("로그인 실패로 테스트 중단")
        return

    # 2. 알림 테스트
    success = test_notification(token)

    if success:
        logger.info("\n" + "=" * 60)
        logger.info("✅ 테스트 완료!")
        logger.info("이메일이 ai@biocom.kr로 발송되었는지 확인하세요.")
        logger.info("=" * 60)
    else:
        logger.error("\n" + "=" * 60)
        logger.error("❌ 테스트 실패!")
        logger.error("서버 로그를 확인하세요.")
        logger.error("=" * 60)

if __name__ == "__main__":
    main()