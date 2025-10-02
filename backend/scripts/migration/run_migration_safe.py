#!/usr/bin/env python3
"""
데이터베이스 마이그레이션 실행 스크립트 (안전 버전)
단계별로 실행하여 문제 발생 시 추적 가능
"""

import psycopg2
from datetime import datetime
import sys

def run_migration():
    """단계별 마이그레이션 실행"""
    
    # 데이터베이스 연결
    try:
        conn = psycopg2.connect(
            host="15.164.112.237",
            port=5432,
            user="postgres", 
            password="bico0211",
            database="dashboard"
        )
        cursor = conn.cursor()
        
        print("=" * 80)
        print("PLAYAUTO 데이터베이스 마이그레이션 실행 (단계별)")
        print(f"실행 시간: {datetime.now()}")
        print("=" * 80)
        
        # Step 1: 데이터 무결성 사전 검증
        print("\n🔍 Step 1: 데이터 무결성 사전 검증")
        
        # product_code 중복 확인
        cursor.execute("""
        SELECT COUNT(*) - COUNT(DISTINCT product_code) as duplicates
        FROM playauto_platform.products;
        """)
        duplicates = cursor.fetchone()[0]
        if duplicates > 0:
            raise Exception(f"중복된 product_code가 {duplicates}개 있습니다.")
        print("✓ product_code 중복 검사 통과")
        
        # NULL/빈 product_code 확인
        cursor.execute("""
        SELECT COUNT(*) FROM playauto_platform.products 
        WHERE product_code IS NULL OR product_code = '';
        """)
        null_codes = cursor.fetchone()[0]
        if null_codes > 0:
            raise Exception(f"NULL 또는 빈 product_code가 {null_codes}개 있습니다.")
        print("✓ product_code NULL 검사 통과")
        
        # 고아 레코드 확인
        cursor.execute("""
        SELECT COUNT(*) FROM playauto_platform.transactions t
        LEFT JOIN playauto_platform.products p ON t.product_id = p.id
        WHERE p.id IS NULL;
        """)
        orphan_transactions = cursor.fetchone()[0]
        if orphan_transactions > 0:
            raise Exception(f"고아 transactions가 {orphan_transactions}개 있습니다.")
        print("✓ transactions 무결성 검사 통과")
        
        print("✅ 데이터 무결성 검증 완료")
        
        # Step 2: FK 제약조건 제거
        print("\n🔧 Step 2: 기존 FK 제약조건 제거")
        
        fk_constraints = [
            "ALTER TABLE playauto_platform.transactions DROP CONSTRAINT IF EXISTS transactions_product_id_fkey;",
            "ALTER TABLE playauto_platform.discrepancies DROP CONSTRAINT IF EXISTS discrepancies_product_id_fkey;",
            "ALTER TABLE playauto_platform.daily_ledgers DROP CONSTRAINT IF EXISTS daily_ledgers_product_id_fkey;",
            "ALTER TABLE playauto_platform.purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey;",
            "ALTER TABLE playauto_platform.product_bom DROP CONSTRAINT IF EXISTS product_bom_parent_product_id_fkey;",
            "ALTER TABLE playauto_platform.product_bom DROP CONSTRAINT IF EXISTS product_bom_child_product_id_fkey;"
        ]
        
        for constraint_sql in fk_constraints:
            cursor.execute(constraint_sql)
        
        conn.commit()
        print("✅ FK 제약조건 제거 완료")
        
        # Step 3: product_code 컬럼 추가 및 데이터 매핑
        print("\n📊 Step 3: product_code 컬럼 추가 및 데이터 매핑")
        
        # transactions 테이블
        cursor.execute("ALTER TABLE playauto_platform.transactions ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);")
        cursor.execute("""
        UPDATE playauto_platform.transactions 
        SET product_code = (
            SELECT p.product_code 
            FROM playauto_platform.products p 
            WHERE p.id = transactions.product_id
        )
        WHERE product_code IS NULL;
        """)
        print("✓ transactions 테이블 product_code 매핑 완료")
        
        # discrepancies 테이블
        cursor.execute("ALTER TABLE playauto_platform.discrepancies ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);")
        cursor.execute("""
        UPDATE playauto_platform.discrepancies 
        SET product_code = (
            SELECT p.product_code 
            FROM playauto_platform.products p 
            WHERE p.id = discrepancies.product_id
        )
        WHERE product_code IS NULL;
        """)
        print("✓ discrepancies 테이블 product_code 매핑 완료")
        
        # daily_ledgers 테이블
        cursor.execute("ALTER TABLE playauto_platform.daily_ledgers ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);")
        cursor.execute("""
        UPDATE playauto_platform.daily_ledgers 
        SET product_code = (
            SELECT p.product_code 
            FROM playauto_platform.products p 
            WHERE p.id = daily_ledgers.product_id
        )
        WHERE product_code IS NULL;
        """)
        print("✓ daily_ledgers 테이블 product_code 매핑 완료")
        
        # purchase_order_items 테이블
        cursor.execute("ALTER TABLE playauto_platform.purchase_order_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);")
        cursor.execute("""
        UPDATE playauto_platform.purchase_order_items 
        SET product_code = COALESCE(
            product_code,
            (SELECT p.product_code FROM playauto_platform.products p WHERE p.id = purchase_order_items.product_id)
        )
        WHERE product_code IS NULL OR product_code = '';
        """)
        print("✓ purchase_order_items 테이블 product_code 매핑 완료")
        
        # product_bom 테이블
        cursor.execute("ALTER TABLE playauto_platform.product_bom ADD COLUMN IF NOT EXISTS parent_product_code VARCHAR(50);")
        cursor.execute("ALTER TABLE playauto_platform.product_bom ADD COLUMN IF NOT EXISTS child_product_code VARCHAR(50);")
        
        cursor.execute("""
        UPDATE playauto_platform.product_bom 
        SET parent_product_code = (
            SELECT p.product_code 
            FROM playauto_platform.products p 
            WHERE p.id = product_bom.parent_product_id
        )
        WHERE parent_product_code IS NULL;
        """)
        
        cursor.execute("""
        UPDATE playauto_platform.product_bom 
        SET child_product_code = (
            SELECT p.product_code 
            FROM playauto_platform.products p 
            WHERE p.id = product_bom.child_product_id
        )
        WHERE child_product_code IS NULL;
        """)
        print("✓ product_bom 테이블 product_code 매핑 완료")
        
        conn.commit()
        print("✅ 데이터 매핑 완료")
        
        # Step 4: products 테이블 PK 변경
        print("\n🔑 Step 4: products 테이블 PK 변경")
        
        cursor.execute("ALTER TABLE playauto_platform.products DROP CONSTRAINT IF EXISTS products_pkey;")
        cursor.execute("ALTER TABLE playauto_platform.products ADD CONSTRAINT products_pkey PRIMARY KEY (product_code);")
        cursor.execute("ALTER TABLE playauto_platform.products DROP COLUMN IF EXISTS id;")
        
        conn.commit()
        print("✅ products 테이블 PK 변경 완료")
        
        # Step 5: 새로운 FK 제약조건 추가
        print("\n🔗 Step 5: 새로운 FK 제약조건 추가")
        
        # transactions 테이블
        cursor.execute("ALTER TABLE playauto_platform.transactions ALTER COLUMN product_code SET NOT NULL;")
        cursor.execute("""
        ALTER TABLE playauto_platform.transactions 
        ADD CONSTRAINT transactions_product_code_fkey 
        FOREIGN KEY (product_code) REFERENCES playauto_platform.products(product_code) ON DELETE CASCADE;
        """)
        cursor.execute("ALTER TABLE playauto_platform.transactions DROP COLUMN IF EXISTS product_id;")
        print("✓ transactions FK 설정 완료")
        
        # discrepancies 테이블
        cursor.execute("ALTER TABLE playauto_platform.discrepancies ALTER COLUMN product_code SET NOT NULL;")
        cursor.execute("""
        ALTER TABLE playauto_platform.discrepancies 
        ADD CONSTRAINT discrepancies_product_code_fkey 
        FOREIGN KEY (product_code) REFERENCES playauto_platform.products(product_code) ON DELETE CASCADE;
        """)
        cursor.execute("ALTER TABLE playauto_platform.discrepancies DROP COLUMN IF EXISTS product_id;")
        print("✓ discrepancies FK 설정 완료")
        
        # daily_ledgers 테이블
        cursor.execute("ALTER TABLE playauto_platform.daily_ledgers ALTER COLUMN product_code SET NOT NULL;")
        cursor.execute("""
        ALTER TABLE playauto_platform.daily_ledgers 
        ADD CONSTRAINT daily_ledgers_product_code_fkey 
        FOREIGN KEY (product_code) REFERENCES playauto_platform.products(product_code) ON DELETE CASCADE;
        """)
        cursor.execute("ALTER TABLE playauto_platform.daily_ledgers DROP COLUMN IF EXISTS product_id;")
        
        # unique 제약조건 업데이트
        cursor.execute("ALTER TABLE playauto_platform.daily_ledgers DROP CONSTRAINT IF EXISTS uq_ledger_date_product;")
        cursor.execute("""
        ALTER TABLE playauto_platform.daily_ledgers 
        ADD CONSTRAINT uq_ledger_date_product_code UNIQUE (ledger_date, product_code);
        """)
        print("✓ daily_ledgers FK 설정 완료")
        
        # purchase_order_items 테이블
        cursor.execute("ALTER TABLE playauto_platform.purchase_order_items ALTER COLUMN product_code SET NOT NULL;")
        cursor.execute("""
        ALTER TABLE playauto_platform.purchase_order_items 
        ADD CONSTRAINT purchase_order_items_product_code_fkey 
        FOREIGN KEY (product_code) REFERENCES playauto_platform.products(product_code) ON DELETE CASCADE;
        """)
        cursor.execute("ALTER TABLE playauto_platform.purchase_order_items DROP COLUMN IF EXISTS product_id;")
        print("✓ purchase_order_items FK 설정 완료")
        
        # product_bom 테이블
        cursor.execute("ALTER TABLE playauto_platform.product_bom ALTER COLUMN parent_product_code SET NOT NULL;")
        cursor.execute("ALTER TABLE playauto_platform.product_bom ALTER COLUMN child_product_code SET NOT NULL;")
        cursor.execute("""
        ALTER TABLE playauto_platform.product_bom 
        ADD CONSTRAINT product_bom_parent_product_code_fkey 
        FOREIGN KEY (parent_product_code) REFERENCES playauto_platform.products(product_code) ON DELETE CASCADE;
        """)
        cursor.execute("""
        ALTER TABLE playauto_platform.product_bom 
        ADD CONSTRAINT product_bom_child_product_code_fkey 
        FOREIGN KEY (child_product_code) REFERENCES playauto_platform.products(product_code) ON DELETE CASCADE;
        """)
        cursor.execute("ALTER TABLE playauto_platform.product_bom DROP COLUMN IF EXISTS parent_product_id;")
        cursor.execute("ALTER TABLE playauto_platform.product_bom DROP COLUMN IF EXISTS child_product_id;")
        
        # unique 제약조건 추가
        cursor.execute("ALTER TABLE playauto_platform.product_bom DROP CONSTRAINT IF EXISTS product_bom_parent_product_id_child_product_id_key;")
        cursor.execute("""
        ALTER TABLE playauto_platform.product_bom 
        ADD CONSTRAINT product_bom_parent_child_code_key UNIQUE (parent_product_code, child_product_code);
        """)
        print("✓ product_bom FK 설정 완료")
        
        conn.commit()
        print("✅ 새로운 FK 제약조건 추가 완료")
        
        # Step 6: 인덱스 추가
        print("\n📈 Step 6: 성능 최적화 인덱스 추가")
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_transactions_product_code ON playauto_platform.transactions(product_code);",
            "CREATE INDEX IF NOT EXISTS idx_discrepancies_product_code ON playauto_platform.discrepancies(product_code);",
            "CREATE INDEX IF NOT EXISTS idx_daily_ledgers_product_code ON playauto_platform.daily_ledgers(product_code);",
            "CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_code ON playauto_platform.purchase_order_items(product_code);",
            "CREATE INDEX IF NOT EXISTS idx_products_category ON playauto_platform.products(category);",
            "CREATE INDEX IF NOT EXISTS idx_products_is_active ON playauto_platform.products(is_active);"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        conn.commit()
        print("✅ 인덱스 추가 완료")
        
        # Step 7: 최종 검증
        print("\n✅ Step 7: 최종 데이터 무결성 검증")
        
        # 모든 테이블의 레코드 수 확인
        cursor.execute("""
        SELECT 
            'products' as table_name,
            COUNT(*) as record_count
        FROM playauto_platform.products
        UNION ALL
        SELECT 
            'transactions' as table_name,
            COUNT(*) as record_count
        FROM playauto_platform.transactions
        UNION ALL
        SELECT 
            'daily_ledgers' as table_name,
            COUNT(*) as record_count
        FROM playauto_platform.daily_ledgers;
        """)
        
        results = cursor.fetchall()
        print("\n📊 마이그레이션 후 테이블 현황:")
        for table_name, count in results:
            print(f"  - {table_name}: {count}개")
        
        # FK 무결성 검증
        cursor.execute("""
        SELECT COUNT(*) FROM playauto_platform.transactions t
        LEFT JOIN playauto_platform.products p ON t.product_code = p.product_code
        WHERE p.product_code IS NULL;
        """)
        invalid_fk = cursor.fetchone()[0]
        if invalid_fk > 0:
            raise Exception(f"유효하지 않은 FK 참조가 {invalid_fk}개 있습니다.")
        
        print("✓ FK 무결성 검증 통과")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("🎉 마이그레이션 완료!")
        print("✅ product_code 기반 구조로 성공적으로 변환되었습니다.")
        print("✅ '알 수 없는 제품' 문제가 해결되었을 것으로 예상됩니다.")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()