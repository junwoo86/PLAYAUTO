-- PLAYAUTO 재고 관리 시스템 초기 스키마 생성
-- Version: 001
-- Date: 2025-01-05

-- UUID 확장 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 스키마 생성
CREATE SCHEMA IF NOT EXISTS playauto_platform;

-- 기본 스키마 설정
SET search_path TO playauto_platform, public;

-- ====================================
-- 1. products 테이블 (제품 마스터)
-- ====================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    barcode VARCHAR(50),
    category VARCHAR(100),
    brand VARCHAR(100),
    manufacturer VARCHAR(200),
    supplier VARCHAR(200),
    supplier_email VARCHAR(200),
    supplier_contact VARCHAR(100),
    zone_id VARCHAR(50),
    location VARCHAR(100) DEFAULT '기본 위치',
    unit VARCHAR(20) DEFAULT '개',
    price DECIMAL(12,2) DEFAULT 0,
    purchase_price DECIMAL(12,2) DEFAULT 0,
    current_stock INTEGER DEFAULT 0 CHECK (current_stock >= 0),
    safety_stock INTEGER DEFAULT 0,
    is_auto_calculated BOOLEAN DEFAULT false,
    moq INTEGER DEFAULT 1 CHECK (moq > 0),
    min_stock INTEGER DEFAULT 10,
    max_stock INTEGER DEFAULT 1000,
    lead_time_days INTEGER DEFAULT 7,
    order_email_template TEXT,
    memo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- products 인덱스
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_manufacturer ON products(manufacturer);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_product_name ON products(product_name);
CREATE INDEX idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- ====================================
-- 2. transactions 테이블 (재고 트랜잭션)
-- ====================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('inbound', 'outbound', 'adjustment', 'return', 'transfer', 'assembly', 'disassembly')
    ),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason VARCHAR(100),
    memo TEXT,
    location VARCHAR(100),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- transactions 인덱스
CREATE INDEX idx_transactions_product_id ON transactions(product_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- ====================================
-- 3. discrepancies 테이블 (재고 불일치)
-- ====================================
CREATE TABLE IF NOT EXISTS discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    system_stock INTEGER NOT NULL,
    physical_stock INTEGER NOT NULL,
    discrepancy INTEGER GENERATED ALWAYS AS (system_stock - physical_stock) STORED,
    explanation TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'resolved', 'investigating')
    ),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- discrepancies 인덱스
CREATE INDEX idx_discrepancies_product_id ON discrepancies(product_id);
CREATE INDEX idx_discrepancies_status ON discrepancies(status);
CREATE INDEX idx_discrepancies_created_at ON discrepancies(created_at);

-- ====================================
-- 4. purchase_orders 테이블 (발주서)
-- ====================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier VARCHAR(200),
    status VARCHAR(20) DEFAULT 'draft' CHECK (
        status IN ('draft', 'ordered', 'partial', 'completed', 'cancelled')
    ),
    total_amount DECIMAL(12,2) DEFAULT 0,
    expected_date DATE,
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- purchase_orders 인덱스
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_created_at ON purchase_orders(created_at);

-- ====================================
-- 5. purchase_order_items 테이블 (발주 상세)
-- ====================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
    received_quantity INTEGER DEFAULT 0 CHECK (received_quantity >= 0),
    unit_price DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (ordered_quantity * unit_price) STORED,
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'partial', 'received', 'cancelled')
    ),
    CONSTRAINT check_received_lte_ordered CHECK (received_quantity <= ordered_quantity)
);

-- purchase_order_items 인덱스
CREATE INDEX idx_purchase_order_items_po_id ON purchase_order_items(po_id);
CREATE INDEX idx_purchase_order_items_product_id ON purchase_order_items(product_id);
CREATE INDEX idx_purchase_order_items_status ON purchase_order_items(status);

