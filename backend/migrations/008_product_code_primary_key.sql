-- 008_product_code_primary_key.sql
-- products 테이블을 product_code PK 기반으로 완전 재구성
-- 모든 FK 관계를 product_id(UUID) → product_code(VARCHAR) 변경
-- 2025-09-06: "알 수 없는 제품" 문제 해결을 위한 구조 변경

-- 스키마 설정
SET search_path TO playauto_platform;

-- 트랜잭션 시작
BEGIN;

-- =========================================
-- Step 1: 데이터 무결성 사전 검증
-- =========================================

DO $$
DECLARE
    duplicate_codes INTEGER;
    null_codes INTEGER;
    orphan_transactions INTEGER;
    orphan_discrepancies INTEGER;
    orphan_daily_ledgers INTEGER;
    orphan_purchase_items INTEGER;
    orphan_bom_parent INTEGER;
    orphan_bom_child INTEGER;
BEGIN
    -- product_code 중복 확인
    SELECT COUNT(*) - COUNT(DISTINCT product_code) INTO duplicate_codes
    FROM products;
    
    IF duplicate_codes > 0 THEN
        RAISE EXCEPTION '중복된 product_code가 % 개 있습니다. 마이그레이션을 중단합니다.', duplicate_codes;
    END IF;
    
    -- product_code NULL 확인
    SELECT COUNT(*) INTO null_codes
    FROM products 
    WHERE product_code IS NULL OR product_code = '';
    
    IF null_codes > 0 THEN
        RAISE EXCEPTION 'NULL 또는 빈 product_code가 % 개 있습니다. 마이그레이션을 중단합니다.', null_codes;
    END IF;
    
    -- 고아 레코드 확인
    SELECT COUNT(*) INTO orphan_transactions
    FROM transactions t
    LEFT JOIN products p ON t.product_id = p.id
    WHERE p.id IS NULL;
    
    SELECT COUNT(*) INTO orphan_discrepancies  
    FROM discrepancies d
    LEFT JOIN products p ON d.product_id = p.id
    WHERE p.id IS NULL;
    
    SELECT COUNT(*) INTO orphan_daily_ledgers
    FROM daily_ledgers dl
    LEFT JOIN products p ON dl.product_id = p.id
    WHERE p.id IS NULL;
    
    SELECT COUNT(*) INTO orphan_purchase_items
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_id = p.id
    WHERE p.id IS NULL;
    
    SELECT COUNT(*) INTO orphan_bom_parent
    FROM product_bom pb
    LEFT JOIN products p ON pb.parent_product_id = p.id
    WHERE p.id IS NULL;
    
    SELECT COUNT(*) INTO orphan_bom_child
    FROM product_bom pb
    LEFT JOIN products p ON pb.child_product_id = p.id
    WHERE p.id IS NULL;
    
    IF orphan_transactions > 0 THEN
        RAISE EXCEPTION 'products 테이블과 연결되지 않은 transactions가 % 개 있습니다.', orphan_transactions;
    END IF;
    
    IF orphan_discrepancies > 0 THEN
        RAISE EXCEPTION 'products 테이블과 연결되지 않은 discrepancies가 % 개 있습니다.', orphan_discrepancies;
    END IF;
    
    IF orphan_daily_ledgers > 0 THEN
        RAISE EXCEPTION 'products 테이블과 연결되지 않은 daily_ledgers가 % 개 있습니다.', orphan_daily_ledgers;
    END IF;
    
    IF orphan_purchase_items > 0 THEN
        RAISE EXCEPTION 'products 테이블과 연결되지 않은 purchase_order_items가 % 개 있습니다.', orphan_purchase_items;
    END IF;
    
    IF orphan_bom_parent > 0 THEN
        RAISE EXCEPTION 'products 테이블과 연결되지 않은 product_bom (parent)가 % 개 있습니다.', orphan_bom_parent;
    END IF;
    
    IF orphan_bom_child > 0 THEN
        RAISE EXCEPTION 'products 테이블과 연결되지 않은 product_bom (child)가 % 개 있습니다.', orphan_bom_child;
    END IF;
    
    RAISE NOTICE '✓ 데이터 무결성 검증 완료: 모든 검증 통과';
END $$;

-- =========================================
-- Step 2: 기존 FK 제약조건 제거
-- =========================================

-- transactions 테이블 FK 제거
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_product_id_fkey;

-- discrepancies 테이블 FK 제거  
ALTER TABLE discrepancies DROP CONSTRAINT IF EXISTS discrepancies_product_id_fkey;

-- daily_ledgers 테이블 FK 제거
ALTER TABLE daily_ledgers DROP CONSTRAINT IF EXISTS daily_ledgers_product_id_fkey;

-- purchase_order_items 테이블 FK 제거
ALTER TABLE purchase_order_items DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey;

