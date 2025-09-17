-- products 테이블에 barcode와 contact_email 컬럼 추가
-- 2025-09-16

-- barcode 컬럼 추가 (제품 바코드)
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);

-- contact_email 컬럼 추가 (담당자 이메일)
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(200);

-- 인덱스 추가 (바코드로 빠른 검색을 위해)
CREATE INDEX IF NOT EXISTS idx_products_barcode
ON playauto_platform.products(barcode);

-- 컬럼 설명 추가
COMMENT ON COLUMN playauto_platform.products.barcode IS '제품 바코드';
COMMENT ON COLUMN playauto_platform.products.contact_email IS '담당자 이메일';