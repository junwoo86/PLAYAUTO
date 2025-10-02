import psycopg2
from psycopg2 import sql
import os
from datetime import datetime

# 데이터베이스 연결 정보
DB_CONFIG = {
    'host': '15.164.112.237',
    'port': 5432,
    'database': 'dashboard',
    'user': 'postgres',
    'password': 'bico0211'
}

def run_migration():
    """창고 관리 마이그레이션 실행"""
    conn = None
    cursor = None
    
    try:
        # 데이터베이스 연결
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("=" * 80)
        print("PLAYAUTO 창고 관리 마이그레이션 실행")
        print(f"실행 시간: {datetime.now()}")
        print("=" * 80)
        
        # 1. warehouses 테이블 생성
        print("\n🚀 warehouses 테이블 생성 중...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS playauto_platform.warehouses (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                location VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ warehouses 테이블 생성 완료")
        
        # 2. 인덱스 추가
        print("\n🚀 인덱스 추가 중...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_warehouses_name ON playauto_platform.warehouses(name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON playauto_platform.warehouses(is_active)")
        print("✅ 인덱스 추가 완료")
        
        # 3. 기본 창고 데이터 삽입
        print("\n🚀 기본 창고 데이터 삽입 중...")
        cursor.execute("""
            INSERT INTO playauto_platform.warehouses (name, description, location, is_active)
            VALUES 
                ('본사 창고', '본사 메인 창고', '서울특별시 강남구', true),
                ('지점 창고', '지점 창고', '경기도 성남시', true)
            ON CONFLICT (name) DO NOTHING
        """)
        print("✅ 기본 창고 데이터 삽입 완료")
        
        # 4. products 테이블에 warehouse_id 컬럼 추가
        print("\n🚀 products 테이블에 warehouse_id 컬럼 추가 중...")
        cursor.execute("""
            ALTER TABLE playauto_platform.products
            ADD COLUMN IF NOT EXISTS warehouse_id UUID
        """)
        print("✅ warehouse_id 컬럼 추가 완료")
        
        # 5. 기본값 설정 (본사 창고로 설정)
        print("\n🚀 기존 제품들을 본사 창고로 설정 중...")
        cursor.execute("""
            UPDATE playauto_platform.products p
            SET warehouse_id = (SELECT id FROM playauto_platform.warehouses WHERE name = '본사 창고')
            WHERE warehouse_id IS NULL
        """)
        print("✅ 기본값 설정 완료")
        
        # 6. 외래키 제약 추가
        print("\n🚀 외래키 제약 추가 중...")
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'fk_products_warehouse'
                ) THEN
                    ALTER TABLE playauto_platform.products
                    ADD CONSTRAINT fk_products_warehouse
                    FOREIGN KEY (warehouse_id) REFERENCES playauto_platform.warehouses(id)
                    ON DELETE SET NULL;
                END IF;
            END $$;
        """)
        print("✅ 외래키 제약 추가 완료")
        
        # 7. warehouse_id에 인덱스 추가
        print("\n🚀 warehouse_id 인덱스 추가 중...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON playauto_platform.products(warehouse_id)")
        print("✅ warehouse_id 인덱스 추가 완료")
        
        # 8. updated_at 트리거 함수 생성
        print("\n🚀 트리거 함수 생성 중...")
        cursor.execute("""
            CREATE OR REPLACE FUNCTION playauto_platform.update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql
        """)
        print("✅ 트리거 함수 생성 완료")
        
        # 9. warehouses 테이블에 트리거 추가
        print("\n🚀 warehouses 테이블에 트리거 추가 중...")
        cursor.execute("DROP TRIGGER IF EXISTS update_warehouses_updated_at ON playauto_platform.warehouses")
        cursor.execute("""
            CREATE TRIGGER update_warehouses_updated_at
            BEFORE UPDATE ON playauto_platform.warehouses
            FOR EACH ROW
            EXECUTE FUNCTION playauto_platform.update_updated_at_column()
        """)
        print("✅ 트리거 추가 완료")
        
        # 10. 코멘트 추가
        print("\n🚀 테이블 및 컬럼 설명 추가 중...")
        cursor.execute("COMMENT ON TABLE playauto_platform.warehouses IS '창고 정보 테이블'")
        cursor.execute("COMMENT ON COLUMN playauto_platform.warehouses.id IS '창고 고유 ID'")
        cursor.execute("COMMENT ON COLUMN playauto_platform.warehouses.name IS '창고명'")
        cursor.execute("COMMENT ON COLUMN playauto_platform.warehouses.description IS '창고 설명'")
        cursor.execute("COMMENT ON COLUMN playauto_platform.warehouses.location IS '창고 위치'")
        cursor.execute("COMMENT ON COLUMN playauto_platform.warehouses.is_active IS '활성화 상태'")
        cursor.execute("COMMENT ON COLUMN playauto_platform.products.warehouse_id IS '창고 ID (FK)'")
        print("✅ 설명 추가 완료")
        
        # 변경사항 커밋
        conn.commit()
        
        # 결과 확인
        print("\n" + "=" * 80)
        print("✅ 마이그레이션 성공적으로 완료!")
        
        # 창고 데이터 확인
        cursor.execute("SELECT id, name, location FROM playauto_platform.warehouses")
        warehouses = cursor.fetchall()
        print(f"\n생성된 창고 목록:")
        for wh in warehouses:
            print(f"  - {wh[1]} (위치: {wh[2]})")
        
        # 제품 업데이트 확인
        cursor.execute("SELECT COUNT(*) FROM playauto_platform.products WHERE warehouse_id IS NOT NULL")
        count = cursor.fetchone()[0]
        print(f"\n창고가 할당된 제품 수: {count}개")
        
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ 마이그레이션 실패: {e}")
        if conn:
            conn.rollback()
        raise
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()