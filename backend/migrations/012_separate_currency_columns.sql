-- 012_separate_currency_columns.sql
-- 구매가와 판매가의 통화를 별도로 관리하기 위한 스키마 변경

-- 1. 기존 currency 컬럼 이름 변경 (구매 통화로 사용)
ALTER TABLE playauto_platform.products
RENAME COLUMN currency TO purchase_currency;

-- 2. 판매 통화 컬럼 추가
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS sale_currency VARCHAR(3) DEFAULT 'KRW' CHECK (sale_currency IN ('KRW', 'USD'));

-- 3. NOT NULL 제약 조건 추가
ALTER TABLE playauto_platform.products
ALTER COLUMN sale_currency SET NOT NULL;

-- 4. 코멘트 추가
COMMENT ON COLUMN playauto_platform.products.purchase_currency IS '구매 통화 단위 (KRW: 원화, USD: 미국 달러)';
COMMENT ON COLUMN playauto_platform.products.sale_currency IS '판매 통화 단위 (KRW: 원화, USD: 미국 달러)';

-- 5. 인덱스 추가 (필터링을 위해)
CREATE INDEX IF NOT EXISTS idx_products_purchase_currency ON playauto_platform.products(purchase_currency);
CREATE INDEX IF NOT EXISTS idx_products_sale_currency ON playauto_platform.products(sale_currency);

-- 6. 기존 인덱스 제거 (더 이상 필요없음)
DROP INDEX IF EXISTS playauto_platform.idx_products_currency;