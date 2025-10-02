#!/usr/bin/env python3
"""
일일 수불부 재생성 스크립트
체크포인트 시스템으로 인한 잘못된 계산 수정
"""
import requests
from datetime import date, timedelta

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1"

def regenerate_daily_ledger(target_date: str):
    """특정 날짜의 일일 수불부 재생성"""
    url = f"{BASE_URL}/daily-ledgers/generate"
    params = {
        "target_date": target_date,
        "create_checkpoint": False  # 체크포인트는 생성하지 않음
    }

    try:
        response = requests.post(url, params=params)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {target_date}: {result['message']}")
            print(f"   생성된 수불부: {result['ledgers_created']}개")
            return True
        else:
            print(f"❌ {target_date}: 오류 발생 - {response.status_code}")
            print(f"   응답: {response.text}")
            return False
    except Exception as e:
        print(f"❌ {target_date}: 요청 실패 - {str(e)}")
        return False

def main():
    print("=" * 60)
    print("일일 수불부 재생성 시작")
    print("=" * 60)

    # 재생성할 날짜 범위 (9/18 ~ 9/23)
    start_date = date(2025, 9, 18)
    end_date = date(2025, 9, 23)

    current_date = start_date
    success_count = 0
    fail_count = 0

    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        print(f"\n📅 처리 중: {date_str}")

        if regenerate_daily_ledger(date_str):
            success_count += 1
        else:
            fail_count += 1

        current_date += timedelta(days=1)

    print("\n" + "=" * 60)
    print("재생성 완료!")
    print(f"✅ 성공: {success_count}일")
    print(f"❌ 실패: {fail_count}일")
    print("=" * 60)

if __name__ == "__main__":
    main()