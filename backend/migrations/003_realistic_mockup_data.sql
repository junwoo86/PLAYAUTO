-- PLAYAUTO 재고 관리 시스템 실제 목업 데이터 (3개월치)
-- Version: 003_realistic_mockup
-- Date: 2025-01-05
-- 설명: 실제 운영 환경과 유사한 3개월치 데이터 생성

-- 스키마 설정
SET search_path TO playauto_platform, public;

-- 기존 데이터 삭제 (CASCADE로 관련 데이터도 함께 삭제)
TRUNCATE TABLE product_bom CASCADE;
TRUNCATE TABLE daily_ledgers CASCADE;
TRUNCATE TABLE purchase_order_items CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE discrepancies CASCADE;
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE products CASCADE;

-- ====================================
-- 1. 제품 마스터 데이터 (7개 제품)
-- ====================================
INSERT INTO products (
    id,
    product_code, 
    product_name, 
    barcode,
    category, 
    brand,
    manufacturer,
    supplier, 
    supplier_email,
    supplier_contact,
    zone_id, 
    location,
    unit, 
    price, 
    purchase_price,
    current_stock, 
    safety_stock,
    is_auto_calculated,
    moq, 
    min_stock,
    max_stock,
    lead_time_days,
    memo,
    is_active
) VALUES
    -- 1. 삼성 노트북
    ('11111111-1111-1111-1111-111111111111'::uuid,
     'NB-SAM-001', '삼성 갤럭시북3 프로 16인치', '8806094882308',
     '노트북', '갤럭시북', '삼성전자',
     '삼성전자 B2B팀', 'b2b@samsung.com', '02-2255-0114',
     'A-01', '1층 A구역 1번 선반', '대',
     2890000, 2300000,
     15, 5, true,
     2, 3, 50, 7,
     '프리미엄 노트북, 주력 상품', true),
    
    -- 2. LG 모니터
    ('22222222-2222-2222-2222-222222222222'::uuid,
     'MON-LG-001', 'LG 울트라와이드 34인치 모니터', '8801031234567',
     '모니터', '울트라기어', 'LG전자',
     'LG전자 법인영업팀', 'business@lge.com', '02-3777-1114',
     'A-02', '1층 A구역 2번 선반', '대',
     650000, 520000,
     8, 3, true,
     1, 2, 30, 5,
     '게이밍/업무용 고급 모니터', true),
    
    -- 3. 로지텍 마우스
    ('33333333-3333-3333-3333-333333333333'::uuid,
     'MS-LOG-001', '로지텍 MX Master 3S', '097855173201',
     '마우스', 'MX시리즈', 'Logitech',
     '로지텍코리아', 'sales@logitech.kr', '02-555-0100',
     'B-01', '2층 B구역 1번 선반', '개',
     149000, 95000,
     45, 15, true,
     5, 10, 100, 3,
     '프리미엄 무선 마우스, 인기상품', true),
    
    -- 4. 애플 에어팟
    ('44444444-4444-4444-4444-444444444444'::uuid,
     'AP-APP-001', '에어팟 프로 2세대', '194253397724',
     '이어폰', '에어팟', 'Apple',
     '애플코리아 리셀러', 'reseller@apple.kr', '02-6712-6700',
     'B-02', '2층 B구역 2번 선반', '개',
     359000, 280000,
     22, 8, true,
     2, 5, 50, 7,
     'USB-C 타입, 정품', true),
    
    -- 5. 샤오미 보조배터리
    ('55555555-5555-5555-5555-555555555555'::uuid,
     'PB-XIA-001', '샤오미 20000mAh 보조배터리', '6934177788222',
     '보조배터리', '미밴드', 'Xiaomi',
     '샤오미 한국총판', 'kr@xiaomi.com', '1670-8208',
     'C-01', '3층 C구역 1번 선반', '개',
     39900, 25000,
     68, 20, true,
     10, 15, 200, 3,
     '고속충전 지원, PD 3.0', true),
    
    -- 6. 레이저 무선키보드
    ('66666666-6666-6666-6666-666666666666'::uuid,
     'KB-RAZ-001', '레이저 블랙위도우 V3 무선', '8886419379485',
     '키보드', '블랙위도우', 'Razer',
     '레이저 공식대리점', 'sales@razer.kr', '02-514-0821',
     'C-02', '3층 C구역 2번 선반', '개',
     259000, 180000,
     12, 5, true,
     2, 3, 40, 5,
     '게이밍 키보드, 한글각인', true),
    
    -- 7. WD 외장 SSD
    ('77777777-7777-7777-7777-777777777777'::uuid,
     'SSD-WD-001', 'WD My Passport SSD 2TB', '718037894379',
     '저장장치', 'My Passport', 'Western Digital',
     'WD 공식수입사', 'import@wd.co.kr', '02-703-7979',
     'D-01', '4층 D구역 1번 선반', '개',
     289000, 210000,
     18, 6, true,
     3, 5, 60, 5,
     'USB 3.2, 휴대용 SSD', true);

