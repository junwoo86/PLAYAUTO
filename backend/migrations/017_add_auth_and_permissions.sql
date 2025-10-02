-- 017_add_auth_and_permissions.sql
-- 인증 및 권한 시스템 추가
-- 실행일: 2025-09-19

-- ============================================
-- 1. 그룹 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS playauto_platform.groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 사용자 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS playauto_platform.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    group_id INTEGER REFERENCES playauto_platform.groups(id),
    last_login TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 테이블 인덱스
CREATE INDEX idx_users_email ON playauto_platform.users(email);
CREATE INDEX idx_users_status ON playauto_platform.users(status);
CREATE INDEX idx_users_group_id ON playauto_platform.users(group_id);

-- ============================================
-- 3. 권한 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS playauto_platform.permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. 그룹-권한 매핑 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS playauto_platform.group_permissions (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES playauto_platform.groups(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES playauto_platform.permissions(id) ON DELETE CASCADE,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, permission_id)
);

-- 그룹-권한 매핑 인덱스
CREATE INDEX idx_group_permissions_group_id ON playauto_platform.group_permissions(group_id);
CREATE INDEX idx_group_permissions_permission_id ON playauto_platform.group_permissions(permission_id);

-- ============================================
-- 5. 알림 설정 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS playauto_platform.notification_settings (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES playauto_platform.groups(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'low_stock_alert',
        'order_status_change',
        'daily_report',
        'system_error'
    )),
    is_enabled BOOLEAN DEFAULT TRUE,
    updated_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, notification_type)
);

-- 알림 설정 인덱스
CREATE INDEX idx_notification_settings_group_id ON playauto_platform.notification_settings(group_id);

-- ============================================
-- 6. 감사 로그 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS playauto_platform.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 감사 로그 인덱스
CREATE INDEX idx_audit_logs_user_email ON playauto_platform.audit_logs(user_email);
CREATE INDEX idx_audit_logs_action ON playauto_platform.audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON playauto_platform.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON playauto_platform.audit_logs(created_at);

-- ============================================
-- 7. 리프레시 토큰 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS playauto_platform.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES playauto_platform.users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 리프레시 토큰 인덱스
CREATE INDEX idx_refresh_tokens_user_id ON playauto_platform.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON playauto_platform.refresh_tokens(expires_at);

-- ============================================
-- 8. 기존 테이블에 created_by, updated_by 필드 추가
-- ============================================

-- products 테이블
ALTER TABLE playauto_platform.products
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- transactions 테이블 (created_by가 이미 있음 - VARCHAR(100)에서 VARCHAR(255)로 확장)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'playauto_platform'
        AND table_name = 'transactions'
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE playauto_platform.transactions
        ALTER COLUMN created_by TYPE VARCHAR(255);
    ELSE
        ALTER TABLE playauto_platform.transactions
        ADD COLUMN created_by VARCHAR(255);
    END IF;
END $$;

-- warehouses 테이블
ALTER TABLE playauto_platform.warehouses
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- purchase_orders 테이블 (created_by가 이미 있음 - VARCHAR(100)에서 VARCHAR(255)로 확장)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'playauto_platform'
        AND table_name = 'purchase_orders'
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE playauto_platform.purchase_orders
        ALTER COLUMN created_by TYPE VARCHAR(255);
    END IF;
END $$;

ALTER TABLE playauto_platform.purchase_orders
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- daily_ledgers 테이블
ALTER TABLE playauto_platform.daily_ledgers
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- stock_checkpoints 테이블 (created_by가 이미 있음 - VARCHAR(100)에서 VARCHAR(255)로 확장)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'playauto_platform'
        AND table_name = 'stock_checkpoints'
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE playauto_platform.stock_checkpoints
        ALTER COLUMN created_by TYPE VARCHAR(255);
    END IF;
END $$;

-- ============================================
-- 9. 초기 데이터 삽입
-- ============================================

-- 기본 권한 삽입
INSERT INTO playauto_platform.permissions (code, name, description) VALUES
    ('dashboard', '대시보드', '대시보드 접근 권한'),
    ('products', '제품 관리', '제품 목록 및 관리 권한'),
    ('batch-process', '일괄 처리', '일괄 처리 권한'),
    ('individual-process', '개별 처리', '입고/출고/조정 권한'),
    ('return-management', '반품 관리', '취소 및 반품 관리 권한'),
    ('warehouses', '창고 관리', '창고 관리 권한'),
    ('transfer', '제품 이동', '제품 위치 이동 권한'),
    ('daily-closing', '일일 수불부', '일일 수불부 권한'),
    ('stock-alert', '재고 알림', '재고 부족 알림 권한'),
    ('purchase-order', '발주 관리', '발주 상태 관리 권한'),
    ('history', '히스토리', '히스토리 조회 권한'),
    ('analysis', '분석', '분석 도구 접근 권한'),
    ('settings', '설정', '시스템 설정 관리 권한')
