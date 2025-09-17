-- 013_add_warehouse_simple.sql
-- 창고 관리 테이블 생성

-- 1. 창고 테이블 생성
CREATE TABLE IF NOT EXISTS playauto_platform.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. products 테이블에 warehouse_id 컬럼 추가
ALTER TABLE playauto_platform.products 
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES playauto_platform.warehouses(id);

-- 3. 기본 창고 데이터 삽입
INSERT INTO playauto_platform.warehouses (name, description, location) 
VALUES 
    ('본사 창고', '본사 메인 창고', '서울시 강남구'),
    ('지점 창고', '지점 보조 창고', '경기도 성남시')
ON CONFLICT (name) DO NOTHING;