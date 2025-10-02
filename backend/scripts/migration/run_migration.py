#!/usr/bin/env python3
"""
데이터베이스 마이그레이션 실행 스크립트
"""

import psycopg2
from datetime import datetime
import sys

def run_migration():
    """마이그레이션 실행"""
    
    # 데이터베이스 연결
    try:
        conn = psycopg2.connect(
            host="15.164.112.237",
            port=5432,
            user="postgres", 
            password="bico0211",
            database="dashboard"
        )
        conn.autocommit = True  # 각 명령을 즉시 커밋
        cursor = conn.cursor()
        
        print("=" * 80)
        print("PLAYAUTO 데이터베이스 마이그레이션 실행")
        print(f"실행 시간: {datetime.now()}")
        print("=" * 80)
        
        # 마이그레이션 파일 읽기
        with open('migrations/008_product_code_primary_key.sql', 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # SQL 실행
        print("🚀 마이그레이션 실행 중...")
        cursor.execute(migration_sql)
        
        print("✅ 마이그레이션이 성공적으로 완료되었습니다!")
        
        # 결과 검증
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
        
        # products 테이블 구조 확인
        cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'playauto_platform' 
        AND table_name = 'products'
        ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("\n🏗️ products 테이블 새 구조:")
        for col_name, data_type, nullable in columns:
            nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
            print(f"  - {col_name:<25} {data_type:<20} {nullable_str}")
        
        # PK 확인
        cursor.execute("""
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'playauto_platform.products'::regclass
        AND i.indisprimary;
        """)
        
        pk_result = cursor.fetchone()
        if pk_result:
            print(f"\n🔑 products 테이블 Primary Key: {pk_result[0]}")
        
        cursor.close()
        conn.close()
        
        print("\n" + "=" * 80)
        print("🎉 마이그레이션 완료!")
        print("product_code 기반 구조로 성공적으로 변환되었습니다.")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()