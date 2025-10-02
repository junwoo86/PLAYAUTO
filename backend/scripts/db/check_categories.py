import psycopg2
from app.core.config import settings

# DB 연결
conn = psycopg2.connect(settings.DATABASE_URL)
cur = conn.cursor()

# 카테고리 조회
cur.execute("SELECT DISTINCT category FROM playauto_platform.products ORDER BY category;")
categories = cur.fetchall()

print("=== 제품 카테고리 목록 ===")
for cat in categories:
    print(f"- {cat[0]}")

# 각 카테고리별 제품 수
cur.execute("""
    SELECT category, COUNT(*) 
    FROM playauto_platform.products 
    GROUP BY category 
    ORDER BY category;
""")
category_counts = cur.fetchall()

print("\n=== 카테고리별 제품 수 ===")
for cat, count in category_counts:
    print(f"- {cat}: {count}개")

# 최근 출고 거래 확인
cur.execute("""
    SELECT t.transaction_type, t.product_code, p.product_name, p.category, t.quantity, t.transaction_date
    FROM playauto_platform.transactions t
    JOIN playauto_platform.products p ON t.product_code = p.product_code
    WHERE t.transaction_type = 'OUT'
    ORDER BY t.transaction_date DESC
    LIMIT 10;
""")
transactions = cur.fetchall()

print("\n=== 최근 출고 거래 10건 ===")
for trans in transactions:
    print(f"- {trans[3]} | {trans[2]} | {trans[4]}개 | {trans[5]}")

cur.close()
conn.close()