-- ====================================
-- 2. 3개월치 거래 데이터 생성
-- ====================================

-- 트랜잭션 생성 함수
CREATE OR REPLACE FUNCTION generate_transactions() RETURNS void AS $$
DECLARE
    v_product RECORD;
    v_date DATE;
    v_current_stock INTEGER;
    v_transaction_id UUID;
    v_outbound_qty INTEGER;
    v_random_val FLOAT;
    v_is_business_day BOOLEAN;
    v_last_inbound_date DATE;
    v_inbound_qty INTEGER;
BEGIN
    -- 각 제품별로 처리
    FOR v_product IN SELECT * FROM products LOOP
        v_current_stock := 0;
        v_last_inbound_date := CURRENT_DATE - INTERVAL '90 days';
        
        -- 3개월 전부터 오늘까지 각 날짜별로 처리
        FOR v_date IN SELECT generate_series(
            CURRENT_DATE - INTERVAL '90 days',
            CURRENT_DATE,
            '1 day'::interval
        )::date LOOP
            -- 영업일 여부 판단 (토요일, 일요일 제외)
            v_is_business_day := EXTRACT(DOW FROM v_date) NOT IN (0, 6);
            
            -- 초기 입고 (첫날)
            IF v_date = CURRENT_DATE - INTERVAL '90 days' THEN
                -- 제품별 초기 재고 설정
                v_inbound_qty := CASE v_product.product_code
                    WHEN 'NB-SAM-001' THEN 20  -- 노트북
                    WHEN 'MON-LG-001' THEN 15  -- 모니터
                    WHEN 'MS-LOG-001' THEN 60  -- 마우스
                    WHEN 'AP-APP-001' THEN 30  -- 에어팟
                    WHEN 'PB-XIA-001' THEN 100 -- 보조배터리
                    WHEN 'KB-RAZ-001' THEN 25  -- 키보드
                    WHEN 'SSD-WD-001' THEN 35  -- SSD
                END;
                
                INSERT INTO transactions (
                    id, transaction_type, product_id, quantity,
                    previous_stock, new_stock, reason, memo,
                    location, date, created_by, created_at
                ) VALUES (
                    gen_random_uuid(),
                    'inbound',
                    v_product.id,
                    v_inbound_qty,
                    0,
                    v_inbound_qty,
                    '초기 재고',
                    '3개월 시작 시점 초기 재고 입고',
                    v_product.location,
                    v_date,
                    'system',
                    v_date + TIME '09:00:00'
                );
                
                v_current_stock := v_inbound_qty;
                v_last_inbound_date := v_date;
            END IF;
            
            -- 정기 입고 (제품별로 30-45일마다)
            IF v_product.product_code IN ('NB-SAM-001', 'MON-LG-001', 'AP-APP-001', 'KB-RAZ-001', 'SSD-WD-001') THEN
                -- 고가 제품은 30-40일마다 입고
                IF v_date - v_last_inbound_date >= 30 + (random() * 10)::int THEN
                    v_inbound_qty := v_product.moq * (2 + (random() * 3)::int);
                    
                    INSERT INTO transactions (
                        id, transaction_type, product_id, quantity,
                        previous_stock, new_stock, reason, memo,
                        location, date, created_by, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        'inbound',
                        v_product.id,
                        v_inbound_qty,
                        v_current_stock,
                        v_current_stock + v_inbound_qty,
                        '정기 입고',
                        '정기 발주 입고 처리',
                        v_product.location,
                        v_date,
                        'purchasing_team',
                        v_date + TIME '10:00:00'
                    );
                    
                    v_current_stock := v_current_stock + v_inbound_qty;
                    v_last_inbound_date := v_date;
                END IF;
            ELSE
                -- 저가 제품은 35-45일마다 입고
                IF v_date - v_last_inbound_date >= 35 + (random() * 10)::int THEN
                    v_inbound_qty := v_product.moq * (3 + (random() * 5)::int);
                    
                    INSERT INTO transactions (
                        id, transaction_type, product_id, quantity,
                        previous_stock, new_stock, reason, memo,
                        location, date, created_by, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        'inbound',
                        v_product.id,
                        v_inbound_qty,
                        v_current_stock,
                        v_current_stock + v_inbound_qty,
                        '정기 입고',
                        '월간 정기 발주',
                        v_product.location,
                        v_date,
                        'purchasing_team',
                        v_date + TIME '10:00:00'
                    );
                    
                    v_current_stock := v_current_stock + v_inbound_qty;
                    v_last_inbound_date := v_date;
                END IF;
            END IF;
            
            -- 출고 처리 (영업일 기준)
            IF v_is_business_day AND v_current_stock > 0 THEN
                v_random_val := random();
                
                -- 90% 확률로 출고 발생
                IF v_random_val < 0.9 THEN
                    -- 제품별 일평균 출고량 설정
                    v_outbound_qty := CASE v_product.product_code
                        WHEN 'NB-SAM-001' THEN 1 + (random() * 2)::int  -- 노트북: 1-2개
                        WHEN 'MON-LG-001' THEN 1 + (random() * 1)::int  -- 모니터: 1개
                        WHEN 'MS-LOG-001' THEN 2 + (random() * 4)::int  -- 마우스: 2-5개
                        WHEN 'AP-APP-001' THEN 1 + (random() * 3)::int  -- 에어팟: 1-3개
                        WHEN 'PB-XIA-001' THEN 3 + (random() * 6)::int  -- 보조배터리: 3-8개
                        WHEN 'KB-RAZ-001' THEN 1 + (random() * 2)::int  -- 키보드: 1-2개
                        WHEN 'SSD-WD-001' THEN 1 + (random() * 2)::int  -- SSD: 1-2개
                    END;
                    
                    -- 재고보다 많이 출고하지 않도록 조정
                    IF v_outbound_qty > v_current_stock THEN
                        v_outbound_qty := v_current_stock;
                    END IF;
                    
                    -- 출고 기록 (하루에 여러 건 발생 가능)
                    FOR i IN 1..(1 + (random() * 2)::int) LOOP
                        EXIT WHEN v_current_stock = 0;
                        
                        -- 각 거래별 수량
                        DECLARE
                            v_trans_qty INTEGER;
                        BEGIN
                            v_trans_qty := GREATEST(1, (v_outbound_qty / (1 + (random() * 2)::int))::int);
                            IF v_trans_qty > v_current_stock THEN
                                v_trans_qty := v_current_stock;
                            END IF;
                            
                            INSERT INTO transactions (
                                id, transaction_type, product_id, quantity,
                                previous_stock, new_stock, reason, memo,
                                location, date, created_by, created_at
                            ) VALUES (
                                gen_random_uuid(),
                                'outbound',
                                v_product.id,
                                v_trans_qty,
                                v_current_stock,
                                v_current_stock - v_trans_qty,
                                '정상 판매',
                                CASE (random() * 4)::int
                                    WHEN 0 THEN '온라인 주문'
                                    WHEN 1 THEN '오프라인 매장 판매'
                                    WHEN 2 THEN 'B2B 대량 주문'
                                    ELSE '일반 판매'
                                END,
                                v_product.location,
                                v_date,
                                'sales_' || (1 + (random() * 3)::int),
                                v_date + TIME '11:00:00' + (i * INTERVAL '2 hours')
                            );
                            
                            v_current_stock := v_current_stock - v_trans_qty;
                        END;
                    END LOOP;
                END IF;
                
                -- 가끔 재고 조정 발생 (2% 확률)
                IF random() < 0.02 AND v_current_stock > 0 THEN
                    DECLARE
                        v_adjustment INTEGER;
                    BEGIN
                        v_adjustment := -1 * (1 + (random() * 2)::int);
                        
                        INSERT INTO transactions (
                            id, transaction_type, product_id, quantity,
                            previous_stock, new_stock, reason, memo,
                            location, date, created_by, created_at
                        ) VALUES (
                            gen_random_uuid(),
                            'adjustment',
                            v_product.id,
                            v_adjustment,
                            v_current_stock,
                            v_current_stock + v_adjustment,
                            CASE (random() * 3)::int
                                WHEN 0 THEN '실사 차이'
                                WHEN 1 THEN '파손'
                                ELSE '분실'
                            END,
                            '월간 재고 실사 결과',
                            v_product.location,
                            v_date,
                            'inventory_team',
                            v_date + TIME '18:00:00'
                        );
                        
                        v_current_stock := v_current_stock + v_adjustment;
                    END;
                END IF;
            END IF;
        END LOOP;
        
        -- 최종 재고 업데이트
        UPDATE products 
        SET current_stock = v_current_stock 
        WHERE id = v_product.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 트랜잭션 생성 실행
