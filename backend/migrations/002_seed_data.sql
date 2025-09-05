-- PLAYAUTO 재고 관리 시스템 초기 데이터
-- Version: 002_seed_data
-- Date: 2025-01-05

-- 스키마 설정
SET search_path TO playauto_platform, public;

-- ====================================
-- 1. 샘플 제품 데이터
-- ====================================
INSERT INTO products (
    product_code, product_name, barcode, category, brand, manufacturer,
    supplier, supplier_email, zone_id, unit, price, purchase_price,
    current_stock, safety_stock, moq, lead_time_days, is_active
) VALUES
    -- 전자제품
    ('SKU-LAPTOP001', '삼성 갤럭시북3 프로', '8806094882308', '노트북', '삼성', '삼성전자',
     '삼성전자 B2B', 'b2b@samsung.com', 'A-01', '대', 2500000, 2000000,
     15, 5, 1, 7, true),
    
    ('SKU-MOUSE001', '로지텍 MX Master 3S', '097855173201', '마우스', '로지텍', 'Logitech',
     '로지텍 코리아', 'sales@logitech.kr', 'B-02', '개', 150000, 100000,
     50, 10, 5, 3, true),
    
    ('SKU-KEYBOARD001', '한성 GK898B', '8809568260031', '키보드', '한성', '한성컴퓨터',
     '한성컴퓨터', 'order@hansung.com', 'B-03', '개', 180000, 120000,
     30, 10, 3, 5, true),
    
    -- 사무용품
    ('SKU-PEN001', '모나미 153 볼펜 (검정)', '8801067001010', '필기구', '모나미', '모나미',
     '모나미 도매상', 'wholesale@monami.com', 'C-01', '박스(12개입)', 12000, 8000,
     100, 20, 10, 2, true),
    
    ('SKU-PAPER001', 'A4 복사지 80g (500매)', '8801067230456', '용지류', '한솔', '한솔제지',
     '한솔제지 대리점', 'order@hansol.com', 'C-02', '박스(5권)', 25000, 18000,
     200, 50, 20, 3, true),
    
    ('SKU-STAPLER001', '맥스 HD-10D 스테이플러', '4902870666019', '사무용품', '맥스', 'MAX',
     '문구도매센터', 'order@office.kr', 'C-03', '개', 5000, 3000,
     80, 20, 10, 2, true),
    
    -- 생활용품
    ('SKU-TISSUE001', '크리넥스 각티슈 (200매)', '8801094510039', '생활용품', '유한킴벌리', '유한킴벌리',
     '유한킴벌리 대리점', 'b2b@yuhan-kimberly.com', 'D-01', '박스(6개입)', 15000, 10000,
     150, 30, 20, 3, true),
    
    ('SKU-CLEANER001', '다이슨 V15 무선청소기', '5025155050996', '가전', '다이슨', 'Dyson',
     '다이슨 코리아', 'b2b@dyson.kr', 'A-02', '대', 800000, 600000,
     8, 3, 1, 14, true),
    
    -- 세트 상품
    ('SKU-SET001', '사무용 기본 세트', '1234567890123', '세트상품', '자체브랜드', '자체제작',
     '자체', '', 'E-01', '세트', 50000, 35000,
     0, 5, 1, 0, true),
    
    ('SKU-SET002', '노트북 풀세트', '1234567890456', '세트상품', '자체브랜드', '자체제작',
     '자체', '', 'E-02', '세트', 2850000, 2220000,
     0, 2, 1, 0, true);

-- ====================================
-- 2. BOM (세트상품 구성) 데이터
-- ====================================
INSERT INTO product_bom (parent_product_id, child_product_id, quantity)
SELECT 
    p1.id as parent_product_id,
    p2.id as child_product_id,
    bom.quantity
