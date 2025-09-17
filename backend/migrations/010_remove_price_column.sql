-- 010_remove_price_column.sql
-- price 컬럼 제거 (purchase_price와 sale_price로 대체)

-- 1. price 컬럼이 아직 사용 중일 수 있으므로, 먼저 데이터 확인 및 마이그레이션
-- purchase_price나 sale_price가 NULL인 경우 price 값으로 업데이트
UPDATE playauto_platform.products
SET purchase_price = COALESCE(purchase_price, price),
    sale_price = COALESCE(sale_price, price)
WHERE purchase_price IS NULL OR sale_price IS NULL;

-- 2. price 컬럼 제거
ALTER TABLE playauto_platform.products
DROP COLUMN IF EXISTS price;

-- 3. 확인 메시지
DO $$ 
BEGIN
    RAISE NOTICE 'price 컬럼이 성공적으로 제거되었습니다. 이제 purchase_price와 sale_price를 사용하세요.';
END $$;