-- ====================================
-- 6. daily_ledgers 테이블 (일일 수불부)
-- ====================================
CREATE TABLE IF NOT EXISTS daily_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_date DATE NOT NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    beginning_stock INTEGER NOT NULL,
    total_inbound INTEGER DEFAULT 0,
    total_outbound INTEGER DEFAULT 0,
    adjustments INTEGER DEFAULT 0,
    ending_stock INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ledger_date, product_id)
);

-- daily_ledgers 인덱스
CREATE INDEX idx_daily_ledgers_ledger_date ON daily_ledgers(ledger_date);
CREATE INDEX idx_daily_ledgers_product_id ON daily_ledgers(product_id);

-- ====================================
-- 7. product_bom 테이블 (BOM - 세트상품)
-- ====================================
CREATE TABLE IF NOT EXISTS product_bom (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    child_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_product_id, child_product_id),
    CONSTRAINT check_no_self_reference CHECK (parent_product_id != child_product_id)
);

-- product_bom 인덱스
CREATE INDEX idx_product_bom_parent_id ON product_bom(parent_product_id);
CREATE INDEX idx_product_bom_child_id ON product_bom(child_product_id);

-- ====================================
-- 8. 트리거 함수들
-- ====================================

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- products 테이블 업데이트 트리거
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- purchase_orders 테이블 업데이트 트리거
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- 9. 재고 업데이트 트리거
-- ====================================
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type IN ('inbound', 'return') THEN
        UPDATE products 
        SET current_stock = current_stock + NEW.quantity
        WHERE id = NEW.product_id;
    ELSIF NEW.transaction_type IN ('outbound') THEN
        UPDATE products 
        SET current_stock = current_stock - ABS(NEW.quantity)
        WHERE id = NEW.product_id;
    ELSIF NEW.transaction_type = 'adjustment' THEN
        UPDATE products 
        SET current_stock = NEW.new_stock
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- ====================================
-- 10. 발주서 상태 자동 업데이트 함수
-- ====================================
CREATE OR REPLACE FUNCTION update_purchase_order_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_items INTEGER;
    v_received_items INTEGER;
    v_partial_items INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'received' THEN 1 END),
        COUNT(CASE WHEN status = 'partial' THEN 1 END)
    INTO v_total_items, v_received_items, v_partial_items
    FROM purchase_order_items
    WHERE po_id = NEW.po_id;
    
    IF v_received_items = v_total_items THEN
        UPDATE purchase_orders SET status = 'completed' WHERE id = NEW.po_id;
    ELSIF v_received_items > 0 OR v_partial_items > 0 THEN
        UPDATE purchase_orders SET status = 'partial' WHERE id = NEW.po_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_po_status
AFTER UPDATE OF status ON purchase_order_items
FOR EACH ROW EXECUTE FUNCTION update_purchase_order_status();

-- ====================================
-- 11. 권한 설정
-- ====================================
-- 필요에 따라 역할과 권한 추가
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA playauto_platform TO playauto_user;
-- GRANT USAGE ON SCHEMA playauto_platform TO playauto_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA playauto_platform TO playauto_user;

-- ====================================
-- 12. 코멘트 추가
-- ====================================
COMMENT ON SCHEMA playauto_platform IS 'PLAYAUTO 재고 관리 시스템 스키마';
COMMENT ON TABLE products IS '제품 마스터 테이블';
COMMENT ON TABLE transactions IS '재고 트랜잭션 테이블';
COMMENT ON TABLE discrepancies IS '재고 불일치 추적 테이블';
COMMENT ON TABLE purchase_orders IS '발주서 테이블';
COMMENT ON TABLE purchase_order_items IS '발주 상세 테이블';
COMMENT ON TABLE daily_ledgers IS '일일 수불부 테이블';
COMMENT ON TABLE product_bom IS 'BOM (세트상품) 테이블';

-- 마이그레이션 완료 메시지
DO $$
BEGIN
    RAISE NOTICE 'PLAYAUTO 초기 스키마 생성 완료 (Version: 001)';
END $$;