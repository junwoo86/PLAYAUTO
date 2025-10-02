#!/usr/bin/env python3
"""
데이터베이스 인덱스 최적화 스크립트
성능 향상을 위한 인덱스 생성 및 관리
"""

import psycopg2
from psycopg2 import sql
from datetime import datetime
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import settings


def create_connection():
    """데이터베이스 연결 생성"""
    return psycopg2.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME
    )


def check_index_exists(cursor, index_name):
    """인덱스 존재 여부 확인"""
    cursor.execute("""
        SELECT EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'playauto_platform'
            AND indexname = %s
        )
    """, (index_name,))
    return cursor.fetchone()[0]


def create_index(cursor, index_name, table_name, columns, unique=False, where_clause=None):
    """인덱스 생성"""
    if check_index_exists(cursor, index_name):
        print(f"  ⏭️  인덱스 이미 존재: {index_name}")
        return False

    try:
        unique_str = "UNIQUE" if unique else ""
        where_str = f"WHERE {where_clause}" if where_clause else ""
        columns_str = columns if isinstance(columns, str) else ", ".join(columns)

        query = f"""
            CREATE {unique_str} INDEX CONCURRENTLY IF NOT EXISTS {index_name}
            ON playauto_platform.{table_name} ({columns_str})
            {where_str}
        """

        cursor.execute(query)
        print(f"  ✅ 인덱스 생성 완료: {index_name}")
        return True
    except Exception as e:
        print(f"  ❌ 인덱스 생성 실패 {index_name}: {e}")
        return False


def analyze_table(cursor, table_name):
    """테이블 통계 업데이트"""
    try:
        cursor.execute(f"ANALYZE playauto_platform.{table_name}")
        print(f"  📊 테이블 분석 완료: {table_name}")
    except Exception as e:
        print(f"  ❌ 테이블 분석 실패 {table_name}: {e}")


