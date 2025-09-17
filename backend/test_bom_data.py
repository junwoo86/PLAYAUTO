#!/usr/bin/env python3
"""
BOM 테스트 데이터 생성 스크립트
세트 상품과 구성품 관계를 생성합니다
"""
import psycopg2
import uuid
from datetime import datetime

def create_test_bom_data():
    """테스트 BOM 데이터 생성"""

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
    print("BOM 테스트 데이터 생성")
    print("=" * 60)

    # 1. 세트 상품 생성 (없으면)
    set_products = [
        {
            'product_code': 'SET001',
            'product_name': '종합 비타민 세트',
            'category': '세트상품',
            'manufacturer': 'BIOCOM',
            'supplier': 'BIOCOM',
            'unit': '세트',
            'current_stock': 0,
            'safety_stock': 10,
            'purchase_price': 50000,
            'sale_price': 75000
        },
        {
            'product_code': 'SET002',
            'product_name': '건강 관리 기기 세트',
            'category': '세트상품',
            'manufacturer': 'BIOCOM',
            'supplier': 'BIOCOM',
            'unit': '세트',
            'current_stock': 0,
            'safety_stock': 5,
            'purchase_price': 80000,
            'sale_price': 120000
        }
    ]

    # 세트 상품 생성
    for product in set_products:
        cursor.execute("""
            INSERT INTO playauto_platform.products (
                product_code, product_name, category, manufacturer, supplier,
                unit, current_stock, safety_stock, purchase_price, sale_price,
                purchase_currency, sale_currency, is_active, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'KRW', 'KRW', true, %s, %s)
            ON CONFLICT (product_code) DO UPDATE SET
                product_name = EXCLUDED.product_name,
                category = EXCLUDED.category,
                updated_at = EXCLUDED.updated_at
        """, (
            product['product_code'],
            product['product_name'],
            product['category'],
            product['manufacturer'],
            product['supplier'],
            product['unit'],
            product['current_stock'],
            product['safety_stock'],
            product['purchase_price'],
            product['sale_price'],
            datetime.now(),
            datetime.now()
        ))

    print("✅ 세트 상품 생성 완료")

    # 2. BOM 구성 생성
    bom_configs = [
        # SET001: 종합 비타민 세트 (비타민C 2개 + 칼슘 1개)
        {
            'parent': 'SET001',
            'components': [
                ('SKU002', 2),  # 비타민C 2개
                ('SKU005', 1),  # 칼슘 1개
            ]
        },
        # SET002: 건강 관리 기기 세트 (체온계 1개 + 혈압계 1개)
        {
            'parent': 'SET002',
            'components': [
                ('MED002', 1),  # 체온계 1개
                ('MED001', 1),  # 혈압계 1개
            ]
        }
    ]

    # BOM 데이터 생성
    bom_count = 0
    for config in bom_configs:
        for child_code, quantity in config['components']:
            # 이미 존재하는지 확인
            cursor.execute("""
                SELECT id FROM playauto_platform.product_bom
                WHERE parent_product_code = %s AND child_product_code = %s
            """, (config['parent'], child_code))

            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO playauto_platform.product_bom (
                        id, parent_product_code, child_product_code, quantity,
                        created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    str(uuid.uuid4()),
                    config['parent'],
                    child_code,
                    quantity,
                    datetime.now(),
                    datetime.now()
                ))
                bom_count += 1

    print(f"✅ BOM 구성 생성 완료: {bom_count}건")

    # 3. 세트 상품 재고 계산 (참고용)
    print("\n📊 세트 상품 생산 가능 수량:")

    for config in bom_configs:
        cursor.execute("""
            SELECT
                p.product_code,
                p.product_name,
                MIN(FLOOR(c.current_stock / b.quantity)) as possible_sets
            FROM playauto_platform.product_bom b
            JOIN playauto_platform.products c ON b.child_product_code = c.product_code
            JOIN playauto_platform.products p ON b.parent_product_code = p.product_code
            WHERE b.parent_product_code = %s
            GROUP BY p.product_code, p.product_name
        """, (config['parent'],))

        result = cursor.fetchone()
        if result:
            print(f"  - {result[1]} ({result[0]}): {result[2]}세트 생산 가능")

    # 커밋
    conn.commit()

    print("\n" + "=" * 60)
    print("✅ BOM 테스트 데이터 생성 완료!")
    print("=" * 60)

    cursor.close()
    conn.close()

if __name__ == "__main__":
    try:
        create_test_bom_data()
    except Exception as e:
        print(f"❌ 오류 발생: {e}")