-- product_bom 테이블 FK 제거
ALTER TABLE product_bom DROP CONSTRAINT IF EXISTS product_bom_parent_product_id_fkey;
ALTER TABLE product_bom DROP CONSTRAINT IF EXISTS product_bom_child_product_id_fkey;

RAISE NOTICE '✓ 기존 FK 제약조건 제거 완료';

-- =========================================
-- Step 3: 새로운 product_code 컬럼 추가 및 데이터 매핑
-- =========================================

-- transactions 테이블에 product_code 컬럼 추가
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);

-- 데이터 매핑: product_id → product_code
UPDATE transactions 
SET product_code = (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = transactions.product_id
)
WHERE product_code IS NULL;

-- discrepancies 테이블
ALTER TABLE discrepancies ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
UPDATE discrepancies 
SET product_code = (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = discrepancies.product_id
)
WHERE product_code IS NULL;

-- daily_ledgers 테이블
ALTER TABLE daily_ledgers ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
UPDATE daily_ledgers 
SET product_code = (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = daily_ledgers.product_id
)
WHERE product_code IS NULL;

-- purchase_order_items 테이블 (이미 product_code가 있을 수 있음)
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
UPDATE purchase_order_items 
SET product_code = COALESCE(
    product_code,
    (SELECT p.product_code FROM products p WHERE p.id = purchase_order_items.product_id)
)
WHERE product_code IS NULL OR product_code = '';

-- product_bom 테이블
ALTER TABLE product_bom ADD COLUMN IF NOT EXISTS parent_product_code VARCHAR(50);
ALTER TABLE product_bom ADD COLUMN IF NOT EXISTS child_product_code VARCHAR(50);

UPDATE product_bom 
SET parent_product_code = (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = product_bom.parent_product_id
)
WHERE parent_product_code IS NULL;

UPDATE product_bom 
SET child_product_code = (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = product_bom.child_product_id
)
WHERE child_product_code IS NULL;

RAISE NOTICE '✓ product_code 컬럼 추가 및 데이터 매핑 완료';

-- =========================================
-- Step 4: products 테이블 PK 변경
-- =========================================

-- 기존 PK 제거
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pkey;

-- product_code를 PK로 설정
ALTER TABLE products ADD CONSTRAINT products_pkey PRIMARY KEY (product_code);

-- 기존 id 컬럼 제거
ALTER TABLE products DROP COLUMN IF EXISTS id;

RAISE NOTICE '✓ products 테이블 PK 변경 완료';

-- =========================================
-- Step 5: 새로운 FK 제약조건 추가 및 기존 컬럼 제거
-- =========================================

-- transactions 테이블
ALTER TABLE transactions ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE transactions ADD CONSTRAINT transactions_product_code_fkey 
    FOREIGN KEY (product_code) REFERENCES products(product_code) ON DELETE CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS product_id;

-- discrepancies 테이블
ALTER TABLE discrepancies ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE discrepancies ADD CONSTRAINT discrepancies_product_code_fkey 
    FOREIGN KEY (product_code) REFERENCES products(product_code) ON DELETE CASCADE;
ALTER TABLE discrepancies DROP COLUMN IF EXISTS product_id;

-- daily_ledgers 테이블
ALTER TABLE daily_ledgers ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE daily_ledgers ADD CONSTRAINT daily_ledgers_product_code_fkey 
    FOREIGN KEY (product_code) REFERENCES products(product_code) ON DELETE CASCADE;
ALTER TABLE daily_ledgers DROP COLUMN IF EXISTS product_id;

-- daily_ledgers unique 제약조건 업데이트
ALTER TABLE daily_ledgers DROP CONSTRAINT IF EXISTS uq_ledger_date_product;
ALTER TABLE daily_ledgers ADD CONSTRAINT uq_ledger_date_product_code 
    UNIQUE (ledger_date, product_code);

-- purchase_order_items 테이블
ALTER TABLE purchase_order_items ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE purchase_order_items ADD CONSTRAINT purchase_order_items_product_code_fkey 
    FOREIGN KEY (product_code) REFERENCES products(product_code) ON DELETE CASCADE;
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS product_id;

-- product_bom 테이블
ALTER TABLE product_bom ALTER COLUMN parent_product_code SET NOT NULL;
ALTER TABLE product_bom ALTER COLUMN child_product_code SET NOT NULL;
ALTER TABLE product_bom ADD CONSTRAINT product_bom_parent_product_code_fkey 
    FOREIGN KEY (parent_product_code) REFERENCES products(product_code) ON DELETE CASCADE;
ALTER TABLE product_bom ADD CONSTRAINT product_bom_child_product_code_fkey 
    FOREIGN KEY (child_product_code) REFERENCES products(product_code) ON DELETE CASCADE;
