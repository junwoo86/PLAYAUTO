#!/usr/bin/env python3
"""
새로운 재고 조정 트랜잭션 테스트
수정된 코드가 올바르게 작동하는지 확인
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import requests
import json

# API 베이스 URL
BASE_URL = "http://localhost:8000/api/v1"

def test_individual_adjustment():
    """개별 재고 조정 테스트"""
    print("\n=== 개별 재고 조정 테스트 ===\n")
    
    # 1. 현재 재고 확인
    response = requests.get(f"{BASE_URL}/products/SKU002")
    if response.status_code != 200:
        print(f"제품 조회 실패: {response.text}")
        return
    
    product = response.json()
    print(f"제품: {product['product_name']} ({product['product_code']})")
    print(f"현재 재고: {product['current_stock']}개")
    
    # 2. 재고 조정 (10개 증가)
    adjustment_data = {
        "transaction_type": "ADJUST",
        "product_code": "SKU002",
        "quantity": 10,  # 상대값: +10개
        "reason": "테스트 조정",
        "memo": "일관성 테스트를 위한 재고 조정 (+10개)",
        "location": "본사 창고",
        "created_by": "테스트 스크립트"
    }
    
    print(f"\n조정 요청: +10개 (상대값)")
    response = requests.post(f"{BASE_URL}/transactions/", json=adjustment_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 조정 성공!")
        print(f"  - 조정 전: {result['previous_stock']}개")
        print(f"  - 조정 후: {result['new_stock']}개")
        print(f"  - 실제 변화: {result['new_stock'] - result['previous_stock']}개")
        
        # 일관성 확인
        if result['new_stock'] == result['previous_stock'] + 10:
            print(f"  ✅ 일관성 확인: {result['previous_stock']} + 10 = {result['new_stock']}")
        else:
            print(f"  ❌ 불일치: {result['previous_stock']} + 10 ≠ {result['new_stock']}")
    else:
        print(f"❌ 조정 실패: {response.text}")

def test_batch_adjustment():
    """배치 재고 조정 테스트"""
    print("\n=== 배치 재고 조정 테스트 ===\n")
    
    # 배치 데이터 준비
    batch_data = {
        "transactions": [
            {
                "product_code": "SKU003",
                "product_name": "테스트 제품",
                "transaction_type": "ADJUST",
                "quantity": -15,  # 상대값: -15개
                "date": datetime.now().isoformat(),
                "reason": "배치 테스트",
                "memo": "배치 일관성 테스트 (-15개)"
            },
            {
                "product_code": "SKU004",
                "product_name": "테스트 제품2",
                "transaction_type": "ADJUST",
                "quantity": 20,  # 상대값: +20개
                "date": datetime.now().isoformat(),
                "reason": "배치 테스트",
                "memo": "배치 일관성 테스트 (+20개)"
            }
        ]
    }
    
    print("배치 조정 요청:")
    print("  - SKU003: -15개 (상대값)")
    print("  - SKU004: +20개 (상대값)")
    
    response = requests.post(f"{BASE_URL}/batch/process", json=batch_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ 배치 처리 완료!")
        print(f"  - 성공: {result['success']}건")
        print(f"  - 실패: {result['failed']}건")
        
        if result['errors']:
            print(f"  - 오류: {result['errors']}")
        
        # 결과 확인
        for code in ["SKU003", "SKU004"]:
            response = requests.get(f"{BASE_URL}/products/{code}")
            if response.status_code == 200:
                product = response.json()
                print(f"\n{code} 최종 재고: {product['current_stock']}개")
    else:
        print(f"❌ 배치 처리 실패: {response.text}")

def verify_consistency():
    """7일간 재고 불일치 표시 확인"""
    print("\n=== 7일간 재고 불일치 확인 ===\n")
    
    response = requests.get(f"{BASE_URL}/products/")
    if response.status_code == 200:
        products = response.json()['data']
        
        for product in products[:5]:  # 상위 5개만
            if product.get('has_pending_discrepancy'):
                print(f"{product['product_code']}: {product['discrepancy']:+d}개 불일치")
    else:
        print(f"제품 목록 조회 실패: {response.text}")

if __name__ == "__main__":
    print("=" * 50)
    print("재고 조정 일관성 테스트 - 새로운 트랜잭션")
    print("=" * 50)
    
    test_individual_adjustment()
    test_batch_adjustment()
    verify_consistency()
    
    print("\n" + "=" * 50)
    print("테스트 완료!")
    print("=" * 50)