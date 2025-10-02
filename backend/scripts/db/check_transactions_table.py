#!/usr/bin/env python3

import psycopg2
import sys
from contextlib import closing

def check_transactions_table():
    """현재 transactions 테이블 구조 확인"""
    
    # 데이터베이스 연결 설정
    db_config = {
        'host': '15.164.112.237',
        'port': 5432,
        'database': 'dashboard',
        'user': 'postgres',
        'password': 'bico0211'
    }
    
    try:
        with closing(psycopg2.connect(**db_config)) as conn:
            with closing(conn.cursor()) as cur:
                
                print("=== TRANSACTIONS 테이블 구조 ===")
                cur.execute("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_schema = 'playauto_platform' 
                    AND table_name = 'transactions'
                    ORDER BY ordinal_position;
                """)
                
                columns = cur.fetchall()
                for col in columns:
                    print(f"{col[0]} | {col[1]} | NULL: {col[2]} | Default: {col[3]}")
                
                print("\n=== TRANSACTIONS 테이블 샘플 데이터 (처음 3개) ===")
                cur.execute("""
                    SELECT id, product_code, transaction_type, quantity
                    FROM playauto_platform.transactions 
                    LIMIT 3;
                """)
                
                rows = cur.fetchall()
                for row in rows:
                    print(f"ID: {row[0]}, Product Code: {row[1]}, Type: {row[2]}, Qty: {row[3]}")
                
                print("\n=== PRODUCTS 테이블 샘플 데이터 확인 ===")
                cur.execute("""
                    SELECT product_code, product_name
                    FROM playauto_platform.products 
                    LIMIT 3;
                """)
                
                products = cur.fetchall()
                for prod in products:
                    print(f"Product Code: {prod[0]}, Name: {prod[1]}")
                
                print("\n=== 매핑 불일치 확인 ===")
                cur.execute("""
                    SELECT COUNT(*) as unmapped_count
                    FROM playauto_platform.transactions t
                    LEFT JOIN playauto_platform.products p ON t.product_code = p.product_code
                    WHERE p.product_code IS NULL;
                """)
                
                unmapped = cur.fetchone()[0]
                print(f"매핑되지 않은 거래: {unmapped}개")
                
    except Exception as e:
        print(f"오류 발생: {e}")
        sys.exit(1)

if __name__ == "__main__":
    check_transactions_table()