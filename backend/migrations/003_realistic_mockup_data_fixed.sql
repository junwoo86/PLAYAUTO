-- PLAYAUTO 재고 관리 시스템 실제 목업 데이터 (3개월치)
-- Version: 003_realistic_mockup_fixed
-- Date: 2025-01-05

-- 스키마 설정
SET search_path TO playauto_platform, public;

-- 기존 데이터 삭제
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
    ('11111111-1111-1111-1111-111111111111'::uuid,
     'NB-SAM-001', '삼성 갤럭시북3 프로 16인치', '8806094882308',
     '노트북', '갤럭시북', '삼성전자',
     '삼성전자 B2B팀', 'b2b@samsung.com', '02-2255-0114',
     'A-01', '1층 A구역 1번 선반', '대',
     2890000, 2300000,
     0, 5, true,
     2, 3, 50, 7,
     '프리미엄 노트북, 주력 상품', true),
    
    ('22222222-2222-2222-2222-222222222222'::uuid,
     'MON-LG-001', 'LG 울트라와이드 34인치 모니터', '8801031234567',
     '모니터', '울트라기어', 'LG전자',
     'LG전자 법인영업팀', 'business@lge.com', '02-3777-1114',
     'A-02', '1층 A구역 2번 선반', '대',
     650000, 520000,
     0, 3, true,
     1, 2, 30, 5,
     '게이밍/업무용 고급 모니터', true),
    
    ('33333333-3333-3333-3333-333333333333'::uuid,
     'MS-LOG-001', '로지텍 MX Master 3S', '097855173201',
     '마우스', 'MX시리즈', 'Logitech',
     '로지텍코리아', 'sales@logitech.kr', '02-555-0100',
     'B-01', '2층 B구역 1번 선반', '개',
     149000, 95000,
     0, 15, true,
     5, 10, 100, 3,
     '프리미엄 무선 마우스, 인기상품', true),
    
    ('44444444-4444-4444-4444-444444444444'::uuid,
     'AP-APP-001', '에어팟 프로 2세대', '194253397724',
     '이어폰', '에어팟', 'Apple',
     '애플코리아 리셀러', 'reseller@apple.kr', '02-6712-6700',
     'B-02', '2층 B구역 2번 선반', '개',
     359000, 280000,
     0, 8, true,
     2, 5, 50, 7,
     'USB-C 타입, 정품', true),
    
    ('55555555-5555-5555-5555-555555555555'::uuid,
     'PB-XIA-001', '샤오미 20000mAh 보조배터리', '6934177788222',
     '보조배터리', '미밴드', 'Xiaomi',
     '샤오미 한국총판', 'kr@xiaomi.com', '1670-8208',
     'C-01', '3층 C구역 1번 선반', '개',
     39900, 25000,
     0, 20, true,
     10, 15, 200, 3,
     '고속충전 지원, PD 3.0', true),
    
    ('66666666-6666-6666-6666-666666666666'::uuid,
     'KB-RAZ-001', '레이저 블랙위도우 V3 무선', '8886419379485',
     '키보드', '블랙위도우', 'Razer',
     '레이저 공식대리점', 'sales@razer.kr', '02-514-0821',
     'C-02', '3층 C구역 2번 선반', '개',
     259000, 180000,
     0, 5, true,
     2, 3, 40, 5,
     '게이밍 키보드, 한글각인', true),
    
    ('77777777-7777-7777-7777-777777777777'::uuid,
     'SSD-WD-001', 'WD My Passport SSD 2TB', '718037894379',
     '저장장치', 'My Passport', 'Western Digital',
     'WD 공식수입사', 'import@wd.co.kr', '02-703-7979',
     'D-01', '4층 D구역 1번 선반', '개',
     289000, 210000,
     0, 6, true,
     3, 5, 60, 5,
     'USB 3.2, 휴대용 SSD', true);

-- ====================================
-- 2. 3개월치 거래 데이터 직접 생성
-- ====================================

-- 노트북 거래 데이터 (NB-SAM-001)
WITH date_series AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '90 days',
        CURRENT_DATE,
        '1 day'::interval
    )::date as trans_date
)
INSERT INTO transactions (
    id, transaction_type, product_id, quantity,
    previous_stock, new_stock, reason, memo,
    location, date, created_by, created_at
)
SELECT 
    gen_random_uuid(),
    'inbound',
    '11111111-1111-1111-1111-111111111111'::uuid,
    20,
    0,
    20,
    '초기 입고',
    '초기 재고 입고',
    'A-01',
    CURRENT_DATE - INTERVAL '90 days',
    'system',
    (CURRENT_DATE - INTERVAL '90 days')::timestamp
