-- 007_restructure_product_relationships.sql
-- Products 테이블의 PK를 product_code로 변경하고 모든 FK 관계 업데이트
-- 2025-09-06: product_code 기준 구조 변경

-- 스키마 설정
SET search_path TO playauto_platform;

-- Step 1: 임시 컬럼 추가 및 FK 제약조건 제거
-- transactions 테이블
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_product_id_fkey;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);

-- product_code 데이터 채우기 (products 테이블의 product_code 매핑)
UPDATE transactions 
SET product_code = (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = transactions.product_id
)
WHERE product_code IS NULL;

-- discrepancies 테이블
ALTER TABLE discrepancies 
DROP CONSTRAINT IF EXISTS discrepancies_product_id_fkey;

ALTER TABLE discrepancies 
ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);

UPDATE discrepancies 
SET product_code = (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = discrepancies.product_id
)
WHERE product_code IS NULL;

-- purchase_order_items 테이블
ALTER TABLE purchase_order_items 
DROP CONSTRAINT IF EXISTS purchase_order_items_product_id_fkey;

-- 이미 product_code 컬럼이 있으므로 데이터만 확인
UPDATE purchase_order_items 
SET product_code = COALESCE(product_code, (
    SELECT p.product_code 
    FROM products p 
    WHERE p.id = purchase_order_items.product_id
))
WHERE product_code IS NULL OR product_code = '';

-- daily_ledgers 테이블 (이미 product_code 사용중)
-- 별도 처리 불필요

-- product_boms 테이블 (이미 product_code 사용중)
-- 별도 처리 불필요

-- Step 2: products 테이블 PK 변경
-- 기존 FK 제약조건들이 제거되었으므로 안전하게 PK 변경 가능

-- 기존 PK 제거
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_pkey;

-- product_code를 PK로 설정
ALTER TABLE products ADD CONSTRAINT products_pkey PRIMARY KEY (product_code);

-- 기존 id 컬럼 제거 (UUID 컬럼)
ALTER TABLE products DROP COLUMN IF EXISTS id;

-- Step 3: 기존 product_id 컬럼들 제거 및 새 FK 제약조건 추가

-- transactions 테이블
ALTER TABLE transactions DROP COLUMN IF EXISTS product_id;
ALTER TABLE transactions ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE transactions 
ADD CONSTRAINT transactions_product_code_fkey 
FOREIGN KEY (product_code) REFERENCES products(product_code);

-- discrepancies 테이블  
ALTER TABLE discrepancies DROP COLUMN IF EXISTS product_id;
ALTER TABLE discrepancies ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE discrepancies 
ADD CONSTRAINT discrepancies_product_code_fkey 
FOREIGN KEY (product_code) REFERENCES products(product_code);

-- purchase_order_items 테이블
ALTER TABLE purchase_order_items DROP COLUMN IF EXISTS product_id;
ALTER TABLE purchase_order_items ALTER COLUMN product_code SET NOT NULL;
ALTER TABLE purchase_order_items 
ADD CONSTRAINT purchase_order_items_product_code_fkey 
FOREIGN KEY (product_code) REFERENCES products(product_code);

-- Step 4: 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_transactions_product_code ON transactions(product_code);
CREATE INDEX IF NOT EXISTS idx_discrepancies_product_code ON discrepancies(product_code);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_code ON purchase_order_items(product_code);

-- Step 5: 데이터 무결성 검증
-- 모든 product_code가 유효한지 확인
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    -- transactions 테이블 검증
    SELECT COUNT(*) INTO invalid_count
    FROM transactions t
    LEFT JOIN products p ON t.product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION '유효하지 않은 product_code가 transactions 테이블에 % 개 있습니다.', invalid_count;
    END IF;
    
    -- discrepancies 테이블 검증
    SELECT COUNT(*) INTO invalid_count
    FROM discrepancies d
    LEFT JOIN products p ON d.product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION '유효하지 않은 product_code가 discrepancies 테이블에 % 개 있습니다.', invalid_count;
    END IF;
    
    -- purchase_order_items 테이블 검증
    SELECT COUNT(*) INTO invalid_count
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_code = p.product_code
    WHERE p.product_code IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION '유효하지 않은 product_code가 purchase_order_items 테이블에 % 개 있습니다.', invalid_count;
    END IF;
    
    RAISE NOTICE '데이터 무결성 검증 완료: 모든 FK 관계가 유효합니다.';
END $$;

-- 완료 메시지
SELECT 'products 테이블 PK 구조 변경 완료 - product_code 기준으로 재구성됨' AS status;