SELECT generate_transactions();

-- 함수 삭제
DROP FUNCTION generate_transactions();

-- ====================================
-- 3. 최근 재고 불일치 데이터
-- ====================================
INSERT INTO discrepancies (
    id, product_id, system_stock, physical_stock, discrepancy,
    explanation, status, resolved_at, resolved_by, created_at
)
SELECT 
    gen_random_uuid(),
    p.id,
    p.current_stock,
    p.current_stock - d.diff,
    d.diff,
    d.explanation,
    d.status,
    d.resolved_at,
    d.resolved_by,
    d.created_at
FROM products p
CROSS JOIN (
    VALUES 
        ('MS-LOG-001', 2, '배송 중 파손 확인. 교환 처리 완료.', 'resolved', 
         CURRENT_TIMESTAMP - INTERVAL '2 days', 'manager1', CURRENT_DATE - INTERVAL '5 days'),
        ('PB-XIA-001', 3, '재고 실사 시 위치 오류로 인한 차이. 확인 완료.', 'resolved',
         CURRENT_TIMESTAMP - INTERVAL '1 day', 'manager2', CURRENT_DATE - INTERVAL '3 days'),
        ('AP-APP-001', 1, '조사 진행 중', 'investigating',
         NULL, NULL, CURRENT_DATE - INTERVAL '1 day'),
        ('KB-RAZ-001', 1, NULL, 'pending',
         NULL, NULL, CURRENT_DATE)
) AS d(product_code, diff, explanation, status, resolved_at, resolved_by, created_at)
WHERE p.product_code = d.product_code;

