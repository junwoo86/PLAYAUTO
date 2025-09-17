#!/usr/bin/env python3
"""
시간대 처리 테스트
UTC 시간대로 올바르게 저장되는지 확인
"""

import os
import sys
import requests
import json
from datetime import datetime, timezone

# API 베이스 URL
BASE_URL = "http://localhost:8000/api/v1"

def test_individual_adjustment():
    """개별 재고 조정 시간대 테스트"""
    print("\n=== 개별 재고 조정 시간대 테스트 ===\n")
    
    # 현재 UTC 시간
    now_utc = datetime.now(timezone.utc)
    print(f"현재 UTC 시간: {now_utc.isoformat()}")
    print(f"현재 로컬 시간: {datetime.now().isoformat()}")
    
    # 재고 조정 요청
    adjustment_data = {
        "transaction_type": "ADJUST",
        "product_code": "SKU001",
        "quantity": 5,
        "reason": "시간대 테스트",
        "memo": f"UTC 시간대 테스트 - {now_utc.isoformat()}",
        "location": "본사 창고",
        "created_by": "시간대 테스트"
    }
    
    print(f"\n조정 요청 전송...")
    response = requests.post(f"{BASE_URL}/transactions/", json=adjustment_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 조정 성공!")
        print(f"  - 트랜잭션 ID: {result.get('id')}")
        print(f"  - 트랜잭션 시간: {result.get('transaction_date')}")
        
        # 시간 파싱
        trans_time = datetime.fromisoformat(result.get('transaction_date').replace('Z', '+00:00'))
        time_diff = (trans_time - now_utc).total_seconds()
        
        print(f"\n시간 차이 분석:")
        print(f"  - 요청 시간(UTC): {now_utc.isoformat()}")
        print(f"  - 저장된 시간: {trans_time.isoformat()}")
        print(f"  - 시간 차이: {time_diff}초")
        
        if abs(time_diff) < 60:  # 1분 이내 차이
            print(f"  ✅ 시간대 처리 정상!")
        else:
            print(f"  ❌ 시간대 오류 감지! ({time_diff/3600:.1f}시간 차이)")
            
        return result.get('id')
    else:
        print(f"❌ 조정 실패: {response.text}")
        return None

def test_batch_adjustment():
    """배치 재고 조정 시간대 테스트"""
    print("\n=== 배치 재고 조정 시간대 테스트 ===\n")
    
    # 현재 UTC 시간
    now_utc = datetime.now(timezone.utc)
    print(f"현재 UTC 시간: {now_utc.isoformat()}")
    
    # 배치 데이터
    batch_data = {
        "transactions": [
            {
                "product_code": "SKU002",
                "product_name": "테스트 제품",
                "transaction_type": "ADJUST",
                "quantity": -5,
                "date": now_utc.isoformat(),
                "reason": "배치 시간대 테스트",
                "memo": f"배치 UTC 테스트 - {now_utc.isoformat()}"
            }
        ]
    }
    
    print(f"\n배치 처리 요청 전송...")
    response = requests.post(f"{BASE_URL}/batch/process", json=batch_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 배치 처리 완료!")
        print(f"  - 성공: {result['success']}건")
        print(f"  - 실패: {result['failed']}건")
        
        # 잠시 대기 후 트랜잭션 조회하여 시간 확인
        import time
        time.sleep(1)
        trans_response = requests.get(
            f"{BASE_URL}/transactions/",
            params={"product_code": "SKU002", "limit": 1, "transaction_type": "ADJUST"}
        )
        
        if trans_response.status_code == 200:
            transactions = trans_response.json().get('data', [])
            if transactions:
                latest_trans = transactions[0]
                trans_time = datetime.fromisoformat(
                    latest_trans.get('transaction_date').replace('Z', '+00:00')
                )
                time_diff = (trans_time - now_utc).total_seconds()
                
                print(f"\n시간 차이 분석:")
                print(f"  - 요청 시간(UTC): {now_utc.isoformat()}")
                print(f"  - 저장된 시간: {trans_time.isoformat()}")
                print(f"  - 시간 차이: {time_diff}초")
                
                if abs(time_diff) < 60:  # 1분 이내 차이
                    print(f"  ✅ 배치 시간대 처리 정상!")
                else:
                    print(f"  ❌ 시간대 오류 감지! ({time_diff/3600:.1f}시간 차이)")
    else:
        print(f"❌ 배치 처리 실패: {response.text}")

def check_transaction_history(trans_id):
    """트랜잭션 히스토리 확인"""
    if not trans_id:
        return
        
    print("\n=== 트랜잭션 히스토리 확인 ===\n")
    
    # 최근 트랜잭션 조회
    response = requests.get(f"{BASE_URL}/transactions/", params={"limit": 5})
    
    if response.status_code == 200:
        transactions = response.json().get('data', [])
        
        print("최근 5개 트랜잭션:")
        for trans in transactions[:5]:
            trans_time = datetime.fromisoformat(
                trans.get('transaction_date').replace('Z', '+00:00')
            )
            print(f"  - {trans.get('product_code')}: {trans_time.isoformat()} "
                  f"({trans.get('transaction_type')}, {trans.get('quantity'):+d}개)")

if __name__ == "__main__":
    print("=" * 50)
    print("시간대 처리 테스트")
    print("=" * 50)
    
    trans_id = test_individual_adjustment()
    test_batch_adjustment()
    check_transaction_history(trans_id)
    
    print("\n" + "=" * 50)
    print("테스트 완료!")
    print("=" * 50)