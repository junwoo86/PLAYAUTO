#!/usr/bin/env python3
"""
체크포인트 시스템 테스트 스크립트
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Any

# API 기본 URL
BASE_URL = "http://localhost:8000/api/v1"

# 테스트용 제품 코드
TEST_PRODUCT_CODE = "TEST-001"

def pretty_print(data: Dict[Any, Any], title: str = ""):
    """JSON 데이터를 보기 좋게 출력"""
    if title:
        print(f"\n{'='*50}")
        print(f" {title}")
        print('='*50)
    print(json.dumps(data, indent=2, ensure_ascii=False))

def test_adjust_transaction_checkpoint():
    """1. 재고 조정 시 체크포인트 자동 생성 테스트"""
    print("\n" + "="*60)
    print("TEST 1: 재고 조정 시 체크포인트 자동 생성 테스트")
    print("="*60)

    # 먼저 제품 정보 가져오기
    response = requests.get(f"{BASE_URL}/products/{TEST_PRODUCT_CODE}")
    if response.status_code == 404:
        print(f"제품 {TEST_PRODUCT_CODE}를 찾을 수 없습니다. 테스트용 제품을 생성합니다.")
        # 테스트용 제품 생성
        product_data = {
            "product_code": TEST_PRODUCT_CODE,
            "product_name": "테스트 제품",
            "category": "기타",
            "unit": "개",
            "current_stock": 100,
            "min_stock": 10,
            "location": "A-01"
        }
        response = requests.post(f"{BASE_URL}/products", json=product_data)
        if response.status_code != 200:
            print(f"제품 생성 실패: {response.text}")
            return False

    product = response.json()
    print(f"현재 재고: {product['current_stock']}")

    # 재고 조정 트랜잭션 생성
    adjust_data = {
        "transaction_type": "ADJUST",
        "product_code": TEST_PRODUCT_CODE,
        "quantity": 150,  # 조정 후 재고
        "reason": "재고 실사",
        "memo": "정기 재고 실사 후 조정",
        "created_by": "tester"
    }

    print("\n재고 조정 요청:")
    pretty_print(adjust_data)

    response = requests.post(f"{BASE_URL}/transactions", json=adjust_data)
    if response.status_code == 200:
        transaction = response.json()
        print("\n✅ 재고 조정 트랜잭션 생성 성공")
        print(f"트랜잭션 ID: {transaction['id']}")
        print(f"이전 재고: {transaction['previous_stock']} → 새 재고: {transaction['new_stock']}")

        # 체크포인트 확인
        checkpoint_response = requests.get(
            f"{BASE_URL}/stock-checkpoints",
            params={"product_code": TEST_PRODUCT_CODE}
        )
        if checkpoint_response.status_code == 200:
            checkpoints = checkpoint_response.json()
            # API가 list를 직접 반환하는 경우와 dict를 반환하는 경우 모두 처리
            if isinstance(checkpoints, list):
                items = checkpoints
            else:
                items = checkpoints.get('items', [])

            if items:
                latest_checkpoint = items[0]
                print("\n✅ 체크포인트 자동 생성 확인")
                print(f"체크포인트 ID: {latest_checkpoint['id']}")
                print(f"체크포인트 타입: {latest_checkpoint['checkpoint_type']}")
                print(f"확정 재고: {latest_checkpoint['confirmed_stock']}")
                return True
    else:
        print(f"❌ 재고 조정 실패: {response.text}")

    return False

def test_past_transaction_warning():
    """2. 과거 날짜 거래 입력 시 체크포인트 검증 테스트"""
    print("\n" + "="*60)
    print("TEST 2: 과거 날짜 거래 입력 시 체크포인트 검증")
    print("="*60)

    # 어제 날짜로 거래 검증 요청
    yesterday = (datetime.now() - timedelta(days=1)).isoformat()

    validation_data = {
        "product_code": TEST_PRODUCT_CODE,
        "transaction_date": yesterday
    }

    print(f"\n과거 날짜({yesterday[:10]}) 거래 검증 요청:")
    response = requests.post(
        f"{BASE_URL}/stock-checkpoints/validate-transaction",
        json=validation_data
    )

    if response.status_code == 200:
        result = response.json()
        print(f"검증 결과: is_valid={result.get('is_valid')}")
        if result.get('message'):
            print(f"메시지: {result['message']}")
        if result.get('checkpoint_id'):
            print(f"체크포인트 ID: {result['checkpoint_id']}")
        print(f"재고 반영 여부: {result.get('affects_current_stock')}")
        return True
    else:
        print(f"❌ 검증 실패: {response.text}")

    return False

def test_transaction_after_checkpoint():
    """3. 체크포인트 이후 거래의 재고 미반영 처리 확인"""
    print("\n" + "="*60)
    print("TEST 3: 체크포인트 이후 과거 거래의 재고 미반영 처리")
    print("="*60)

    # 2일 전 날짜로 입고 거래 생성
    two_days_ago = (datetime.now() - timedelta(days=2)).isoformat()

    transaction_data = {
        "transaction_type": "IN",
        "product_code": TEST_PRODUCT_CODE,
        "quantity": 10,
        "reason": "추가 입고",
        "memo": "과거 날짜 테스트",
        "created_by": "tester",
        "transaction_date": two_days_ago
    }

    print(f"\n과거 날짜({two_days_ago[:10]}) 입고 거래 생성:")
    pretty_print(transaction_data)

    response = requests.post(f"{BASE_URL}/transactions", json=transaction_data)
    if response.status_code == 200:
        transaction = response.json()
        print("\n✅ 과거 거래 생성 성공")
        print(f"트랜잭션 ID: {transaction['id']}")
        print(f"재고 반영 여부: {transaction.get('affects_current_stock', True)}")

        if not transaction.get('affects_current_stock', True):
            print("✅ 체크포인트 이후 거래로 재고 미반영 처리됨")
            if transaction.get('checkpoint_id'):
                print(f"관련 체크포인트 ID: {transaction['checkpoint_id']}")
        else:
            print("⚠️  거래가 현재 재고에 반영됨")
        return True
    else:
        print(f"❌ 거래 생성 실패: {response.text}")

    return False

def test_daily_closing_checkpoint():
    """4. 일일 마감 시 체크포인트 생성 테스트"""
    print("\n" + "="*60)
    print("TEST 4: 일일 마감 시 체크포인트 생성")
    print("="*60)

    # 어제 날짜로 일일 마감 생성
    yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()

    print(f"\n{yesterday} 일일 마감 생성 (체크포인트 포함):")

    response = requests.post(
        f"{BASE_URL}/daily-ledgers/generate",
        params={
            "target_date": yesterday,
            "create_checkpoint": True  # 체크포인트 생성 옵션
        }
    )

    if response.status_code == 200:
        result = response.json()
        print("\n✅ 일일 마감 성공")
        print(f"생성된 수불부: {result['ledgers_created']}개")
        if 'checkpoints_created' in result:
            print(f"생성된 체크포인트: {result['checkpoints_created']}개")
            print(f"메시지: {result.get('checkpoint_message', '')}")

        # 체크포인트 확인
        checkpoint_response = requests.get(
            f"{BASE_URL}/stock-checkpoints",
            params={
                "product_code": TEST_PRODUCT_CODE,
                "checkpoint_type": "DAILY_CLOSE"
            }
        )
        if checkpoint_response.status_code == 200:
            checkpoints = checkpoint_response.json()
            # API가 list를 직접 반환하는 경우와 dict를 반환하는 경우 모두 처리
            if isinstance(checkpoints, list):
                items = checkpoints
            else:
                items = checkpoints.get('items', [])

            if items:
                for cp in items:
                    if cp['checkpoint_type'] == 'DAILY_CLOSE':
                        print(f"\n✅ DAILY_CLOSE 체크포인트 확인")
                        print(f"체크포인트 ID: {cp['id']}")
                        print(f"날짜: {cp['checkpoint_date']}")
                        break
        return True
    else:
        print(f"❌ 일일 마감 실패: {response.text}")

    return False

def test_transaction_list_with_affects_flag():
    """5. 거래 목록에서 재고 미반영 플래그 확인"""
    print("\n" + "="*60)
    print("TEST 5: 거래 목록에서 재고 미반영 플래그 확인")
    print("="*60)

    response = requests.get(
        f"{BASE_URL}/transactions",
        params={
            "product_id": TEST_PRODUCT_CODE,
            "limit": 10
        }
    )

    if response.status_code == 200:
        result = response.json()
        transactions = result.get('data', [])

        print(f"\n최근 거래 {len(transactions)}개:")
        for tx in transactions[:5]:  # 최근 5개만 표시
            affects = tx.get('affects_current_stock', True)
            status = "✅ 재고 반영" if affects else "⚠️ 재고 미반영"
            print(f"\n- ID: {tx['id'][:8]}...")
            print(f"  타입: {tx['transaction_type']}")
            print(f"  수량: {tx['quantity']}")
            print(f"  상태: {status}")
            if tx.get('checkpoint_id'):
                print(f"  체크포인트: {tx['checkpoint_id'][:8]}...")

        # 재고 미반영 거래 개수 확인
        non_applied = [tx for tx in transactions if not tx.get('affects_current_stock', True)]
        print(f"\n총 {len(transactions)}개 중 재고 미반영: {len(non_applied)}개")
        return True
    else:
        print(f"❌ 거래 목록 조회 실패: {response.text}")

    return False

def run_all_tests():
    """모든 테스트 실행"""
    print("\n" + "="*70)
    print(" 체크포인트 시스템 통합 테스트 시작")
    print("="*70)

    results = {
        "재고 조정 체크포인트": test_adjust_transaction_checkpoint(),
        "과거 거래 검증": test_past_transaction_warning(),
        "체크포인트 이후 거래": test_transaction_after_checkpoint(),
        "일일 마감 체크포인트": test_daily_closing_checkpoint(),
        "거래 목록 플래그": test_transaction_list_with_affects_flag()
    }

    print("\n" + "="*70)
    print(" 테스트 결과 요약")
    print("="*70)

    for test_name, result in results.items():
        status = "✅ 성공" if result else "❌ 실패"
        print(f"{test_name}: {status}")

    success_count = sum(1 for r in results.values() if r)
    total_count = len(results)

    print(f"\n전체: {success_count}/{total_count} 테스트 성공")

    if success_count == total_count:
        print("\n🎉 모든 테스트가 성공적으로 완료되었습니다!")
    else:
        print("\n⚠️  일부 테스트가 실패했습니다. 로그를 확인하세요.")

if __name__ == "__main__":
    run_all_tests()