ALTER TABLE product_bom DROP COLUMN IF EXISTS parent_product_id;
ALTER TABLE product_bom DROP COLUMN IF EXISTS child_product_id;

-- product_bom unique 제약조건 추가
ALTER TABLE product_bom DROP CONSTRAINT IF EXISTS product_bom_parent_product_id_child_product_id_key;
ALTER TABLE product_bom ADD CONSTRAINT product_bom_parent_child_code_key 
    UNIQUE (parent_product_code, child_product_code);

RAISE NOTICE '✓ 새로운 FK 제약조건 추가 및 기존 컬럼 제거 완료';

-- =========================================
-- Step 6: 인덱스 추가 (성능 최적화)
-- =========================================

-- 자주 검색되는 컬럼에 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_transactions_product_code ON transactions(product_code);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_discrepancies_product_code ON discrepancies(product_code);
CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON discrepancies(status);

CREATE INDEX IF NOT EXISTS idx_daily_ledgers_product_code ON daily_ledgers(product_code);
CREATE INDEX IF NOT EXISTS idx_daily_ledgers_ledger_date ON daily_ledgers(ledger_date);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_code ON purchase_order_items(product_code);

CREATE INDEX IF NOT EXISTS idx_product_bom_parent_code ON product_bom(parent_product_code);
CREATE INDEX IF NOT EXISTS idx_product_bom_child_code ON product_bom(child_product_code);

-- products 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products(manufacturer);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

RAISE NOTICE '✓ 성능 최적화 인덱스 추가 완료';

-- =========================================
-- Step 7: 데이터 무결성 최종 검증
-- =========================================

DO $$
DECLARE
    invalid_transactions INTEGER;
    invalid_discrepancies INTEGER;
    invalid_daily_ledgers INTEGER;
    invalid_purchase_items INTEGER;
    invalid_bom_parent INTEGER;
    invalid_bom_child INTEGER;
BEGIN
    -- 모든 FK 관계가 유효한지 검증
    SELECT COUNT(*) INTO invalid_transactions
    FROM transactions t
    LEFT JOIN products p ON t.product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    SELECT COUNT(*) INTO invalid_discrepancies
    FROM discrepancies d
    LEFT JOIN products p ON d.product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    SELECT COUNT(*) INTO invalid_daily_ledgers
    FROM daily_ledgers dl
    LEFT JOIN products p ON dl.product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    SELECT COUNT(*) INTO invalid_purchase_items
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    SELECT COUNT(*) INTO invalid_bom_parent
    FROM product_bom pb
    LEFT JOIN products p ON pb.parent_product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    SELECT COUNT(*) INTO invalid_bom_child
    FROM product_bom pb
    LEFT JOIN products p ON pb.child_product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    IF invalid_transactions > 0 OR invalid_discrepancies > 0 OR invalid_daily_ledgers > 0 OR 
       invalid_purchase_items > 0 OR invalid_bom_parent > 0 OR invalid_bom_child > 0 THEN
        RAISE EXCEPTION '데이터 무결성 검증 실패: 유효하지 않은 FK 참조가 발견되었습니다.';
    END IF;
    
    RAISE NOTICE '✓ 최종 데이터 무결성 검증 완료: 모든 FK 관계가 유효합니다.';
END $$;

-- 커밋
COMMIT;

-- =========================================
-- 마이그레이션 완료 보고
-- =========================================

DO $$
DECLARE
    total_products INTEGER;
    total_transactions INTEGER;
    total_daily_ledgers INTEGER;
    total_discrepancies INTEGER;
    total_purchase_items INTEGER;
    total_bom_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_products FROM products;
    SELECT COUNT(*) INTO total_transactions FROM transactions;
    SELECT COUNT(*) INTO total_daily_ledgers FROM daily_ledgers;
    SELECT COUNT(*) INTO total_discrepancies FROM discrepancies;
    SELECT COUNT(*) INTO total_purchase_items FROM purchase_order_items;
    SELECT COUNT(*) INTO total_bom_records FROM product_bom;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 마이그레이션 완료! 요약 통계:';
    RAISE NOTICE '   - Products: % 개', total_products;
    RAISE NOTICE '   - Transactions: % 개', total_transactions;
    RAISE NOTICE '   - Daily Ledgers: % 개', total_daily_ledgers;
    RAISE NOTICE '   - Discrepancies: % 개', total_discrepancies;
    RAISE NOTICE '   - Purchase Order Items: % 개', total_purchase_items;
    RAISE NOTICE '   - Product BOM Records: % 개', total_bom_records;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 모든 테이블이 product_code 기반으로 성공적으로 변환되었습니다.';
    RAISE NOTICE '✅ "알 수 없는 제품" 문제가 해결되었을 것으로 예상됩니다.';
END $$;