FROM (
    VALUES 
        -- 사무용 기본 세트 구성
        ('SKU-SET001', 'SKU-PEN001', 1),
        ('SKU-SET001', 'SKU-PAPER001', 2),
        ('SKU-SET001', 'SKU-STAPLER001', 1),
        -- 노트북 풀세트 구성
        ('SKU-SET002', 'SKU-LAPTOP001', 1),
        ('SKU-SET002', 'SKU-MOUSE001', 1),
        ('SKU-SET002', 'SKU-KEYBOARD001', 1)
) AS bom(parent_code, child_code, quantity)
JOIN products p1 ON p1.product_code = bom.parent_code
JOIN products p2 ON p2.product_code = bom.child_code;

-- ====================================
-- 3. 초기 거래 내역 (최근 30일)
-- ====================================
INSERT INTO transactions (
    transaction_type, product_id, quantity, previous_stock, new_stock, 
    reason, memo, location, date, created_by, created_at
)
SELECT 
    t.transaction_type,
    p.id as product_id,
    t.quantity,
    t.previous_stock,
    t.new_stock,
    t.reason,
    t.memo,
    t.location,
    t.date::date,
    t.created_by,
    t.created_at::timestamp with time zone
FROM (
    VALUES 
        -- 초기 입고 (30일 전)
        ('inbound', 'SKU-LAPTOP001', 20, 0, 20, '초기 입고', '신규 재고 입고', 'A-01', CURRENT_DATE - 30, 'system', CURRENT_TIMESTAMP - interval '30 days'),
        ('inbound', 'SKU-MOUSE001', 100, 0, 100, '초기 입고', '신규 재고 입고', 'B-02', CURRENT_DATE - 30, 'system', CURRENT_TIMESTAMP - interval '30 days'),
        ('inbound', 'SKU-KEYBOARD001', 50, 0, 50, '초기 입고', '신규 재고 입고', 'B-03', CURRENT_DATE - 30, 'system', CURRENT_TIMESTAMP - interval '30 days'),
        
        -- 출고 내역 (25일 전)
        ('outbound', 'SKU-LAPTOP001', 3, 20, 17, '판매', '온라인 주문 #1001', 'A-01', CURRENT_DATE - 25, 'user1', CURRENT_TIMESTAMP - interval '25 days'),
        ('outbound', 'SKU-MOUSE001', 30, 100, 70, '판매', '대량 주문 #1002', 'B-02', CURRENT_DATE - 25, 'user1', CURRENT_TIMESTAMP - interval '25 days'),
        
        -- 추가 입고 (20일 전)
        ('inbound', 'SKU-PEN001', 150, 0, 150, '정기 입고', '월간 정기 입고', 'C-01', CURRENT_DATE - 20, 'user2', CURRENT_TIMESTAMP - interval '20 days'),
        ('inbound', 'SKU-PAPER001', 300, 0, 300, '정기 입고', '월간 정기 입고', 'C-02', CURRENT_DATE - 20, 'user2', CURRENT_TIMESTAMP - interval '20 days'),
        
        -- 조정 (15일 전)
        ('adjustment', 'SKU-LAPTOP001', -2, 17, 15, '실사 차이', '월간 재고실사 - 파손 제품 발견', 'A-01', CURRENT_DATE - 15, 'admin', CURRENT_TIMESTAMP - interval '15 days'),
        ('adjustment', 'SKU-MOUSE001', -20, 70, 50, '실사 차이', '월간 재고실사 - 수량 불일치', 'B-02', CURRENT_DATE - 15, 'admin', CURRENT_TIMESTAMP - interval '15 days'),
        
        -- 최근 출고 (7일 전)
        ('outbound', 'SKU-PEN001', 50, 150, 100, '판매', '대량 주문 #1015', 'C-01', CURRENT_DATE - 7, 'user1', CURRENT_TIMESTAMP - interval '7 days'),
        ('outbound', 'SKU-PAPER001', 100, 300, 200, '판매', '기업 고객 주문', 'C-02', CURRENT_DATE - 7, 'user1', CURRENT_TIMESTAMP - interval '7 days'),
        
        -- 오늘 거래
        ('inbound', 'SKU-STAPLER001', 100, 0, 100, '신규 입고', '첫 입고', 'C-03', CURRENT_DATE, 'user2', CURRENT_TIMESTAMP),
        ('outbound', 'SKU-STAPLER001', 20, 100, 80, '판매', '일반 판매', 'C-03', CURRENT_DATE, 'user1', CURRENT_TIMESTAMP),
        ('inbound', 'SKU-TISSUE001', 200, 0, 200, '정기 입고', '월간 입고', 'D-01', CURRENT_DATE, 'user2', CURRENT_TIMESTAMP),
        ('outbound', 'SKU-TISSUE001', 50, 200, 150, '판매', '온라인 판매', 'D-01', CURRENT_DATE, 'user1', CURRENT_TIMESTAMP),
        ('inbound', 'SKU-CLEANER001', 10, 0, 10, '신규 입고', '신제품 입고', 'A-02', CURRENT_DATE, 'user2', CURRENT_TIMESTAMP),
        ('outbound', 'SKU-CLEANER001', 2, 10, 8, '판매', '프리미엄 고객', 'A-02', CURRENT_DATE, 'user1', CURRENT_TIMESTAMP),
        ('adjustment', 'SKU-KEYBOARD001', -20, 50, 30, '실사 차이', '재고 실사 결과 조정', 'B-03', CURRENT_DATE, 'admin', CURRENT_TIMESTAMP)
) AS t(transaction_type, product_code, quantity, previous_stock, new_stock, reason, memo, location, date, created_by, created_at)
JOIN products p ON p.product_code = t.product_code;

