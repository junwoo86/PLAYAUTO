-- 기존 데이터 삭제
SET search_path TO playauto_platform, public;

TRUNCATE TABLE purchase_order_items, purchase_orders, daily_ledgers, transactions, products RESTART IDENTITY CASCADE;

-- 영양제 제품 데이터 삽입
INSERT INTO products (
    id, product_code, product_name, barcode, category, brand, manufacturer, supplier,
    supplier_contact, supplier_email, location, price, purchase_price, current_stock,
    min_stock, max_stock, safety_stock, moq, memo, unit, zone_id, lead_time_days,
    is_auto_calculated, is_active, created_at, updated_at
) VALUES
-- 1. 비타민C 1000mg
('11111111-1111-1111-1111-111111111111'::uuid,
 'SUPP-VTC-1000', '비타민C 1000mg 180정', '8809454321001',
 '비타민', '뉴트리코어', '뉴트리코어', '헬스케어원',
 '02-555-1234', 'supplier1@healthcare.com', 'A-1-01', 29900, 15000, 2847,
 500, 5000, 500, 2000, '인기 상품, 매일 50-100개 판매', '정', 'A', 7,
 false, true, '2024-01-01', '2024-01-01'),

-- 2. 오메가3 1000mg
('22222222-2222-2222-2222-222222222222'::uuid,
 'SUPP-OMG-1000', '오메가3 1000mg 90캡슐', '8809454321002',
 '오메가3', '노르딕내추럴스', '노르딕내추럴스', '바이오헬스',
 '02-555-2345', 'supplier2@biohealth.com', 'A-1-02', 45000, 25000, 1523,
 300, 3000, 300, 200, 'EPA/DHA 고함량 제품', '캡슐', 'A', 7,
 false, true, '2024-01-01', '2024-01-01'),

-- 3. 종합비타민 멀티
('33333333-3333-3333-3333-333333333333'::uuid,
 'SUPP-MLT-COMP', '종합비타민 멀티 365정', '8809454321003',
 '종합비타민', '센트룸', '센트룸', '한국화이자',
 '02-555-3456', 'supplier3@pfizer.co.kr', 'A-2-01', 35900, 18000, 3201,
 600, 6000, 600, 3000, '대용량 제품, 월 1-2회 대량 입고', '정', 'A', 10,
 false, true, '2024-01-01', '2024-01-01'),

-- 4. 프로바이오틱스 유산균
('44444444-4444-4444-4444-444444444444'::uuid,
 'SUPP-PRO-LACTO', '프로바이오틱스 100억 60캡슐', '8809454321004',
 '유산균', '락토핏', '락토핏', '종근당건강',
 '02-555-4567', 'supplier4@ckdhc.com', 'A-2-02', 28900, 14000, 892,
 200, 2000, 200, 100, '냉장보관 필수, 유통기한 관리 중요', '캡슐', 'B', 5,
 false, true, '2024-01-01', '2024-01-01'),

-- 5. 칼슘 마그네슘 아연
('55555555-5555-5555-5555-555555555555'::uuid,
 'SUPP-CAL-MAG', '칼슘 마그네슘 아연 180정', '8809454321005',
 '미네랄', '네이처메이드', '네이처메이드', '대상웰라이프',
 '02-555-5678', 'supplier5@daesang.com', 'B-1-01', 24900, 12000, 2156,
 400, 4000, 400, 2000, '뼈 건강 필수 영양소', '정', 'B', 7,
 false, true, '2024-01-01', '2024-01-01'),

-- 6. 루테인 지아잔틴
('66666666-6666-6666-6666-666666666666'::uuid,
 'SUPP-LUT-EYE', '루테인 지아잔틴 20mg 90캡슐', '8809454321006',
 '눈건강', '아이클리어', '아이클리어', '뉴트리원',
 '02-555-6789', 'supplier6@nutrione.co.kr', 'B-1-02', 39900, 20000, 673,
 150, 1500, 150, 100, '중장년층 인기 제품', '캡슐', 'B', 5,
 false, true, '2024-01-01', '2024-01-01'),

-- 7. 밀크씨슬 실리마린
('77777777-7777-7777-7777-777777777777'::uuid,
 'SUPP-MLK-LIVER', '밀크씨슬 실리마린 500mg 120정', '8809454321007',
 '간건강', '나우푸드', '나우푸드', '헬스밸런스',
 '02-555-7890', 'supplier7@healthbalance.com', 'B-2-01', 32900, 16000, 1789,
 350, 3500, 350, 200, '간 건강 기능성 원료', '정', 'B', 7,
 false, true, '2024-01-01', '2024-01-01');

-- 거래 데이터 생성 (2024-10-01 ~ 2024-12-31)
DO $$
DECLARE
    v_date DATE;
    v_product_id UUID;
    v_quantity INT;
    v_unit_price DECIMAL;
    v_stock INT;
    v_moq INT;
    v_prev_stock INT;