def optimize_indexes():
    """인덱스 최적화 실행"""
    print("=" * 60)
    print("🚀 데이터베이스 인덱스 최적화 시작")
    print(f"⏰ 시작 시간: {datetime.now()}")
    print("=" * 60)

    conn = create_connection()
    cursor = conn.cursor()

    try:
        # 인덱스 정의
        indexes = [
            # Products 테이블
            {
                "name": "idx_products_category",
                "table": "products",
                "columns": "category",
                "description": "카테고리별 제품 조회 최적화"
            },
            {
                "name": "idx_products_is_active",
                "table": "products",
                "columns": "is_active",
                "where": "is_active = true",
                "description": "활성 제품 필터링 최적화"
            },
            {
                "name": "idx_products_warehouse_id",
                "table": "products",
                "columns": "warehouse_id",
                "description": "창고별 제품 조회 최적화"
            },
            {
                "name": "idx_products_safety_stock",
                "table": "products",
                "columns": ["current_stock", "safety_stock"],
                "description": "재고 부족 제품 조회 최적화"
            },

            # Transactions 테이블
            {
                "name": "idx_transactions_type_date",
                "table": "transactions",
                "columns": ["transaction_type", "transaction_date"],
                "description": "거래 타입 및 날짜별 조회 최적화"
            },
            {
                "name": "idx_transactions_product_code",
                "table": "transactions",
                "columns": "product_code",
                "description": "제품별 거래 조회 최적화"
            },
            {
                "name": "idx_transactions_created_at",
                "table": "transactions",
                "columns": "created_at",
                "description": "생성일 기준 조회 최적화"
            },
            {
                "name": "idx_transactions_affects_stock",
                "table": "transactions",
                "columns": "affects_current_stock",
                "where": "affects_current_stock = true",
                "description": "재고 영향 거래 조회 최적화"
            },
            {
                "name": "idx_transactions_checkpoint_id",
                "table": "transactions",
                "columns": "checkpoint_id",
                "where": "checkpoint_id IS NOT NULL",
                "description": "체크포인트 관련 거래 조회 최적화"
            },

            # Daily Ledgers 테이블
            {
                "name": "idx_daily_ledgers_date",
                "table": "daily_ledgers",
                "columns": "ledger_date",
                "description": "날짜별 수불부 조회 최적화"
            },
            {
                "name": "idx_daily_ledgers_product_date",
                "table": "daily_ledgers",
                "columns": ["product_code", "ledger_date"],
                "unique": True,
                "description": "제품별 일일 수불부 유니크 인덱스"
            },

            # Purchase Orders 테이블
            {
                "name": "idx_purchase_orders_status",
                "table": "purchase_orders",
                "columns": "status",
                "description": "발주 상태별 조회 최적화"
            },
            {
                "name": "idx_purchase_orders_supplier",
                "table": "purchase_orders",
                "columns": "supplier",
                "description": "공급업체별 발주 조회 최적화"
            },
            {
                "name": "idx_purchase_orders_expected_date",
                "table": "purchase_orders",
                "columns": "expected_date",
                "description": "예정일별 발주 조회 최적화"
            },

            # Purchase Order Items 테이블
            {
                "name": "idx_po_items_po_id",
                "table": "purchase_order_items",
                "columns": "po_id",
                "description": "발주서별 아이템 조회 최적화"
            },
            {
                "name": "idx_po_items_product_code",
                "table": "purchase_order_items",
                "columns": "product_code",
                "description": "제품별 발주 아이템 조회 최적화"
            },

            # Discrepancies 테이블
            {
                "name": "idx_discrepancies_status",
                "table": "discrepancies",
                "columns": "status",
                "description": "불일치 상태별 조회 최적화"
            },
            {
                "name": "idx_discrepancies_product_code",
                "table": "discrepancies",
                "columns": "product_code",
                "description": "제품별 불일치 조회 최적화"
            },

            # Stock Checkpoints 테이블
            {
                "name": "idx_checkpoints_product_date",
                "table": "stock_checkpoints",
                "columns": ["product_code", "checkpoint_date"],
                "description": "제품 및 날짜별 체크포인트 조회 최적화"
            },
            {
                "name": "idx_checkpoints_type",
                "table": "stock_checkpoints",
                "columns": "checkpoint_type",
                "description": "체크포인트 타입별 조회 최적화"
            },
            {
                "name": "idx_checkpoints_active",
                "table": "stock_checkpoints",
                "columns": "is_active",
                "where": "is_active = true",
                "description": "활성 체크포인트 조회 최적화"
            },

            # Users 테이블
            {
                "name": "idx_users_email",
                "table": "users",
                "columns": "email",
                "unique": True,
                "description": "이메일 기반 사용자 조회 최적화"
            },
            {
                "name": "idx_users_status",
                "table": "users",
                "columns": "status",
                "description": "사용자 상태별 조회 최적화"
            },
            {
                "name": "idx_users_group_id",
                "table": "users",
                "columns": "group_id",
                "description": "그룹별 사용자 조회 최적화"
            },

            # Audit Logs 테이블
            {
                "name": "idx_audit_logs_user_email",
                "table": "audit_logs",
                "columns": "user_email",
                "description": "사용자별 감사 로그 조회 최적화"
            },
            {
                "name": "idx_audit_logs_action",
                "table": "audit_logs",
                "columns": "action",
                "description": "액션별 감사 로그 조회 최적화"
            },
            {
                "name": "idx_audit_logs_entity",
                "table": "audit_logs",
                "columns": ["entity_type", "entity_id"],
                "description": "엔티티별 감사 로그 조회 최적화"
            },
            {
                "name": "idx_audit_logs_created_at",
                "table": "audit_logs",
                "columns": "created_at",
                "description": "생성일 기준 감사 로그 조회 최적화"
            },

            # Scheduler Logs 테이블
            {
                "name": "idx_scheduler_logs_job_name",
                "table": "scheduler_logs",
                "columns": "job_name",
                "description": "작업명별 스케줄러 로그 조회 최적화"
            },
            {
                "name": "idx_scheduler_logs_status",
                "table": "scheduler_logs",
                "columns": "status",
                "description": "상태별 스케줄러 로그 조회 최적화"
            },
            {
                "name": "idx_scheduler_logs_execution_time",
                "table": "scheduler_logs",
                "columns": "execution_time",
                "description": "실행 시간별 스케줄러 로그 조회 최적화"
            }
        ]

        created_count = 0
        skipped_count = 0

        print("\n📋 인덱스 생성 시작")
        print("-" * 60)

        for index_info in indexes:
            print(f"\n🔧 {index_info['description']}")
            created = create_index(
                cursor,
                index_info["name"],
                index_info["table"],
                index_info["columns"],
                unique=index_info.get("unique", False),
                where_clause=index_info.get("where")
            )

            if created:
                created_count += 1
            else:
                skipped_count += 1

            conn.commit()

        print("\n" + "=" * 60)
        print("📊 테이블 통계 업데이트")
        print("-" * 60)

        # 모든 테이블 분석
        tables = [
            "products", "transactions", "daily_ledgers",
            "purchase_orders", "purchase_order_items",
            "discrepancies", "stock_checkpoints",
            "users", "groups", "permissions",
            "audit_logs", "scheduler_logs", "warehouses"
        ]

        for table in tables:
            analyze_table(cursor, table)
            conn.commit()

        print("\n" + "=" * 60)
        print("✅ 인덱스 최적화 완료!")
        print(f"  - 생성된 인덱스: {created_count}개")
        print(f"  - 건너뛴 인덱스: {skipped_count}개")
        print(f"  - 분석된 테이블: {len(tables)}개")
        print(f"⏰ 완료 시간: {datetime.now()}")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def drop_unused_indexes():
    """사용되지 않는 인덱스 확인"""
    conn = create_connection()
    cursor = conn.cursor()

    try:
        # 사용되지 않는 인덱스 조회
        query = """
            SELECT
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE schemaname = 'playauto_platform'
            AND idx_scan = 0
            AND indexrelname NOT LIKE 'pg_%'
            ORDER BY pg_relation_size(indexrelid) DESC
        """

        cursor.execute(query)
        unused_indexes = cursor.fetchall()

        if unused_indexes:
            print("\n⚠️  사용되지 않는 인덱스 발견:")
            print("-" * 60)
            for idx in unused_indexes:
                print(f"  - {idx[2]} (테이블: {idx[1]}, 크기: {idx[6]})")
            print("\n💡 제거를 고려해보세요: DROP INDEX playauto_platform.index_name;")
        else:
            print("\n✅ 모든 인덱스가 사용되고 있습니다.")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    try:
        # 인덱스 최적화 실행
        optimize_indexes()

        # 사용되지 않는 인덱스 확인
        print("\n" + "=" * 60)
        print("🔍 사용되지 않는 인덱스 확인")
        print("=" * 60)
        drop_unused_indexes()

    except Exception as e:
        print(f"\n❌ 스크립트 실행 실패: {e}")
        sys.exit(1)