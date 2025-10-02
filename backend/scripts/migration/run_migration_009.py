#!/usr/bin/env python3
import psycopg2
from psycopg2 import sql

# 데이터베이스 연결
conn = psycopg2.connect(
    host="15.164.112.237",
    port=5432,
    database="dashboard",
    user="postgres",
    password="bico0211"
)

cur = conn.cursor()

try:
    # 마이그레이션 실행
    with open('migrations/009_add_purchase_sale_price.sql', 'r') as f:
        migration_sql = f.read()
    
    cur.execute(migration_sql)
    conn.commit()
    print("✅ 마이그레이션 성공!")
    
    # 결과 확인
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns
        WHERE table_schema = 'playauto_platform' 
        AND table_name = 'products'
        AND column_name IN ('purchase_price', 'sale_price')
        ORDER BY column_name;
    """)
    
    print("\n추가된 컬럼:")
    for row in cur.fetchall():
        print(f"  - {row[0]}: {row[1]}")
    
except Exception as e:
    conn.rollback()
    print(f"❌ 마이그레이션 실패: {e}")
finally:
    cur.close()
    conn.close()