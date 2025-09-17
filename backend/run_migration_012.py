#!/usr/bin/env python3
"""
Migration 012: Separate currency columns for purchase and sale prices
"""
import psycopg2
from psycopg2 import sql
import os
from datetime import datetime

# DB 연결 정보
DB_HOST = "15.164.112.237"
DB_PORT = 5432
DB_NAME = "dashboard"
DB_USER = "postgres"
DB_PASSWORD = "bico0211"
DB_SCHEMA = "playauto_platform"

def run_migration():
    conn = None
    cursor = None
    
    try:
        # DB 연결
        print(f"Connecting to database {DB_NAME} at {DB_HOST}:{DB_PORT}...")
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.autocommit = False
        cursor = conn.cursor()
        
        print(f"Connected successfully. Running migration 012...")
        
        # 현재 스키마 확인
        cursor.execute(f"SET search_path TO {DB_SCHEMA}")
        
        # 1. 기존 컬럼 존재 여부 확인
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = %s 
            AND table_name = 'products' 
            AND column_name IN ('currency', 'purchase_currency', 'sale_currency')
        """, (DB_SCHEMA,))
        
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # 2. currency 컬럼이 있고 purchase_currency가 없으면 이름 변경
        if 'currency' in existing_columns and 'purchase_currency' not in existing_columns:
            print("Renaming 'currency' column to 'purchase_currency'...")
            cursor.execute("""
                ALTER TABLE products
                RENAME COLUMN currency TO purchase_currency
            """)
            print("Column renamed successfully.")
        elif 'purchase_currency' in existing_columns:
            print("'purchase_currency' column already exists.")
        
        # 3. sale_currency 컬럼 추가 (없는 경우만)
        if 'sale_currency' not in existing_columns:
            print("Adding 'sale_currency' column...")
            cursor.execute("""
                ALTER TABLE products
                ADD COLUMN sale_currency VARCHAR(3) DEFAULT 'KRW' CHECK (sale_currency IN ('KRW', 'USD'))
            """)
            
            # NOT NULL 제약 조건 추가
            cursor.execute("""
                ALTER TABLE products
                ALTER COLUMN sale_currency SET NOT NULL
            """)
            print("'sale_currency' column added successfully.")
        else:
            print("'sale_currency' column already exists.")
        
        # 4. 코멘트 추가/업데이트
        print("Adding column comments...")
        cursor.execute("""
            COMMENT ON COLUMN products.purchase_currency IS '구매 통화 단위 (KRW: 원화, USD: 미국 달러)'
        """)
        cursor.execute("""
            COMMENT ON COLUMN products.sale_currency IS '판매 통화 단위 (KRW: 원화, USD: 미국 달러)'
        """)
        
        # 5. 인덱스 생성 (없는 경우만)
        print("Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_products_purchase_currency 
            ON products(purchase_currency)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_products_sale_currency 
            ON products(sale_currency)
        """)
        
        # 6. 기존 currency 인덱스 제거 (있는 경우)
        cursor.execute("""
            DROP INDEX IF EXISTS idx_products_currency
        """)
        
        # 7. 최종 스키마 확인
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = %s 
            AND table_name = 'products' 
            AND column_name IN ('purchase_currency', 'sale_currency', 'purchase_price', 'sale_price')
            ORDER BY ordinal_position
        """, (DB_SCHEMA,))
        
        print("\nFinal schema:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]}, nullable={row[2]}, default={row[3]}")
        
        # 커밋
        conn.commit()
        print("\n✅ Migration 012 completed successfully!")
        
        # 샘플 데이터 확인
        cursor.execute("""
            SELECT product_code, product_name, 
                   purchase_currency, purchase_price,
                   sale_currency, sale_price
            FROM products
            LIMIT 3
        """)
        
        print("\nSample data:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")
            print(f"    구매: {row[2]} {row[3]}")
            print(f"    판매: {row[4]} {row[5]}")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        if conn:
            conn.rollback()
            print("Transaction rolled back.")
        raise
    
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("\nDatabase connection closed.")

if __name__ == "__main__":
    run_migration()