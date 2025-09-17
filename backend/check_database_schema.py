#!/usr/bin/env python3
"""데이터베이스 스키마 확인 스크립트"""
import psycopg2
from psycopg2 import sql
from datetime import datetime

# 데이터베이스 연결 설정
conn_params = {
    'host': '15.164.112.237',
    'port': 5432,
    'database': 'dashboard',
    'user': 'postgres',
    'password': 'bico0211'
}

def check_database_schema():
    """데이터베이스 스키마 확인"""
    try:
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        print("=" * 80)
        print(f"데이터베이스 스키마 확인 - {datetime.now()}")
        print("=" * 80)

        # 1. 테이블 목록 확인
        print("\n## 1. playauto_platform 스키마의 테이블 목록")
        print("-" * 50)
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'playauto_platform'
            ORDER BY table_name
        """)
        tables = cur.fetchall()
        for table in tables:
            print(f"  - {table[0]}")

        # 2. 각 테이블의 레코드 수 확인
        print("\n## 2. 테이블별 레코드 수")
        print("-" * 50)
        for table in tables:
            table_name = table[0]
            cur.execute(sql.SQL("SELECT COUNT(*) FROM playauto_platform.{}").format(
                sql.Identifier(table_name)
            ))
            count = cur.fetchone()[0]
            print(f"  - {table_name}: {count:,} 건")

        # 3. daily_ledgers 최근 데이터 확인
        print("\n## 3. daily_ledgers 최근 데이터")
        print("-" * 50)
        cur.execute("""
            SELECT MIN(ledger_date) as first_date,
                   MAX(ledger_date) as last_date,
                   COUNT(DISTINCT ledger_date) as total_days,
                   COUNT(*) as total_records
            FROM playauto_platform.daily_ledgers
        """)
        result = cur.fetchone()
        if result[0]:
            print(f"  - 첫 데이터: {result[0]}")
            print(f"  - 마지막 데이터: {result[1]}")
            print(f"  - 총 일수: {result[2]} 일")
            print(f"  - 총 레코드: {result[3]:,} 건")
        else:
            print("  - 데이터 없음")

        # 4. scheduler_logs 최근 실행 확인
        print("\n## 4. scheduler_logs 최근 실행 기록")
        print("-" * 50)
        cur.execute("""
            SELECT job_name, status, COUNT(*) as count
            FROM playauto_platform.scheduler_logs
            WHERE execution_time >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY job_name, status
            ORDER BY job_name, status
        """)
        results = cur.fetchall()
        if results:
            for row in results:
                print(f"  - {row[0]} ({row[1]}): {row[2]} 건")
        else:
            print("  - 최근 7일간 실행 기록 없음")

        # 5. product_bom 데이터 확인
        print("\n## 5. product_bom (BOM) 데이터")
        print("-" * 50)
        cur.execute("""
            SELECT parent_product_code, child_product_code, quantity
            FROM playauto_platform.product_bom
            ORDER BY parent_product_code
        """)
        bom_data = cur.fetchall()
        if bom_data:
            for row in bom_data:
                print(f"  - {row[0]} → {row[1]} (수량: {row[2]})")
        else:
            print("  - BOM 데이터 없음")

        # 6. discrepancies 상태 확인
        print("\n## 6. discrepancies (재고 불일치) 상태")
        print("-" * 50)
        cur.execute("""
            SELECT status, COUNT(*) as count
            FROM playauto_platform.discrepancies
            GROUP BY status
            ORDER BY status
        """)
        results = cur.fetchall()
        if results:
            for row in results:
                print(f"  - {row[0]}: {row[1]} 건")
        else:
            print("  - 불일치 데이터 없음")

        # 7. transactions 테이블의 제약조건 확인
        print("\n## 7. transactions 테이블 외래키 제약조건")
        print("-" * 50)
        cur.execute("""
            SELECT
                conname as constraint_name,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint
            WHERE conrelid = 'playauto_platform.transactions'::regclass
            AND contype = 'f'
            ORDER BY conname
        """)
        constraints = cur.fetchall()
        if constraints:
            for constraint in constraints:
                print(f"  - {constraint[0]}")
                print(f"    {constraint[1]}")
        else:
            print("  - 외래키 제약조건 없음")

        cur.close()
        conn.close()

        print("\n" + "=" * 80)
        print("스키마 확인 완료")
        print("=" * 80)

    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    check_database_schema()