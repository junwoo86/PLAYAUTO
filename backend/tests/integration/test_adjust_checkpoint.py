#!/usr/bin/env python3
"""
재고 조정(ADJUST) 시 체크포인트 생성 테스트
"""
import requests
import json
from datetime import datetime

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1"

def test_adjust_transaction():
    """재고 조정 트랜잭션 테스트"""

    print("=" * 60)
    print("재고 조정(ADJUST) 체크포인트 테스트")
    print("=" * 60)

    # 1. MED001 현재 재고 확인
    print("\n1️⃣ MED001 현재 재고 확인...")
    response = requests.get(f"{BASE_URL}/products")

    if response.status_code != 200:
        print(f"   ❌ API 오류: {response.status_code}")
        return

    data = response.json()

    # API 응답이 딕셔너리 형태인 경우 (페이지네이션 포함)
    if isinstance(data, dict) and 'items' in data:
        products = data['items']
    else:
        products = data

    med001 = next((p for p in products if p['product_code'] == 'MED001'), None)

    if med001:
        current_stock = med001['current_stock']
        print(f"   현재 재고: {current_stock}개")
    else:
        print("   ❌ MED001을 찾을 수 없습니다.")
        return

    # 2. 재고 조정 트랜잭션 생성
    print("\n2️⃣ 재고 조정 트랜잭션 생성...")
    adjust_data = {
        "transaction_type": "ADJUST",
        "product_code": "MED001",
        "quantity": 5,  # +5 조정
        "reason": "재고 실사 조정 (테스트)",
        "transaction_date": datetime.now().isoformat(),
        "created_by": "test_script"
    }

    try:
        response = requests.post(
            f"{BASE_URL}/transactions",
            json=adjust_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            transaction = response.json()
            print(f"   ✅ 조정 트랜잭션 생성 완료")
            print(f"   - 이전 재고: {transaction.get('previous_stock')}개")
            print(f"   - 새 재고: {transaction.get('new_stock')}개")
            print(f"   - affects_current_stock: {transaction.get('affects_current_stock')}")

            # 3. 체크포인트 생성 확인
            print("\n3️⃣ 체크포인트 생성 확인...")
            response = requests.get(
                f"{BASE_URL}/stock-checkpoints",
                params={"product_code": "MED001"}
            )

            if response.status_code == 200:
                checkpoints = response.json()
                # 가장 최근 체크포인트 확인
                if checkpoints:
                    latest = checkpoints[0]
                    if latest['checkpoint_type'] == 'ADJUST':
                        print(f"   ✅ ADJUST 체크포인트 생성 확인")
                        print(f"   - 체크포인트 날짜: {latest['checkpoint_date']}")
                        print(f"   - 확정 재고: {latest['confirmed_stock']}개")
                        print(f"   - 사유: {latest['reason']}")
                    else:
                        print(f"   ⚠️ 최근 체크포인트 타입: {latest['checkpoint_type']}")
                else:
                    print("   ❌ 체크포인트가 없습니다.")

            # 4. 이전 트랜잭션의 affects_current_stock 확인
            print("\n4️⃣ 이전 트랜잭션 무효화 확인...")
            response = requests.get(
                f"{BASE_URL}/transactions",
                params={"product_code": "MED001", "limit": 10}
            )

            if response.status_code == 200:
                transactions = response.json()
                invalid_count = sum(1 for t in transactions if not t.get('affects_current_stock', True))
                valid_count = sum(1 for t in transactions if t.get('affects_current_stock', True))

                print(f"   - 무효화된 트랜잭션: {invalid_count}개")
                print(f"   - 유효한 트랜잭션: {valid_count}개")

        else:
            print(f"   ❌ 오류: {response.status_code}")
            print(f"   응답: {response.text}")

    except Exception as e:
        print(f"   ❌ 요청 실패: {str(e)}")

    # 5. 최종 재고 확인
    print("\n5️⃣ 최종 재고 확인...")
    response = requests.get(f"{BASE_URL}/products")

    if response.status_code == 200:
        data = response.json()
        # API 응답이 딕셔너리 형태인 경우 (페이지네이션 포함)
        if isinstance(data, dict) and 'items' in data:
            products = data['items']
        else:
            products = data

        med001 = next((p for p in products if p['product_code'] == 'MED001'), None)

    if med001:
        final_stock = med001['current_stock']
        print(f"   최종 재고: {final_stock}개")
        print(f"   변화량: {final_stock - current_stock}개")

    print("\n" + "=" * 60)
    print("테스트 완료!")
    print("=" * 60)

if __name__ == "__main__":
    test_adjust_transaction()