BEGIN
    -- 각 제품별로 거래 생성
    FOR v_product_id, v_stock, v_moq, v_unit_price IN 
        SELECT id, current_stock, moq, price 
        FROM products
    LOOP
        -- 초기 재고 설정을 위한 입고 거래
        v_date := '2024-09-30'::DATE;
        v_prev_stock := 0;
        
        -- 현재 재고량 기준으로 초기 입고
        INSERT INTO transactions (
            id, product_id, transaction_type, date, transaction_date, quantity,
            previous_stock, new_stock, reason, memo, created_by
        ) VALUES (
            gen_random_uuid(), v_product_id, 'IN', v_date, v_date, v_stock,
            v_prev_stock, v_prev_stock + v_stock, '초기 재고', '초기 재고 입고', 'system'
        );
        v_prev_stock := v_prev_stock + v_stock;
        
        -- 10월 ~ 12월 거래 생성
        v_date := '2024-10-01'::DATE;
        
        WHILE v_date <= '2024-12-31' LOOP
            -- 주말 제외 (토요일=6, 일요일=0)
            IF EXTRACT(DOW FROM v_date) NOT IN (0, 6) THEN
                -- 90% 확률로 출고 거래 생성
                IF random() < 0.9 THEN
                    -- 제품별 출고량 조정 (재고량에 비례)
                    IF v_stock > 2500 THEN
                        v_quantity := 30 + floor(random() * 70)::INT; -- 30-100개
                    ELSIF v_stock > 1500 THEN
                        v_quantity := 20 + floor(random() * 40)::INT; -- 20-60개
                    ELSE
                        v_quantity := 10 + floor(random() * 30)::INT; -- 10-40개
                    END IF;
                    
                    INSERT INTO transactions (
                        id, product_id, transaction_type, date, transaction_date, quantity,
                        previous_stock, new_stock, reason, memo, created_by
                    ) VALUES (
                        gen_random_uuid(), v_product_id, 'OUT', v_date, v_date, v_quantity,
                        v_prev_stock, v_prev_stock - v_quantity,
                        CASE floor(random() * 5)::INT
                            WHEN 0 THEN '쿠팡 주문'
                            WHEN 1 THEN '스마트스토어 주문'
                            WHEN 2 THEN '자사몰 주문'
                            WHEN 3 THEN '도매 출고'
                            ELSE '일반 판매'
                        END,
                        '정상 판매', 'system'
                    );
                    v_prev_stock := v_prev_stock - v_quantity;
                END IF;
                
                -- 월 1-2회 정도 입고 (MOQ 단위로)
                IF (EXTRACT(DAY FROM v_date) = 5 OR EXTRACT(DAY FROM v_date) = 20) 
                   AND random() < 0.7 THEN
                    v_quantity := v_moq * (1 + floor(random() * 3)::INT); -- MOQ의 1-3배
                    
                    INSERT INTO transactions (
                        id, product_id, transaction_type, date, transaction_date, quantity,
                        previous_stock, new_stock, reason, memo, created_by
                    ) VALUES (
                        gen_random_uuid(), v_product_id, 'IN', v_date, v_date, v_quantity,
                        v_prev_stock, v_prev_stock + v_quantity,
                        '정기 발주', '정기 발주 입고', 'system'
                    );
                    v_prev_stock := v_prev_stock + v_quantity;
                END IF;
            END IF;
            
            v_date := v_date + INTERVAL '1 day';
        END LOOP;
    END LOOP;
END $$;

-- 일일 원장 데이터 생성
INSERT INTO daily_ledgers (id, product_id, ledger_date, beginning_stock, total_inbound, total_outbound, adjustments, ending_stock)
SELECT 
    gen_random_uuid(),
    p.id,
    dates.date,
    COALESCE(LAG(p.current_stock + COALESCE(SUM(t_in.quantity), 0) - COALESCE(SUM(t_out.quantity), 0)) 
             OVER (PARTITION BY p.id ORDER BY dates.date), p.current_stock) as beginning_stock,
    COALESCE(SUM(t_in.quantity), 0) as total_inbound,
    COALESCE(SUM(t_out.quantity), 0) as total_outbound,
    0 as adjustments,
    COALESCE(LAG(p.current_stock + COALESCE(SUM(t_in.quantity), 0) - COALESCE(SUM(t_out.quantity), 0)) 
             OVER (PARTITION BY p.id ORDER BY dates.date), p.current_stock) +
    COALESCE(SUM(t_in.quantity), 0) - COALESCE(SUM(t_out.quantity), 0) as ending_stock
FROM 
    products p
    CROSS JOIN (
        SELECT DISTINCT date::DATE as date 
        FROM generate_series('2024-10-01'::DATE, '2024-12-31'::DATE, '1 day'::INTERVAL) as date
    ) dates
    LEFT JOIN transactions t_in ON p.id = t_in.product_id AND t_in.date = dates.date AND t_in.transaction_type = 'IN'
    LEFT JOIN transactions t_out ON p.id = t_out.product_id AND t_out.date = dates.date AND t_out.transaction_type = 'OUT'
GROUP BY p.id, p.current_stock, dates.date
ORDER BY p.id, dates.date;

-- 구매 주문서 및 아이템은 별도 테이블 구조 확인 필요로 제외

-- 재고 불일치 샘플 데이터는 테이블 구조 확인 필요로 제외

-- 현재 재고 업데이트 (거래 내역 기반)
UPDATE products p
SET current_stock = 
    p.current_stock + 
    COALESCE((SELECT SUM(quantity) FROM transactions WHERE product_id = p.id AND transaction_type = 'IN'), 0) -
    COALESCE((SELECT SUM(quantity) FROM transactions WHERE product_id = p.id AND transaction_type = 'OUT'), 0),
    updated_at = NOW();