-- ====================================
-- 4. 발주서 데이터 (진행중인 발주)
-- ====================================
INSERT INTO purchase_orders (
    id, po_number, supplier, status, total_amount,
    expected_date, notes, created_by, created_at
) VALUES
    (gen_random_uuid(), 'PO-2025-01-001', '삼성전자 B2B팀', 'completed',
     4600000, CURRENT_DATE - INTERVAL '7 days', '노트북 정기 발주', 'purchasing_team', 
     CURRENT_TIMESTAMP - INTERVAL '10 days'),
    
    (gen_random_uuid(), 'PO-2025-01-002', 'LG전자 법인영업팀', 'partial',
     2600000, CURRENT_DATE + INTERVAL '2 days', '모니터 추가 발주', 'purchasing_team',
     CURRENT_TIMESTAMP - INTERVAL '5 days'),
    
    (gen_random_uuid(), 'PO-2025-01-003', '로지텍코리아', 'ordered',
     1425000, CURRENT_DATE + INTERVAL '3 days', '마우스 대량 발주', 'purchasing_team',
     CURRENT_TIMESTAMP - INTERVAL '2 days'),
    
    (gen_random_uuid(), 'PO-2025-01-004', '샤오미 한국총판', 'draft',
     750000, NULL, '보조배터리 월간 발주 예정', 'purchasing_team',
     CURRENT_TIMESTAMP);

-- 발주 상세 데이터는 별도 쿼리로 추가
INSERT INTO purchase_order_items (
    id, po_id, product_id, ordered_quantity, received_quantity,
    unit_price, status
)
SELECT 
    gen_random_uuid(),
    po.id,
    p.id,
    poi.ordered_qty,
    poi.received_qty,
    poi.unit_price,
    poi.status
FROM purchase_orders po
JOIN (VALUES
    ('PO-2025-01-001', 'NB-SAM-001', 2, 2, 2300000, 'received'),
    ('PO-2025-01-002', 'MON-LG-001', 5, 3, 520000, 'partial'),
    ('PO-2025-01-003', 'MS-LOG-001', 15, 0, 95000, 'pending'),
    ('PO-2025-01-004', 'PB-XIA-001', 30, 0, 25000, 'pending')
) AS poi(po_number, product_code, ordered_qty, received_qty, unit_price, status)
    ON po.po_number = poi.po_number
JOIN products p ON p.product_code = poi.product_code;

