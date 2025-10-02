-- 서브메뉴 권한 추가
-- 개별 처리 서브메뉴
INSERT INTO playauto_platform.permissions (code, name, description, created_at)
VALUES
    ('receive', '입고', '입고 처리 권한', NOW()),
    ('dispatch', '출고', '출고 처리 권한', NOW()),
    ('adjustment', '재고 조정', '재고 조정 권한', NOW());

-- 분석 서브메뉴
INSERT INTO playauto_platform.permissions (code, name, description, created_at)
VALUES
    ('analysis-summary', '입출고 요약', '입출고 요약 분석 권한', NOW()),
    ('past-quantity', '과거 수량 조회', '과거 수량 조회 권한', NOW()),
    ('analysis-dashboard', '대시보드', '분석 대시보드 권한', NOW()),
    ('inventory-analysis', '재고 분석', '재고 분석 권한', NOW()),
    ('adjustment-analysis', '조정 이력 분석', '조정 이력 분석 권한', NOW()),
    ('sales-analysis', '매출 분석', '매출 분석 권한', NOW()),
    ('data-management', '데이터 관리', '데이터 관리 권한', NOW()),
    ('scheduler-monitoring', '스케줄러 모니터링', '스케줄러 모니터링 권한', NOW());

-- 시스템 관리자 그룹에 새로운 권한 할당
INSERT INTO playauto_platform.group_permissions (group_id, permission_id, created_at, created_by)
SELECT 1, id, NOW(), 'system'
FROM playauto_platform.permissions
WHERE code IN (
    'receive', 'dispatch', 'adjustment',
    'analysis-summary', 'past-quantity', 'analysis-dashboard',
    'inventory-analysis', 'adjustment-analysis', 'sales-analysis',
    'data-management', 'scheduler-monitoring'
);