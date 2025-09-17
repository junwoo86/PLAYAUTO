#!/usr/bin/env python3
"""
transactions 테이블의 제약조건과 컬럼 구조를 확인하는 스크립트
"""

import psycopg2
from datetime import datetime

def check_transactions_constraints():
    """transactions 테이블의 제약조건 확인"""
    
    # 데이터베이스 연결
    conn = psycopg2.connect(
        host="15.164.112.237",
        port=5432,
        user="postgres", 
        password="bico0211",
        database="dashboard"
    )
    cursor = conn.cursor()
    
    print("=" * 80)
    print("transactions 테이블 제약조건 및 구조 분석")
    print(f"분석 시간: {datetime.now()}")
    print("=" * 80)
    
    # 1. 컬럼 구조 확인
    print("\n📋 테이블 컬럼 구조:")
    columns_query = """
    SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
    FROM information_schema.columns 
    WHERE table_schema = 'playauto_platform' 
    AND table_name = 'transactions'
    ORDER BY ordinal_position;
    """
    
    cursor.execute(columns_query)
    columns = cursor.fetchall()
    for col in columns:
        column_name, data_type, is_nullable, column_default = col
        nullable = "NULL" if is_nullable == 'YES' else "NOT NULL"
        default = f" DEFAULT {column_default}" if column_default else ""
        print(f"  {column_name:<25} {data_type:<20} {nullable}{default}")
    
    # 2. 모든 제약조건 확인
    print("\n🔑 모든 제약조건:")
    constraints_query = """
    SELECT 
        con.conname AS constraint_name,
        con.contype AS constraint_type,
        CASE 
            WHEN con.contype = 'p' THEN 'PRIMARY KEY'
            WHEN con.contype = 'f' THEN 'FOREIGN KEY'
            WHEN con.contype = 'c' THEN 'CHECK'
            WHEN con.contype = 'u' THEN 'UNIQUE'
            ELSE con.contype
        END AS constraint_type_desc,
        col.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    LEFT JOIN pg_attribute col ON col.attrelid = con.conrelid 
        AND col.attnum = ANY(con.conkey)
    WHERE nsp.nspname = 'playauto_platform' 
    AND rel.relname = 'transactions'
    ORDER BY con.conname;
    """
    
    cursor.execute(constraints_query)
    constraints = cursor.fetchall()
    for constraint in constraints:
        print(f"  {constraint[0]:<40} {constraint[2]:<15} ({constraint[3]})")
    
    # 3. 외래키 상세 정보
    print("\n🔗 외래키 상세 정보:")
    fk_detail_query = """
    SELECT
        tc.constraint_name,
        kcu.column_name AS local_column,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'playauto_platform'
    AND tc.table_name = 'transactions'
    ORDER BY tc.constraint_name;
    """
    
    cursor.execute(fk_detail_query)
    fk_details = cursor.fetchall()
    for fk in fk_details:
        constraint_name, local_column, foreign_table, foreign_column = fk
        print(f"  {constraint_name}:")
        print(f"    {local_column} -> {foreign_table}.{foreign_column}")
    
    # 4. product_id 컬럼 존재 여부 확인
    print("\n📊 product_id 컬럼 분석:")
    product_id_query = """
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'playauto_platform' 
    AND table_name = 'transactions'
    AND column_name = 'product_id';
    """
    
    cursor.execute(product_id_query)
    product_id_exists = cursor.fetchone()
    
    if product_id_exists:
        print("  ❌ product_id 컬럼이 존재합니다 (삭제 필요)")
        
        # product_id 사용 여부 확인
        usage_query = """
        SELECT COUNT(*) 
        FROM playauto_platform.transactions 
        WHERE product_id IS NOT NULL;
        """
        cursor.execute(usage_query)
        usage_count = cursor.fetchone()[0]
        print(f"  📈 product_id 사용 현황: {usage_count}개 레코드에서 사용 중")
    else:
        print("  ✅ product_id 컬럼이 없습니다 (정상)")
    
    # 5. products 테이블의 id 컬럼 존재 여부 확인
    print("\n📊 products 테이블 id 컬럼 확인:")
    products_id_query = """
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'playauto_platform' 
    AND table_name = 'products'
    AND column_name = 'id';
    """
    
    cursor.execute(products_id_query)
    products_id_exists = cursor.fetchone()
    
    if products_id_exists:
        print("  ⚠️ products 테이블에 id 컬럼이 존재합니다")
    else:
        print("  ✅ products 테이블에 id 컬럼이 없습니다 (product_code가 PK)")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 80)
    print("분석 완료!")
    print("=" * 80)

if __name__ == "__main__":
    check_transactions_constraints()