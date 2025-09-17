#!/usr/bin/env python3
"""
재고 불일치(discrepancies) 해결 스크립트
미해결 상태의 불일치를 자동으로 처리합니다.
"""

import psycopg2
from datetime import datetime
import uuid

def resolve_discrepancies():
    """미해결 재고 불일치를 처리합니다."""
    
    # 데이터베이스 연결
    conn = psycopg2.connect(
        host="15.164.112.237",
        port=5432,
        user="postgres",
        password="bico0211",
        database="dashboard"
    )
    cursor = conn.cursor()
    
    print("=" * 60)
    print("재고 불일치 해결 스크립트")
    print(f"실행 시간: {datetime.now()}")
    print("=" * 60)
    
    # 미해결 discrepancies 조회
    cursor.execute("""
        SELECT id, product_code, system_stock, physical_stock, discrepancy
        FROM playauto_platform.discrepancies
        WHERE status = 'pending'
        ORDER BY created_at
    """)
    
    pending_discrepancies = cursor.fetchall()
    
    if not pending_discrepancies:
        print("미해결 재고 불일치가 없습니다.")
        return
    
    print(f"\n발견된 미해결 불일치: {len(pending_discrepancies)}건")
    
    for disc in pending_discrepancies:
        disc_id, product_code, system_stock, physical_stock, discrepancy = disc
        print(f"\n처리 중: {product_code}")
        print(f"  시스템 재고: {system_stock}")
        print(f"  실사 재고: {physical_stock}")
        print(f"  차이: {discrepancy}")
        
        # 현재 제품의 재고 조회
        cursor.execute("""
            SELECT current_stock 
            FROM playauto_platform.products 
            WHERE product_code = %s
        """, (product_code,))
        
        current_stock_result = cursor.fetchone()
        if not current_stock_result:
            print(f"  ❌ 제품 {product_code}를 찾을 수 없습니다.")
            continue
            
        current_stock = current_stock_result[0]
        
        # 조정이 필요한 수량 계산
        adjustment_quantity = physical_stock - current_stock
        
        if adjustment_quantity != 0:
            # 재고 조정 트랜잭션 생성
            transaction_id = str(uuid.uuid4())
            transaction_type = 'ADJUST'
            
            cursor.execute("""
                INSERT INTO playauto_platform.transactions (
                    id, transaction_type, product_code, quantity,
                    previous_stock, new_stock, reason, memo,
                    created_by, transaction_date, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                transaction_id,
                transaction_type,
                product_code,
                abs(adjustment_quantity),
                current_stock,
                physical_stock,
                '재고 실사 조정',
                f'시스템: {system_stock} → 실사: {physical_stock} (차이: {discrepancy})',
                'System - 자동 조정',
                datetime.now(),
                datetime.now(),
                datetime.now()
            ))
            
            # 제품 재고 업데이트
            cursor.execute("""
                UPDATE playauto_platform.products
                SET current_stock = %s, updated_at = %s
                WHERE product_code = %s
            """, (physical_stock, datetime.now(), product_code))
            
            print(f"  ✅ 재고 조정 완료: {current_stock} → {physical_stock}")
        
        # discrepancy 상태를 resolved로 변경
        cursor.execute("""
            UPDATE playauto_platform.discrepancies
            SET status = 'resolved', 
                resolved_at = %s,
                resolved_by = 'System - 자동 해결',
                explanation = %s,
                updated_at = %s
            WHERE id = %s
        """, (
            datetime.now(),
            f'자동 재고 조정 수행 (조정량: {adjustment_quantity})',
            datetime.now(),
            disc_id
        ))
        
        print(f"  ✅ 불일치 상태 해결 완료")
    
    # 변경사항 커밋
    conn.commit()
    print(f"\n총 {len(pending_discrepancies)}건의 불일치를 해결했습니다.")
    
    # 해결 후 현재 상태 확인
    print("\n" + "=" * 60)
    print("해결 후 제품 재고 상태:")
    print("=" * 60)
    
    for disc in pending_discrepancies:
        product_code = disc[1]
        cursor.execute("""
            SELECT product_name, current_stock 
            FROM playauto_platform.products 
            WHERE product_code = %s
        """, (product_code,))
        
        result = cursor.fetchone()
        if result:
            product_name, current_stock = result
            print(f"{product_code}: {product_name} - 현재 재고: {current_stock}")
    
    cursor.close()
    conn.close()
    
    print("\n✅ 모든 작업이 완료되었습니다.")


if __name__ == "__main__":
    resolve_discrepancies()