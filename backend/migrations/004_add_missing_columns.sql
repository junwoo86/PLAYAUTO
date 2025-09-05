-- products 테이블에 누락된 컬럼 추가
SET search_path TO playauto_platform, public;

-- barcode 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);

-- brand 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

-- supplier_contact 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_contact VARCHAR(100);

-- location 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT '기본 위치';

-- purchase_price 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12,2) DEFAULT 0;

-- min_stock 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 10;

-- max_stock 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock INTEGER DEFAULT 1000;

-- memo 컬럼 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS memo TEXT;

-- transactions 테이블에 date 컬럼 추가 (transaction_date 대신)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;