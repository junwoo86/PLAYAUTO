#!/usr/bin/env python3
import psycopg2

# 데이터베이스 연결
conn = psycopg2.connect(
    host="15.164.112.237",
    port=5432,
    database="dashboard",
    user="postgres",
    password="bico0211"
)

cur = conn.cursor()

# products 테이블 컬럼 정보 조회
cur.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'playauto_platform' 
    AND table_name = 'products'
    ORDER BY ordinal_position;
""")

print("Products 테이블 컬럼 정보:")
print("-" * 80)
for row in cur.fetchall():
    print(f"{row[0]:<20} | {row[1]:<20} | Nullable: {row[2]:<5} | Default: {row[3]}")

cur.close()
conn.close()