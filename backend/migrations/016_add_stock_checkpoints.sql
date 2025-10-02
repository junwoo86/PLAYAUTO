-- 016_add_stock_checkpoints.sql
-- 재고 체크포인트 시스템 구현
-- 재고 조정, 일일 마감 등의 시점에서 재고를 확정하여 무결성 유지

-- 1. stock_checkpoints 테이블 생성
CREATE TABLE IF NOT EXISTS playauto_platform.stock_checkpoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL,
    checkpoint_date TIMESTAMP NOT NULL,
    checkpoint_type VARCHAR(20) NOT NULL CHECK (checkpoint_type IN ('ADJUST', 'DAILY_CLOSE', 'MONTHLY')),
    confirmed_stock INTEGER NOT NULL,
    reason TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- 외래키 제약
    CONSTRAINT fk_checkpoint_product
        FOREIGN KEY (product_code)
        REFERENCES playauto_platform.products(product_code)
        ON DELETE CASCADE,

    -- 인덱스
    CONSTRAINT idx_checkpoint_product_date
        UNIQUE (product_code, checkpoint_date, checkpoint_type)
);

-- 2. transactions 테이블에 체크포인트 관련 필드 추가
ALTER TABLE playauto_platform.transactions
ADD COLUMN IF NOT EXISTS affects_current_stock BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS checkpoint_id UUID,
ADD CONSTRAINT fk_transaction_checkpoint
    FOREIGN KEY (checkpoint_id)
    REFERENCES playauto_platform.stock_checkpoints(id)
    ON DELETE SET NULL;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_checkpoint_product_active
    ON playauto_platform.stock_checkpoints(product_code, is_active);

CREATE INDEX IF NOT EXISTS idx_checkpoint_date
    ON playauto_platform.stock_checkpoints(checkpoint_date DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_affects_stock
    ON playauto_platform.transactions(affects_current_stock);

CREATE INDEX IF NOT EXISTS idx_transaction_checkpoint
    ON playauto_platform.transactions(checkpoint_id);

-- 4. 기존 데이터 마이그레이션
-- 기존 모든 거래는 재고에 영향을 준 것으로 간주
UPDATE playauto_platform.transactions
SET affects_current_stock = TRUE
WHERE affects_current_stock IS NULL;

-- 5. 코멘트 추가
COMMENT ON TABLE playauto_platform.stock_checkpoints IS '재고 체크포인트 테이블 - 재고 확정 시점 관리';
COMMENT ON COLUMN playauto_platform.stock_checkpoints.checkpoint_type IS '체크포인트 유형: ADJUST(재고조정), DAILY_CLOSE(일일마감), MONTHLY(월말결산)';
COMMENT ON COLUMN playauto_platform.stock_checkpoints.confirmed_stock IS '체크포인트 시점의 확정 재고량';
COMMENT ON COLUMN playauto_platform.transactions.affects_current_stock IS '현재 재고에 영향 여부 (체크포인트 이전 거래는 FALSE)';
COMMENT ON COLUMN playauto_platform.transactions.checkpoint_id IS '관련 체크포인트 ID';