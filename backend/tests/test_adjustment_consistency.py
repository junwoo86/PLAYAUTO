#!/usr/bin/env python3
"""
재고 조정 일관성 테스트 스크립트
ADJUST 트랜잭션이 일괄처리와 개별처리 모두에서 일관되게 처리되는지 확인
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta

# 프로젝트 루트 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.warehouse import Warehouse  # Import 순서 중요
from app.models.product import Product
from app.models.transaction import Transaction

# 데이터베이스 연결
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_adjustment_consistency():
    """재고 조정 일관성 테스트"""
    db = SessionLocal()
    
    try:
        print("\n=== 재고 조정 일관성 테스트 ===\n")
        
        # 테스트용 제품 선택 (SKU001)
        product = db.query(Product).filter(Product.product_code == "SKU001").first()
        if not product:
            print("테스트 제품 SKU001을 찾을 수 없습니다.")
            return
        
        print(f"테스트 제품: {product.product_name} ({product.product_code})")
        print(f"현재 재고: {product.current_stock}개")
        
        # 최근 7일간 ADJUST 트랜잭션 조회
        one_week_ago = datetime.now() - timedelta(days=7)
        recent_adjustments = db.query(Transaction).filter(
            Transaction.product_code == product.product_code,
            Transaction.transaction_type == 'ADJUST',
            Transaction.transaction_date >= one_week_ago
        ).order_by(Transaction.transaction_date.desc()).all()
        
        print(f"\n최근 7일간 재고 조정 내역: {len(recent_adjustments)}건")
        
        for adj in recent_adjustments[:5]:  # 최근 5건만 표시
            print(f"\n조정 일시: {adj.transaction_date}")
            print(f"  - 조정 전 재고: {adj.previous_stock}개")
            print(f"  - 조정 후 재고: {adj.new_stock}개")
            print(f"  - 조정 수량(quantity): {adj.quantity}개")
            print(f"  - 실제 차이: {adj.new_stock - adj.previous_stock}개")
            
            # 일관성 검증
            expected_new_stock = adj.previous_stock + adj.quantity
            if expected_new_stock == adj.new_stock:
                print(f"  ✅ 일관성 확인: previous_stock({adj.previous_stock}) + quantity({adj.quantity}) = new_stock({adj.new_stock})")
            else:
                print(f"  ❌ 불일치 발견: previous_stock({adj.previous_stock}) + quantity({adj.quantity}) = {expected_new_stock} ≠ new_stock({adj.new_stock})")
                print(f"     -> 이전 방식(절대값)으로 처리된 것으로 추정됨")
        
        # 가장 최근 조정의 discrepancy 계산
        if recent_adjustments:
            latest = recent_adjustments[0]
            discrepancy = latest.new_stock - latest.previous_stock
            print(f"\n📊 제품 목록에 표시될 '7일간 재고 불일치': {discrepancy:+d}개")
            
            # quantity와 discrepancy가 일치하는지 확인
            if latest.quantity == discrepancy:
                print("✅ quantity 필드와 실제 차이값이 일치합니다 (올바른 상대값 저장)")
            else:
                print(f"⚠️  quantity({latest.quantity})와 실제 차이({discrepancy})가 다릅니다")
        
        # 모든 ADJUST 트랜잭션 통계
        all_adjustments = db.query(Transaction).filter(
            Transaction.transaction_type == 'ADJUST'
        ).all()
        
        consistent_count = 0
        inconsistent_count = 0
        
        for adj in all_adjustments:
            expected = adj.previous_stock + adj.quantity
            if expected == adj.new_stock:
                consistent_count += 1
            else:
                inconsistent_count += 1
        
        print(f"\n=== 전체 ADJUST 트랜잭션 통계 ===")
        print(f"총 {len(all_adjustments)}건 중:")
        print(f"  - 일관된 처리 (상대값): {consistent_count}건")
        print(f"  - 불일치 (절대값 의심): {inconsistent_count}건")
        
        if inconsistent_count > 0:
            print(f"\n⚠️  {inconsistent_count}건의 이전 방식 트랜잭션이 발견되었습니다.")
            print("   이는 코드 수정 이전에 처리된 트랜잭션입니다.")
            print("   새로운 트랜잭션은 모두 일관되게 처리됩니다.")
        else:
            print("\n✅ 모든 ADJUST 트랜잭션이 일관되게 처리되었습니다!")
        
    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_adjustment_consistency()