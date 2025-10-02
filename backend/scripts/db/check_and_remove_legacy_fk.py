#!/usr/bin/env python3
"""
transactions 테이블의 레거시 product_id FK 확인 및 제거 스크립트
"""

import psycopg2
from datetime import datetime

def check_and_remove_legacy_fk():
    """transactions 테이블의 레거시 product_id FK를 확인하고 제거합니다."""
    
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
    print("Transactions 테이블 레거시 FK 정리")
    print(f"실행 시간: {datetime.now()}")
    print("=" * 60)
    
    try:
        # 1. transactions 테이블의 컬럼 확인
        print("\n1. transactions 테이블 컬럼 확인:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_schema = 'playauto_platform'
            AND table_name = 'transactions'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        has_product_id = False
        
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (NULL: {col[2]})")
            if col[0] == 'product_id':
                has_product_id = True
        
        if not has_product_id:
            print("\n✅ product_id 컬럼이 없습니다. 이미 제거되었거나 존재하지 않습니다.")
            return
        
        # 2. product_id 컬럼 사용 여부 확인
        print("\n2. product_id 컬럼 사용 여부 확인:")
        cursor.execute("""
            SELECT COUNT(*) as total,
                   COUNT(product_id) as with_product_id,
                   COUNT(*) - COUNT(product_id) as null_product_id
            FROM playauto_platform.transactions
        """)
        
        result = cursor.fetchone()
        total, with_product_id, null_product_id = result
        
        print(f"  - 전체 레코드: {total}")
        print(f"  - product_id가 있는 레코드: {with_product_id}")
        print(f"  - product_id가 NULL인 레코드: {null_product_id}")
        
        if with_product_id > 0:
            print(f"\n⚠️ 경고: {with_product_id}개의 레코드가 product_id를 사용하고 있습니다.")
            print("  데이터 손실을 방지하기 위해 먼저 데이터를 백업하거나 마이그레이션이 필요합니다.")
            
            # product_id가 있는 레코드 샘플 확인
            cursor.execute("""
                SELECT id, product_id, product_code
                FROM playauto_platform.transactions
                WHERE product_id IS NOT NULL
                LIMIT 5
            """)
            
            samples = cursor.fetchall()
            if samples:
                print("\n  샘플 데이터:")
                for sample in samples:
                    print(f"    - ID: {sample[0]}, product_id: {sample[1]}, product_code: {sample[2]}")
        
        # 3. Foreign Key 제약 조건 확인
        print("\n3. Foreign Key 제약 조건 확인:")
        cursor.execute("""
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'playauto_platform.transactions'::regclass
            AND contype = 'f'
            AND conname LIKE '%product_id%'
        """)
        
        fk_constraints = cursor.fetchall()
        
        if fk_constraints:
            print(f"  발견된 FK 제약 조건: {len(fk_constraints)}개")
            for fk in fk_constraints:
                print(f"    - {fk[0]}")
        else:
            print("  product_id 관련 FK 제약 조건이 없습니다.")
        
        # 4. 사용자 확인
        if with_product_id == 0:
            print("\n" + "=" * 60)
            print("안전하게 product_id 컬럼을 제거할 수 있습니다.")
            
            response = input("\nproduct_id 컬럼을 제거하시겠습니까? (yes/no): ")
            
            if response.lower() == 'yes':
                # FK 제약 조건 제거
                for fk in fk_constraints:
                    print(f"\nFK 제약 조건 제거 중: {fk[0]}")
                    cursor.execute(f"""
                        ALTER TABLE playauto_platform.transactions
                        DROP CONSTRAINT IF EXISTS {fk[0]}
                    """)
                    print(f"  ✅ {fk[0]} 제거 완료")
                
                # product_id 컬럼 제거
                print("\nproduct_id 컬럼 제거 중...")
                cursor.execute("""
                    ALTER TABLE playauto_platform.transactions
                    DROP COLUMN IF EXISTS product_id
                """)
                
                conn.commit()
                print("✅ product_id 컬럼이 성공적으로 제거되었습니다.")
                
                # 최종 확인
                print("\n최종 테이블 구조 확인:")
                cursor.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'playauto_platform'
                    AND table_name = 'transactions'
                    ORDER BY ordinal_position
                """)
                
                columns = cursor.fetchall()
                for col in columns:
                    print(f"  - {col[0]}")
            else:
                print("\n작업이 취소되었습니다.")
        else:
            print("\n" + "=" * 60)
            print("⚠️ product_id 컬럼에 데이터가 있어 자동 제거할 수 없습니다.")
            print("수동으로 데이터를 확인하고 마이그레이션을 수행해주세요.")
    
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("\n작업이 완료되었습니다.")


if __name__ == "__main__":
    check_and_remove_legacy_fk()