-- ====================================
-- 4. 재고 불일치 샘플 데이터
-- ====================================
INSERT INTO discrepancies (
    product_id, system_stock, physical_stock, explanation, status, resolved_at, resolved_by
)
SELECT 
    p.id as product_id,
    d.system_stock,
    d.physical_stock,
    d.explanation,
    d.status,
    d.resolved_at::timestamp with time zone,
    d.resolved_by
FROM (
    VALUES 
        ('SKU-MOUSE001', 50, 48, '배송 중 파손으로 인한 불일치. 폐기 처리 완료.', 'resolved', CURRENT_TIMESTAMP - interval '5 days', 'admin'),
        ('SKU-PAPER001', 200, 195, '보관 중 습기로 인한 손상. 5박스 폐기 처리.', 'resolved', CURRENT_TIMESTAMP - interval '3 days', 'admin'),
        ('SKU-KEYBOARD001', 30, 28, '조사 중입니다. CCTV 확인 필요.', 'investigating', NULL, NULL),
        ('SKU-PEN001', 100, 98, NULL, 'pending', NULL, NULL)
) AS d(product_code, system_stock, physical_stock, explanation, status, resolved_at, resolved_by)
JOIN products p ON p.product_code = d.product_code;

-- ====================================
-- 5. 발주서 샘플 데이터
-- ====================================
INSERT INTO purchase_orders (
    po_number, supplier, status, total_amount, expected_date, notes, created_by
) VALUES
    ('PO-2025-001', '삼성전자 B2B', 'completed', 10000000, CURRENT_DATE - interval '10 days', '노트북 긴급 발주', 'user2'),
    ('PO-2025-002', '로지텍 코리아', 'partial', 3000000, CURRENT_DATE + interval '3 days', '마우스 정기 발주', 'user2'),
    ('PO-2025-003', '문구도매센터', 'ordered', 500000, CURRENT_DATE + interval '5 days', '사무용품 월간 발주', 'user2'),
    ('PO-2025-004', '다이슨 코리아', 'draft', 4800000, NULL, '청소기 신제품 발주 예정', 'user2');

