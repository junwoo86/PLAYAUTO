#!/usr/bin/env python3
"""
영양제 목업 데이터 삽입 스크립트
"""
import os
import sys
from datetime import datetime, timedelta
from uuid import UUID
import random
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 프로젝트 경로 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

# 데이터베이스 연결 설정
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def insert_supplement_data():
    """영양제 목업 데이터 삽입"""
    with engine.connect() as conn:
        # 스키마 설정
        conn.execute(text("SET search_path TO playauto_platform, public"))
        
        # 기존 데이터 삭제
        conn.execute(text("TRUNCATE TABLE purchase_order_items, purchase_orders, daily_ledgers, transactions, products RESTART IDENTITY CASCADE"))
        
        # 영양제 제품 데이터 삽입
        products_sql = """
        INSERT INTO products (
            id, product_code, product_name, category, manufacturer, supplier,
            supplier_email, zone_id, unit, price, current_stock, safety_stock,
            moq, lead_time_days, is_auto_calculated, is_active
        ) VALUES
        -- 1. 비타민C 1000mg
        ('11111111-1111-1111-1111-111111111111'::uuid,
         'SUPP-VTC-1000', '비타민C 1000mg 180정', '비타민', '뉴트리코어', '헬스케어원',
         'supplier1@healthcare.com', 'A', '정', 29900, 2847, 500,
         2000, 7, false, true),
        
        -- 2. 오메가3 1000mg
        ('22222222-2222-2222-2222-222222222222'::uuid,
         'SUPP-OMG-1000', '오메가3 1000mg 90캡슐', '오메가3', '노르딕내추럴스', '바이오헬스',
         'supplier2@biohealth.com', 'A', '캡슐', 45000, 1523, 300,
         200, 7, false, true),
        
        -- 3. 종합비타민 멀티
        ('33333333-3333-3333-3333-333333333333'::uuid,
         'SUPP-MLT-COMP', '종합비타민 멀티 365정', '종합비타민', '센트룸', '한국화이자',
         'supplier3@pfizer.co.kr', 'A', '정', 35900, 3201, 600,
         3000, 10, false, true),
        
        -- 4. 프로바이오틱스 유산균
        ('44444444-4444-4444-4444-444444444444'::uuid,
         'SUPP-PRO-LACTO', '프로바이오틱스 100억 60캡슐', '유산균', '락토핏', '종근당건강',
         'supplier4@ckdhc.com', 'B', '캡슐', 28900, 892, 200,
         100, 5, false, true),
        
        -- 5. 칼슘 마그네슘 아연
        ('55555555-5555-5555-5555-555555555555'::uuid,
         'SUPP-CAL-MAG', '칼슘 마그네슘 아연 180정', '미네랄', '네이처메이드', '대상웰라이프',
         'supplier5@daesang.com', 'B', '정', 24900, 2156, 400,
         2000, 7, false, true),
        
        -- 6. 루테인 지아잔틴
        ('66666666-6666-6666-6666-666666666666'::uuid,
         'SUPP-LUT-EYE', '루테인 지아잔틴 20mg 90캡슐', '눈건강', '아이클리어', '뉴트리원',
         'supplier6@nutrione.co.kr', 'B', '캡슐', 39900, 673, 150,
         100, 5, false, true),
        
        -- 7. 밀크씨슬 실리마린
        ('77777777-7777-7777-7777-777777777777'::uuid,
         'SUPP-MLK-LIVER', '밀크씨슬 실리마린 500mg 120정', '간건강', '나우푸드', '헬스밸런스',
         'supplier7@healthbalance.com', 'B', '정', 32900, 1789, 350,
         200, 7, false, true)
        """
        conn.execute(text(products_sql))
        
        # 최근 거래 데이터 샘플 추가
        transactions = []
        products = [
            ('11111111-1111-1111-1111-111111111111', 2847),
            ('22222222-2222-2222-2222-222222222222', 1523),
            ('33333333-3333-3333-3333-333333333333', 3201),
            ('44444444-4444-4444-4444-444444444444', 892),
            ('55555555-5555-5555-5555-555555555555', 2156),
            ('66666666-6666-6666-6666-666666666666', 673),
            ('77777777-7777-7777-7777-777777777777', 1789)
        ]
        
        for product_id, current_stock in products:
            # 각 제품당 5개의 거래 생성
            for i in range(5):
                is_out = random.random() < 0.7  # 70% 확률로 출고
                if is_out:
                    quantity = random.randint(10, 60)
                    trans_type = 'OUT'
                    reason = random.choice(['판매', '쿠팡 주문', '스마트스토어 주문', '자사몰 주문'])
                else:
                    quantity = random.randint(100, 600)
                    trans_type = 'IN'
                    reason = '정기 발주'
                
                # 거래 날짜를 최근 30일 내로 설정
                days_ago = random.randint(0, 30)
                trans_date = datetime.now() - timedelta(days=days_ago)
                
                transaction_sql = f"""
                INSERT INTO transactions (
                    id, transaction_type, product_id, quantity, previous_stock, new_stock,
                    reason, memo, created_by, transaction_date
                ) VALUES (
                    gen_random_uuid(), '{trans_type}', '{product_id}'::uuid, {quantity},
                    {current_stock}, {current_stock + (quantity if trans_type == 'IN' else -quantity)},
                    '{reason}', '{reason}', 'system', '{trans_date.isoformat()}'::timestamp with time zone
                )
                """
                conn.execute(text(transaction_sql))
        
        # 커밋
        conn.commit()
        print("영양제 목업 데이터 삽입 완료!")

if __name__ == "__main__":
    insert_supplement_data()