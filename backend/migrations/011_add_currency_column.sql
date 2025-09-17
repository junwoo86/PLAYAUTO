-- 011_add_currency_column.sql
-- 제품 테이블에 통화 단위 컬럼 추가

-- 1. currency 컬럼 추가 (기본값 'KRW')
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'KRW' CHECK (currency IN ('KRW', 'USD'));

-- 2. 기존 데이터는 모두 KRW로 설정
UPDATE playauto_platform.products
SET currency = 'KRW'
WHERE currency IS NULL;

-- 3. NOT NULL 제약 조건 추가
ALTER TABLE playauto_platform.products
ALTER COLUMN currency SET NOT NULL;

-- 4. 코멘트 추가
COMMENT ON COLUMN playauto_platform.products.currency IS '통화 단위 (KRW: 원화, USD: 미국 달러)';

-- 5. 인덱스 추가 (필터링을 위해)
CREATE INDEX IF NOT EXISTS idx_products_currency ON playauto_platform.products(currency);