-- ====================================
-- 6. 발주서 상세 샘플 데이터
-- ====================================
INSERT INTO purchase_order_items (
    po_id, product_id, ordered_quantity, received_quantity, unit_price, status
)
SELECT 
    po.id as po_id,
    p.id as product_id,
    poi.ordered_quantity,
    poi.received_quantity,
    poi.unit_price,
    poi.status
FROM (
    VALUES 
        -- PO-2025-001 (완료된 발주)
        ('PO-2025-001', 'SKU-LAPTOP001', 5, 5, 2000000, 'received'),
        
        -- PO-2025-002 (부분 입고)
        ('PO-2025-002', 'SKU-MOUSE001', 30, 20, 100000, 'partial'),
        
        -- PO-2025-003 (주문 완료)
        ('PO-2025-003', 'SKU-PEN001', 20, 0, 8000, 'pending'),
        ('PO-2025-003', 'SKU-PAPER001', 10, 0, 18000, 'pending'),
        ('PO-2025-003', 'SKU-STAPLER001', 30, 0, 3000, 'pending'),
        
        -- PO-2025-004 (임시저장)
        ('PO-2025-004', 'SKU-CLEANER001', 8, 0, 600000, 'pending')
) AS poi(po_number, product_code, ordered_quantity, received_quantity, unit_price, status)
JOIN purchase_orders po ON po.po_number = poi.po_number
JOIN products p ON p.product_code = poi.product_code;

-- ====================================
-- 7. 일일 수불부 샘플 데이터 (최근 7일)
-- ====================================
INSERT INTO daily_ledgers (
    ledger_date, product_id, beginning_stock, total_inbound, total_outbound, adjustments, ending_stock
)
SELECT 
    dates.ledger_date,
    p.id as product_id,
    COALESCE(
        LAG(dl.ending_stock) OVER (PARTITION BY p.id ORDER BY dates.ledger_date),
        0
    ) as beginning_stock,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'inbound' THEN t.quantity ELSE 0 END), 0) as total_inbound,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'outbound' THEN ABS(t.quantity) ELSE 0 END), 0) as total_outbound,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'adjustment' THEN t.quantity ELSE 0 END), 0) as adjustments,
    p.current_stock as ending_stock
FROM 
    generate_series(CURRENT_DATE - interval '6 days', CURRENT_DATE, interval '1 day') as dates(ledger_date)
    CROSS JOIN products p
    LEFT JOIN transactions t ON t.product_id = p.id AND t.date = dates.ledger_date::date
    LEFT JOIN daily_ledgers dl ON dl.product_id = p.id AND dl.ledger_date = dates.ledger_date - interval '1 day'
WHERE 
    p.product_code IN ('SKU-LAPTOP001', 'SKU-MOUSE001', 'SKU-KEYBOARD001', 'SKU-PEN001', 'SKU-PAPER001')
    AND dates.ledger_date <= CURRENT_DATE - interval '1 day'
GROUP BY dates.ledger_date, p.id, p.current_stock, dl.ending_stock
ON CONFLICT (ledger_date, product_id) DO NOTHING;

-- ====================================
-- 8. 통계 확인
-- ====================================
DO $$
DECLARE
    v_product_count INTEGER;
    v_transaction_count INTEGER;
    v_po_count INTEGER;
    v_discrepancy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_product_count FROM products;
    SELECT COUNT(*) INTO v_transaction_count FROM transactions;
    SELECT COUNT(*) INTO v_po_count FROM purchase_orders;
    SELECT COUNT(*) INTO v_discrepancy_count FROM discrepancies WHERE status = 'pending';
    
    RAISE NOTICE '=================================';
    RAISE NOTICE '샘플 데이터 생성 완료';
    RAISE NOTICE '=================================';
    RAISE NOTICE '제품: % 개', v_product_count;
    RAISE NOTICE '거래 내역: % 건', v_transaction_count;
    RAISE NOTICE '발주서: % 건', v_po_count;
    RAISE NOTICE '미처리 불일치: % 건', v_discrepancy_count;
    RAISE NOTICE '=================================';
END $$;