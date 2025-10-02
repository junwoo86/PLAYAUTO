#!/usr/bin/env python3
"""
마이그레이션 015 실행: products 테이블에 memo 컬럼 추가
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv
from pathlib import Path

# 환경 변수 로드
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# 데이터베이스 연결 정보
DB_CONFIG = {
    'host': '15.164.112.237',
    'port': 5432,
    'database': 'dashboard',
    'user': 'postgres',
    'password': 'bico0211'
}

def run_migration():
    """마이그레이션 실행"""
    conn = None
    cur = None

    try:
        # 데이터베이스 연결
        print("데이터베이스에 연결 중...")
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()

        # 마이그레이션 파일 읽기
        migration_file = Path(__file__).parent / 'migrations' / '015_add_memo_column.sql'
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        # 마이그레이션 실행
        print("마이그레이션 실행 중...")
        cur.execute(migration_sql)

        # 변경사항 커밋
        conn.commit()
        print("✅ 마이그레이션 성공적으로 완료!")

        # 컬럼 확인
        print("\n현재 products 테이블 컬럼 확인:")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'playauto_platform'
            AND table_name = 'products'
            AND column_name = 'memo'
            ORDER BY ordinal_position;
        """)

        columns = cur.fetchall()
        for col in columns:
            print(f"  - {col[0]}: {col[1]}")

    except Exception as e:
        print(f"❌ 마이그레이션 실패: {e}")
        if conn:
            conn.rollback()
        raise

    finally:
        # 연결 종료
        if cur:
            cur.close()
        if conn:
            conn.close()
        print("\n데이터베이스 연결 종료")

if __name__ == "__main__":
    run_migration()