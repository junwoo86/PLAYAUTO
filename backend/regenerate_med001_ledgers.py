#!/usr/bin/env python3
"""
MED001 일일 수불부 재생성 스크립트
잘못된 체크포인트 및 계산 수정
"""
import requests
from datetime import date, timedelta

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1"

def regenerate_daily_ledger_for_product(target_date: str, product_code: str):
    """특정 제품의 특정 날짜 일일 수불부 재생성"""
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
    print("MED001 일일 수불부 재생성 시작")
    print("=" * 60)

    # MED001의 문제가 발생한 날짜 범위 (9/11 ~ 9/23)
    # 9/12에 잘못된 ADJUST 트랜잭션이 있었으므로 9/11부터 재생성
    start_date = date(2025, 9, 11)
    end_date = date(2025, 9, 23)

    current_date = start_date
    success_count = 0
    fail_count = 0

    print(f"\n📋 대상 제품: MED001")
    print(f"📅 재생성 기간: {start_date} ~ {end_date}")
    print("-" * 60)

    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        print(f"\n📅 처리 중: {date_str}")

        # 모든 제품의 수불부를 재생성 (특정 제품만 재생성하는 API가 없으므로)
        if regenerate_daily_ledger_for_product(date_str, "MED001"):
            success_count += 1
        else:
            fail_count += 1

        current_date += timedelta(days=1)

    print("\n" + "=" * 60)
    print("재생성 완료!")
    print(f"✅ 성공: {success_count}일")
    print(f"❌ 실패: {fail_count}일")
    print("=" * 60)

    # 재생성 후 MED001 현재 상태 확인
    print("\n📊 MED001 현재 상태 확인 중...")
    try:
        # 최근 수불부 조회
        response = requests.get(f"{BASE_URL}/daily-ledgers",
                               params={"product_code": "MED001", "ledger_date": "2025-09-23"})
        if response.status_code == 200:
            ledgers = response.json()
            if ledgers:
                latest = ledgers[0]
                print(f"\n✅ 9/23 기말 재고: {latest.get('ending_stock', 'N/A')}개")
            else:
                print("\n⚠️ 9/23 수불부가 없습니다.")

        # 현재 재고 조회
        response = requests.get(f"{BASE_URL}/products")
        if response.status_code == 200:
            products = response.json()
            med001 = next((p for p in products if p['product_code'] == 'MED001'), None)
            if med001:
                print(f"✅ 현재 재고: {med001['current_stock']}개")
    except Exception as e:
        print(f"❌ 상태 확인 실패: {str(e)}")

if __name__ == "__main__":
    main()