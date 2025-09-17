-- 009_add_purchase_sale_price.sql
-- purchase_price와 sale_price 컬럼 추가

-- 1. products 테이블에 purchase_price와 sale_price 컬럼 추가
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12, 2);

-- 2. 기존 price 값을 purchase_price와 sale_price에 복사 (초기값 설정)
UPDATE playauto_platform.products
SET purchase_price = price,
    sale_price = price
WHERE purchase_price IS NULL OR sale_price IS NULL;

-- 3. 코멘트 추가
COMMENT ON COLUMN playauto_platform.products.purchase_price IS '구매가';
COMMENT ON COLUMN playauto_platform.products.sale_price IS '판매가';
COMMENT ON COLUMN playauto_platform.products.price IS '기본가격(deprecated - purchase_price와 sale_price 사용 권장)';

-- 4. 인덱스 추가 (필요한 경우)
-- CREATE INDEX IF NOT EXISTS idx_products_purchase_price ON playauto_platform.products(purchase_price);
-- CREATE INDEX IF NOT EXISTS idx_products_sale_price ON playauto_platform.products(sale_price);