ON CONFLICT (code) DO NOTHING;

-- 기본 그룹 생성
INSERT INTO playauto_platform.groups (name, description, created_by) VALUES
    ('시스템 관리자', '모든 권한을 가진 관리자 그룹', 'system'),
    ('재고 관리팀', '재고 관리 전담 팀', 'system'),
    ('일반 사용자', '기본 권한만 가진 사용자 그룹', 'system')
ON CONFLICT (name) DO NOTHING;

-- 시스템 관리자 그룹에 모든 권한 부여
INSERT INTO playauto_platform.group_permissions (group_id, permission_id, created_by)
SELECT
    g.id as group_id,
    p.id as permission_id,
    'system' as created_by
FROM playauto_platform.groups g
CROSS JOIN playauto_platform.permissions p
WHERE g.name = '시스템 관리자'
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- 재고 관리팀 그룹에 권한 부여
INSERT INTO playauto_platform.group_permissions (group_id, permission_id, created_by)
SELECT
    g.id as group_id,
    p.id as permission_id,
    'system' as created_by
FROM playauto_platform.groups g
CROSS JOIN playauto_platform.permissions p
WHERE g.name = '재고 관리팀'
AND p.code IN ('dashboard', 'products', 'batch-process', 'individual-process',
               'warehouses', 'transfer', 'daily-closing', 'stock-alert', 'history')
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- 일반 사용자 그룹에 권한 부여
INSERT INTO playauto_platform.group_permissions (group_id, permission_id, created_by)
SELECT
    g.id as group_id,
    p.id as permission_id,
    'system' as created_by
FROM playauto_platform.groups g
CROSS JOIN playauto_platform.permissions p
WHERE g.name = '일반 사용자'
AND p.code IN ('dashboard', 'products', 'history')
ON CONFLICT (group_id, permission_id) DO NOTHING;

-- 기본 알림 설정 생성 (모든 그룹에 대해)
INSERT INTO playauto_platform.notification_settings (group_id, notification_type, is_enabled, updated_by)
SELECT
    g.id as group_id,
    nt.notification_type,
    CASE
        WHEN g.name = '시스템 관리자' THEN true
        WHEN g.name = '재고 관리팀' AND nt.notification_type IN ('low_stock_alert', 'order_status_change') THEN true
        ELSE false
    END as is_enabled,
    'system' as updated_by
FROM playauto_platform.groups g
CROSS JOIN (
    VALUES
        ('low_stock_alert'),
        ('order_status_change'),
        ('daily_report'),
        ('system_error')
) as nt(notification_type)
ON CONFLICT (group_id, notification_type) DO NOTHING;

-- ============================================
-- 10. 업데이트 트리거 생성
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION playauto_platform.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 생성
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON playauto_platform.users
    FOR EACH ROW EXECUTE FUNCTION playauto_platform.update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON playauto_platform.groups
    FOR EACH ROW EXECUTE FUNCTION playauto_platform.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON playauto_platform.notification_settings
    FOR EACH ROW EXECUTE FUNCTION playauto_platform.update_updated_at_column();

-- ============================================
-- 11. 기본 관리자 계정 생성 (옵션)
-- ============================================
-- 주의: 실제 환경에서는 비밀번호를 안전하게 해시화해야 합니다
-- 여기서는 예시로 bcrypt 해시를 사용합니다 (실제 해시값 필요)
-- password: admin123 (변경 필요)
INSERT INTO playauto_platform.users (email, password_hash, name, status, group_id, created_by)
SELECT
    'admin@playauto.com',
    '$2b$12$Q8Mfc11i9nKX5PKDXAad.OZV1AOhTBVPANZExaTTJlD/4jrAZZ/26', -- bcrypt hash of 'admin123'
    '시스템 관리자',
    'active',
    g.id,
    'system'
FROM playauto_platform.groups g
WHERE g.name = '시스템 관리자'
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE playauto_platform.users IS '사용자 관리 테이블';
COMMENT ON TABLE playauto_platform.groups IS '사용자 그룹 관리 테이블';
COMMENT ON TABLE playauto_platform.permissions IS '시스템 권한 정의 테이블';
COMMENT ON TABLE playauto_platform.group_permissions IS '그룹별 권한 매핑 테이블';
COMMENT ON TABLE playauto_platform.notification_settings IS '그룹별 알림 설정 테이블';
COMMENT ON TABLE playauto_platform.audit_logs IS '감사 로그 테이블';
COMMENT ON TABLE playauto_platform.refresh_tokens IS 'JWT 리프레시 토큰 관리 테이블';

-- 마이그레이션 완료
DO $$
BEGIN
    RAISE NOTICE '인증 및 권한 시스템 마이그레이션 완료';
END $$;