WHERE NOT EXISTS (
    SELECT 1 FROM transactions 
    WHERE product_id = '11111111-1111-1111-1111-111111111111'::uuid
);

-- 각 제품별로 입고 데이터 추가
INSERT INTO transactions (
    id, transaction_type, product_id, quantity,
    previous_stock, new_stock, reason, memo,
    location, date, created_by, created_at
)
SELECT * FROM (
    VALUES
    -- 노트북 추가 입고
    (gen_random_uuid(), 'inbound', '11111111-1111-1111-1111-111111111111'::uuid,
     10, 20, 30, '정기 입고', '월간 정기 발주', 'A-01',
     CURRENT_DATE - INTERVAL '60 days', 'purchasing', 
     (CURRENT_DATE - INTERVAL '60 days')::timestamp),
    (gen_random_uuid(), 'inbound', '11111111-1111-1111-1111-111111111111'::uuid,
     8, 15, 23, '정기 입고', '추가 발주', 'A-01',
     CURRENT_DATE - INTERVAL '30 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '30 days')::timestamp),
     
    -- 모니터 입고
    (gen_random_uuid(), 'inbound', '22222222-2222-2222-2222-222222222222'::uuid,
     15, 0, 15, '초기 입고', '초기 재고', 'A-02',
     CURRENT_DATE - INTERVAL '90 days', 'system',
     (CURRENT_DATE - INTERVAL '90 days')::timestamp),
    (gen_random_uuid(), 'inbound', '22222222-2222-2222-2222-222222222222'::uuid,
     5, 8, 13, '정기 입고', '정기 발주', 'A-02',
     CURRENT_DATE - INTERVAL '45 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '45 days')::timestamp),
     
    -- 마우스 입고
    (gen_random_uuid(), 'inbound', '33333333-3333-3333-3333-333333333333'::uuid,
     60, 0, 60, '초기 입고', '초기 재고', 'B-01',
     CURRENT_DATE - INTERVAL '90 days', 'system',
     (CURRENT_DATE - INTERVAL '90 days')::timestamp),
    (gen_random_uuid(), 'inbound', '33333333-3333-3333-3333-333333333333'::uuid,
     30, 25, 55, '정기 입고', '정기 발주', 'B-01',
     CURRENT_DATE - INTERVAL '50 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '50 days')::timestamp),
    (gen_random_uuid(), 'inbound', '33333333-3333-3333-3333-333333333333'::uuid,
     25, 30, 55, '정기 입고', '추가 발주', 'B-01',
     CURRENT_DATE - INTERVAL '20 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '20 days')::timestamp),
     
    -- 에어팟 입고
    (gen_random_uuid(), 'inbound', '44444444-4444-4444-4444-444444444444'::uuid,
     30, 0, 30, '초기 입고', '초기 재고', 'B-02',
     CURRENT_DATE - INTERVAL '90 days', 'system',
     (CURRENT_DATE - INTERVAL '90 days')::timestamp),
    (gen_random_uuid(), 'inbound', '44444444-4444-4444-4444-444444444444'::uuid,
     20, 12, 32, '정기 입고', '정기 발주', 'B-02',
     CURRENT_DATE - INTERVAL '40 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '40 days')::timestamp),
     
    -- 보조배터리 입고
    (gen_random_uuid(), 'inbound', '55555555-5555-5555-5555-555555555555'::uuid,
     100, 0, 100, '초기 입고', '초기 재고', 'C-01',
     CURRENT_DATE - INTERVAL '90 days', 'system',
     (CURRENT_DATE - INTERVAL '90 days')::timestamp),
    (gen_random_uuid(), 'inbound', '55555555-5555-5555-5555-555555555555'::uuid,
     50, 35, 85, '정기 입고', '정기 발주', 'C-01',
     CURRENT_DATE - INTERVAL '55 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '55 days')::timestamp),
    (gen_random_uuid(), 'inbound', '55555555-5555-5555-5555-555555555555'::uuid,
     40, 48, 88, '정기 입고', '추가 발주', 'C-01',
     CURRENT_DATE - INTERVAL '25 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '25 days')::timestamp),
     
    -- 키보드 입고
    (gen_random_uuid(), 'inbound', '66666666-6666-6666-6666-666666666666'::uuid,
     25, 0, 25, '초기 입고', '초기 재고', 'C-02',
     CURRENT_DATE - INTERVAL '90 days', 'system',
     (CURRENT_DATE - INTERVAL '90 days')::timestamp),
    (gen_random_uuid(), 'inbound', '66666666-6666-6666-6666-666666666666'::uuid,
     10, 12, 22, '정기 입고', '정기 발주', 'C-02',
     CURRENT_DATE - INTERVAL '35 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '35 days')::timestamp),
     
    -- SSD 입고
    (gen_random_uuid(), 'inbound', '77777777-7777-7777-7777-777777777777'::uuid,
     35, 0, 35, '초기 입고', '초기 재고', 'D-01',
     CURRENT_DATE - INTERVAL '90 days', 'system',
     (CURRENT_DATE - INTERVAL '90 days')::timestamp),
    (gen_random_uuid(), 'inbound', '77777777-7777-7777-7777-777777777777'::uuid,
     15, 18, 33, '정기 입고', '정기 발주', 'D-01',
     CURRENT_DATE - INTERVAL '42 days', 'purchasing',
     (CURRENT_DATE - INTERVAL '42 days')::timestamp)
) AS t(id, transaction_type, product_id, quantity, previous_stock, new_stock, reason, memo, location, date, created_by, created_at);

-- 출고 데이터 생성 (영업일 기준)
-- 노트북 출고 샘플
INSERT INTO transactions (
    id, transaction_type, product_id, quantity,
    previous_stock, new_stock, reason, memo,
    location, date, created_by, created_at
)
SELECT 
    gen_random_uuid(),
    'outbound',
    '11111111-1111-1111-1111-111111111111'::uuid,
    1,
    23 - (ROW_NUMBER() OVER (ORDER BY trans_date)),
    22 - (ROW_NUMBER() OVER (ORDER BY trans_date)),
    '정상 판매',
    '온라인 주문',
    'A-01',
    trans_date,
    'sales_team',
    trans_date::timestamp + INTERVAL '14 hours'
FROM (
    SELECT (CURRENT_DATE - INTERVAL '29 days' + (n || ' days')::interval)::date as trans_date
    FROM generate_series(0, 7) n
    WHERE EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '29 days' + (n || ' days')::interval) NOT IN (0, 6)
) dates
LIMIT 8;

-- 마우스 출고 샘플 (더 많은 거래)
INSERT INTO transactions (
    id, transaction_type, product_id, quantity,
    previous_stock, new_stock, reason, memo,
    location, date, created_by, created_at
)
SELECT 
    gen_random_uuid(),
    'outbound',
    '33333333-3333-3333-3333-333333333333'::uuid,
    CASE WHEN RANDOM() < 0.3 THEN 3 ELSE 2 END,
    55 - (ROW_NUMBER() OVER (ORDER BY trans_date) * 2),
    53 - (ROW_NUMBER() OVER (ORDER BY trans_date) * 2),
    '정상 판매',
    CASE WHEN RANDOM() < 0.5 THEN '온라인 주문' ELSE 'B2B 판매' END,
    'B-01',
    trans_date,
    'sales_' || (1 + (RANDOM() * 3)::int),
    trans_date::timestamp + INTERVAL '10 hours' + (RANDOM() * INTERVAL '6 hours')
FROM (
    SELECT (CURRENT_DATE - INTERVAL '20 days' + (n || ' days')::interval)::date as trans_date
    FROM generate_series(0, 19) n
    WHERE EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '20 days' + (n || ' days')::interval) NOT IN (0, 6)
) dates
LIMIT 15;

-- 보조배터리 출고 샘플 (가장 많은 거래)
INSERT INTO transactions (
    id, transaction_type, product_id, quantity,
    previous_stock, new_stock, reason, memo,
    location, date, created_by, created_at
)
SELECT 
    gen_random_uuid(),
    'outbound',
    '55555555-5555-5555-5555-555555555555'::uuid,
    3 + (RANDOM() * 4)::int,
    88 - (ROW_NUMBER() OVER (ORDER BY trans_date) * 3),
    85 - (ROW_NUMBER() OVER (ORDER BY trans_date) * 3),
    '정상 판매',
    CASE 
        WHEN RANDOM() < 0.3 THEN '온라인 대량 주문'
        WHEN RANDOM() < 0.6 THEN '오프라인 매장'
        ELSE '기업 구매'
    END,
    'C-01',
    trans_date,
    'sales_' || (1 + (RANDOM() * 3)::int),
    trans_date::timestamp + INTERVAL '9 hours' + (RANDOM() * INTERVAL '8 hours')
FROM (
    SELECT (CURRENT_DATE - INTERVAL '24 days' + (n || ' days')::interval)::date as trans_date
    FROM generate_series(0, 23) n
    WHERE EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '24 days' + (n || ' days')::interval) NOT IN (0, 6)
) dates
LIMIT 20;

-- 재고 조정 데이터
INSERT INTO transactions (
    id, transaction_type, product_id, quantity,
    previous_stock, new_stock, reason, memo,
    location, date, created_by, created_at
)
VALUES
    (gen_random_uuid(), 'adjustment', '33333333-3333-3333-3333-333333333333'::uuid,
     -2, 47, 45, '실사 차이', '월간 재고실사 결과', 'B-01',
     CURRENT_DATE - INTERVAL '10 days', 'inventory_team',
     (CURRENT_DATE - INTERVAL '10 days')::timestamp + INTERVAL '18 hours'),
    
    (gen_random_uuid(), 'adjustment', '55555555-5555-5555-5555-555555555555'::uuid,
     -3, 71, 68, '파손', '운송 중 파손 확인', 'C-01',
     CURRENT_DATE - INTERVAL '7 days', 'inventory_team',
     (CURRENT_DATE - INTERVAL '7 days')::timestamp + INTERVAL '17 hours');

-- 현재 재고 업데이트
UPDATE products SET current_stock = 15 WHERE product_code = 'NB-SAM-001';
UPDATE products SET current_stock = 8 WHERE product_code = 'MON-LG-001';
UPDATE products SET current_stock = 45 WHERE product_code = 'MS-LOG-001';
UPDATE products SET current_stock = 22 WHERE product_code = 'AP-APP-001';
UPDATE products SET current_stock = 68 WHERE product_code = 'PB-XIA-001';
UPDATE products SET current_stock = 12 WHERE product_code = 'KB-RAZ-001';
UPDATE products SET current_stock = 18 WHERE product_code = 'SSD-WD-001';

-- ====================================
-- 3. 재고 불일치 데이터
-- ====================================
INSERT INTO discrepancies (
    id, product_id, system_stock, physical_stock, discrepancy,
    explanation, status, resolved_at, resolved_by, created_at
)
VALUES
    (gen_random_uuid(), '33333333-3333-3333-3333-333333333333'::uuid,
     47, 45, 2, '월간 실사 시 차이 발견. 원인 조사 후 조정 완료.', 'resolved',
     CURRENT_TIMESTAMP - INTERVAL '2 days', 'manager1',
     CURRENT_TIMESTAMP - INTERVAL '5 days'),
    
    (gen_random_uuid(), '55555555-5555-5555-5555-555555555555'::uuid,
     71, 68, 3, '운송 중 파손 3개 확인. 폐기 처리.', 'resolved',
     CURRENT_TIMESTAMP - INTERVAL '1 day', 'manager2',
     CURRENT_TIMESTAMP - INTERVAL '3 days'),
    
    (gen_random_uuid(), '44444444-4444-4444-4444-444444444444'::uuid,
     22, 21, 1, '조사 진행 중', 'investigating',
     NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '1 day'),
    
    (gen_random_uuid(), '66666666-6666-6666-6666-666666666666'::uuid,
     12, 11, 1, NULL, 'pending',
     NULL, NULL,
     CURRENT_TIMESTAMP);

-- ====================================
-- 4. 발주서 데이터
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

-- ====================================
-- 5. 통계 확인
-- ====================================
DO $$
DECLARE
    v_product_count INTEGER;
    v_transaction_count INTEGER;
    v_po_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_product_count FROM products;
    SELECT COUNT(*) INTO v_transaction_count FROM transactions;
    SELECT COUNT(*) INTO v_po_count FROM purchase_orders;
    
    RAISE NOTICE '=================================';
    RAISE NOTICE '목업 데이터 생성 완료';
    RAISE NOTICE '=================================';
    RAISE NOTICE '제품: % 개', v_product_count;
    RAISE NOTICE '거래: % 건', v_transaction_count;
    RAISE NOTICE '발주서: % 건', v_po_count;
    RAISE NOTICE '=================================';
END $$;