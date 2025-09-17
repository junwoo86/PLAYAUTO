#!/usr/bin/env python3
"""
전체 스키마의 외래키 무결성을 검증하는 스크립트
"""

import psycopg2
from datetime import datetime

def verify_schema_integrity():
    """전체 스키마의 외래키 무결성 검증"""
    
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
    print("PLAYAUTO 스키마 외래키 무결성 검증")
    print(f"검증 시간: {datetime.now()}")
    print("=" * 80)
    
    # 1. 모든 외래키 제약조건 조회
    print("\n🔗 모든 외래키 제약조건:")
    all_fk_query = """
    SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'playauto_platform'
    ORDER BY tc.table_name, kcu.column_name;
    """
    
    cursor.execute(all_fk_query)
    fk_list = cursor.fetchall()
    
    error_count = 0
    for fk in fk_list:
        source_table, source_column, target_table, target_column, constraint_name = fk
        
        # 대상 컬럼이 실제로 존재하는지 확인
        check_target_query = f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'playauto_platform' 
        AND table_name = '{target_table}'
        AND column_name = '{target_column}';
        """
        
        cursor.execute(check_target_query)
        target_exists = cursor.fetchone()
        
        if target_exists:
            print(f"  ✅ {source_table}.{source_column} -> {target_table}.{target_column}")
        else:
            print(f"  ❌ {source_table}.{source_column} -> {target_table}.{target_column} (대상 컬럼 없음!)")
            error_count += 1
    
    # 2. 각 테이블의 Primary Key 확인
    print("\n🔑 각 테이블의 Primary Key:")
    pk_query = """
    SELECT 
        tc.table_name,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS primary_key_columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'playauto_platform'
    GROUP BY tc.table_name
    ORDER BY tc.table_name;
    """
    
    cursor.execute(pk_query)
    pk_list = cursor.fetchall()
    
    for table_name, pk_columns in pk_list:
        print(f"  {table_name:<30} PK: {pk_columns}")
    
    # 3. 데이터 무결성 검증 (외래키 위반 데이터 확인)
    print("\n📊 데이터 무결성 검증:")
    
    # transactions 테이블의 product_code 검증
    integrity_checks = [
        ("transactions", "product_code", "products", "product_code"),
        ("daily_ledgers", "product_code", "products", "product_code"),
        ("discrepancies", "product_code", "products", "product_code"),
        ("purchase_order_items", "product_code", "products", "product_code"),
    ]
    
    for source_table, source_col, target_table, target_col in integrity_checks:
        check_query = f"""
        SELECT COUNT(*) 
        FROM playauto_platform.{source_table} s
        LEFT JOIN playauto_platform.{target_table} t 
            ON s.{source_col} = t.{target_col}
        WHERE t.{target_col} IS NULL 
            AND s.{source_col} IS NOT NULL;
        """
        
        try:
            cursor.execute(check_query)
            orphan_count = cursor.fetchone()[0]
            
            if orphan_count == 0:
                print(f"  ✅ {source_table}.{source_col}: 모든 참조가 유효함")
            else:
                print(f"  ❌ {source_table}.{source_col}: {orphan_count}개의 고아 레코드 발견!")
                error_count += 1
        except Exception as e:
            print(f"  ⚠️ {source_table}.{source_col} 검증 실패: {e}")
    
    # 4. 결과 요약
    print("\n" + "=" * 80)
    if error_count == 0:
        print("✅ 스키마 무결성 검증 완료: 모든 외래키가 정상입니다!")
    else:
        print(f"❌ 스키마 무결성 검증 완료: {error_count}개의 문제가 발견되었습니다.")
    print("=" * 80)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    verify_schema_integrity()