-- ====================================
-- 5. 일일 수불부 생성 (최근 30일)
-- ====================================
INSERT INTO daily_ledgers (
    id, ledger_date, product_id, 
    beginning_stock, total_inbound, total_outbound, adjustments, ending_stock
)
SELECT 
    gen_random_uuid(),
    dates.ledger_date::date,
    p.id,
    COALESCE(
        (SELECT new_stock FROM transactions 
         WHERE product_id = p.id 
           AND date < dates.ledger_date
         ORDER BY created_at DESC LIMIT 1), 0
    ) as beginning_stock,
    COALESCE(
        (SELECT SUM(quantity) FROM transactions 
         WHERE product_id = p.id 
           AND date = dates.ledger_date
           AND transaction_type = 'inbound'), 0
    ) as total_inbound,
    COALESCE(
        (SELECT SUM(ABS(quantity)) FROM transactions 
         WHERE product_id = p.id 
           AND date = dates.ledger_date
           AND transaction_type = 'outbound'), 0
    ) as total_outbound,
    COALESCE(
        (SELECT SUM(quantity) FROM transactions 
         WHERE product_id = p.id 
           AND date = dates.ledger_date
           AND transaction_type = 'adjustment'), 0
    ) as adjustments,
    COALESCE(
        (SELECT new_stock FROM transactions 
         WHERE product_id = p.id 
           AND date = dates.ledger_date
         ORDER BY created_at DESC LIMIT 1),
        (SELECT new_stock FROM transactions 
         WHERE product_id = p.id 
           AND date < dates.ledger_date
         ORDER BY created_at DESC LIMIT 1), 0
    ) as ending_stock
FROM 
    generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE - INTERVAL '1 day',
        '1 day'::interval
    ) as dates(ledger_date)
CROSS JOIN products p
WHERE EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.product_id = p.id 
      AND t.date = dates.ledger_date::date
)
ON CONFLICT (ledger_date, product_id) DO NOTHING;

-- ====================================
-- 6. 안전재고 자동 계산 및 업데이트
-- ====================================
WITH safety_stock_calc AS (
    SELECT 
        p.id,
        p.lead_time_days,
        COALESCE(AVG(daily_outbound.total), 0) as avg_daily_outbound
    FROM products p
    LEFT JOIN (
        SELECT 
            product_id,
            date,
            SUM(ABS(quantity)) as total
        FROM transactions
        WHERE transaction_type = 'outbound'
          AND date >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY product_id, date
    ) daily_outbound ON daily_outbound.product_id = p.id
    GROUP BY p.id, p.lead_time_days
)
UPDATE products p
SET 
    safety_stock = GREATEST(
        p.moq,
        CEIL((ssc.lead_time_days + 7) * ssc.avg_daily_outbound)
    ),
    is_auto_calculated = true
FROM safety_stock_calc ssc
WHERE p.id = ssc.id;

-- ====================================
-- 7. 통계 확인
-- ====================================
DO $$
DECLARE
    v_product_count INTEGER;
    v_transaction_count INTEGER;
    v_transaction_3months INTEGER;
    v_business_days INTEGER;
    v_po_count INTEGER;
    v_discrepancy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_product_count FROM products;
    SELECT COUNT(*) INTO v_transaction_count FROM transactions;
    SELECT COUNT(*) INTO v_transaction_3months 
    FROM transactions 
    WHERE date >= CURRENT_DATE - INTERVAL '90 days';
    
    SELECT COUNT(DISTINCT date) INTO v_business_days
    FROM transactions
    WHERE transaction_type = 'outbound'
      AND date >= CURRENT_DATE - INTERVAL '90 days';
    
    SELECT COUNT(*) INTO v_po_count FROM purchase_orders;
    SELECT COUNT(*) INTO v_discrepancy_count FROM discrepancies WHERE status = 'pending';
    
    RAISE NOTICE '=================================';
    RAISE NOTICE '목업 데이터 생성 완료';
    RAISE NOTICE '=================================';
    RAISE NOTICE '제품: % 개', v_product_count;
    RAISE NOTICE '전체 거래: % 건', v_transaction_count;
    RAISE NOTICE '3개월 거래: % 건', v_transaction_3months;
    RAISE NOTICE '영업일 수: % 일', v_business_days;
    RAISE NOTICE '발주서: % 건', v_po_count;
    RAISE NOTICE '미처리 불일치: % 건', v_discrepancy_count;
    RAISE NOTICE '=================================';
    
    -- 제품별 현재 재고 현황
    RAISE NOTICE '';
    RAISE NOTICE '제품별 재고 현황:';
    FOR r IN (
        SELECT 
            product_code,
            product_name,
            current_stock,
            safety_stock
        FROM products
        ORDER BY product_code
    ) LOOP
        RAISE NOTICE '  %: % (현재:%개, 안전:%개)', 
            r.product_code, r.product_name, r.current_stock, r.safety_stock;
    END LOOP;
END $$;