-- 창고 관리 기능 추가
-- Date: 2025-09-09
-- Description: warehouses 테이블 생성 및 products 테이블에 warehouse_id 추가

-- 1. warehouses 테이블 생성
CREATE TABLE IF NOT EXISTS playauto_platform.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. warehouses 테이블에 인덱스 추가
CREATE INDEX idx_warehouses_name ON playauto_platform.warehouses(name);
CREATE INDEX idx_warehouses_is_active ON playauto_platform.warehouses(is_active);

-- 3. 기본 창고 데이터 삽입
INSERT INTO playauto_platform.warehouses (name, description, location, is_active)
VALUES 
    ('본사 창고', '본사 메인 창고', '서울특별시 강남구', true),
    ('지점 창고', '지점 창고', '경기도 성남시', true)
ON CONFLICT (name) DO NOTHING;

-- 4. products 테이블에 warehouse_id 컬럼 추가
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS warehouse_id UUID;

-- 5. 기본값 설정 (본사 창고로 설정)
UPDATE playauto_platform.products p
SET warehouse_id = (SELECT id FROM playauto_platform.warehouses WHERE name = '본사 창고')
WHERE warehouse_id IS NULL;

-- 6. 외래키 제약 추가
ALTER TABLE playauto_platform.products
ADD CONSTRAINT fk_products_warehouse
FOREIGN KEY (warehouse_id) REFERENCES playauto_platform.warehouses(id)
ON DELETE SET NULL;

-- 7. warehouse_id에 인덱스 추가
CREATE INDEX idx_products_warehouse_id ON playauto_platform.products(warehouse_id);

-- 8. updated_at 트리거 함수 생성 (이미 존재하지 않는 경우)
CREATE OR REPLACE FUNCTION playauto_platform.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. warehouses 테이블에 updated_at 트리거 추가
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON playauto_platform.warehouses;
CREATE TRIGGER update_warehouses_updated_at
BEFORE UPDATE ON playauto_platform.warehouses
FOR EACH ROW
EXECUTE FUNCTION playauto_platform.update_updated_at_column();

COMMENT ON TABLE playauto_platform.warehouses IS '창고 정보 테이블';
COMMENT ON COLUMN playauto_platform.warehouses.id IS '창고 고유 ID';
COMMENT ON COLUMN playauto_platform.warehouses.name IS '창고명';
COMMENT ON COLUMN playauto_platform.warehouses.description IS '창고 설명';
COMMENT ON COLUMN playauto_platform.warehouses.location IS '창고 위치';
COMMENT ON COLUMN playauto_platform.warehouses.is_active IS '활성화 상태';
COMMENT ON COLUMN playauto_platform.products.warehouse_id IS '창고 ID (FK)';