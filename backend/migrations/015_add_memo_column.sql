-- products 테이블에 memo 컬럼 추가
-- 2025-09-17

-- memo 컬럼 추가 (제품 메모)
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS memo TEXT;

-- 컬럼 설명 추가
COMMENT ON COLUMN playauto_platform.products.memo IS '제품 메모';