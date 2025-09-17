#!/usr/bin/env python3
"""
Daily Ledger 자동화 스크립트
매일 자정에 실행되어 전날의 거래 내역을 집계하여 일일 수불부를 생성
"""

import psycopg2
from datetime import datetime, timedelta, date
import uuid
import sys
import argparse
from typing import Optional, List, Tuple

def get_db_connection():
    """데이터베이스 연결"""
    return psycopg2.connect(
        host="15.164.112.237",
        port=5432,
        user="postgres",
        password="bico0211",
        database="dashboard"
    )

def get_products(conn) -> List[Tuple]:
    """활성 제품 목록 조회"""
    cursor = conn.cursor()
    query = """
    SELECT product_code, product_name, current_stock
    FROM playauto_platform.products
    WHERE is_active = true
    ORDER BY product_code
    """
    cursor.execute(query)
    return cursor.fetchall()

def check_existing_ledger(conn, ledger_date: date, product_code: str) -> bool:
    """특정 날짜와 제품의 수불부 존재 여부 확인"""
    cursor = conn.cursor()
    query = """
    SELECT COUNT(*) 
    FROM playauto_platform.daily_ledgers
    WHERE ledger_date = %s AND product_code = %s
    """
    cursor.execute(query, (ledger_date, product_code))
    count = cursor.fetchone()[0]
    return count > 0

def get_beginning_stock(conn, product_code: str, ledger_date: date) -> int:
    """기초 재고 계산 (전일 기말 재고 또는 최초 재고)"""
    cursor = conn.cursor()
    
    # 전일 수불부에서 기말 재고 조회
    previous_date = ledger_date - timedelta(days=1)
    query = """
    SELECT ending_stock
    FROM playauto_platform.daily_ledgers
    WHERE product_code = %s AND ledger_date = %s
    """
    cursor.execute(query, (product_code, previous_date))
    result = cursor.fetchone()
    
    if result:
        return result[0]
    
    # 전일 수불부가 없으면 해당 날짜 이전의 모든 거래 합산
    query = """
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN transaction_type = 'IN' THEN quantity
                WHEN transaction_type = 'OUT' THEN -quantity
                WHEN transaction_type = 'ADJUST' THEN 
                    CASE 
                        WHEN new_stock > previous_stock THEN (new_stock - previous_stock)
                        ELSE -(previous_stock - new_stock)
                    END
                ELSE 0
            END
        ), 0) as stock_change
    FROM playauto_platform.transactions
    WHERE product_code = %s 
    AND DATE(transaction_date) < %s
    """
    cursor.execute(query, (product_code, ledger_date))
    result = cursor.fetchone()
    
    return result[0] if result[0] else 0

def get_daily_transactions(conn, product_code: str, ledger_date: date) -> dict:
    """특정 날짜의 거래 내역 집계"""
    cursor = conn.cursor()
    query = """
    SELECT 
        transaction_type,
        SUM(quantity) as total_quantity,
        SUM(
            CASE 
                WHEN transaction_type = 'ADJUST' THEN 
                    CASE 
                        WHEN new_stock > previous_stock THEN (new_stock - previous_stock)
                        ELSE -(previous_stock - new_stock)
                    END
                ELSE 0
            END
        ) as adjustment_amount
    FROM playauto_platform.transactions
    WHERE product_code = %s 
    AND DATE(transaction_date) = %s
    GROUP BY transaction_type
    """
    cursor.execute(query, (product_code, ledger_date))
    
    result = {
        'total_inbound': 0,
        'total_outbound': 0,
        'adjustments': 0
    }
    
    for row in cursor.fetchall():
        transaction_type, total_quantity, adjustment_amount = row
        if transaction_type == 'IN':
            result['total_inbound'] = total_quantity
        elif transaction_type == 'OUT':
            result['total_outbound'] = total_quantity
        elif transaction_type == 'ADJUST':
            result['adjustments'] = adjustment_amount
    
    return result

def create_daily_ledger(conn, ledger_date: date, product_code: str, 
                       beginning_stock: int, transactions: dict) -> None:
    """일일 수불부 생성"""
    cursor = conn.cursor()
    
    # 기말 재고 계산
    ending_stock = (beginning_stock + 
                   transactions['total_inbound'] - 
                   transactions['total_outbound'] + 
                   transactions['adjustments'])
    
    # 수불부 레코드 생성
    insert_query = """
    INSERT INTO playauto_platform.daily_ledgers (
        id, ledger_date, product_code, beginning_stock,
        total_inbound, total_outbound, adjustments, ending_stock,
        created_at, updated_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
    )
    """
    
    cursor.execute(insert_query, (
        str(uuid.uuid4()),  # UUID를 문자열로 변환
        ledger_date,
        product_code,
        beginning_stock,
        transactions['total_inbound'],
        transactions['total_outbound'],
        transactions['adjustments'],
        ending_stock,
        datetime.now(),
        datetime.now()
    ))

def process_daily_ledger(conn, target_date: Optional[date] = None, 
                        force: bool = False) -> dict:
    """일일 수불부 처리"""
    # 대상 날짜 설정 (기본: 어제)
    if target_date is None:
        target_date = date.today() - timedelta(days=1)
    
    print(f"\n📅 처리 날짜: {target_date}")
    
    # 제품 목록 조회
    products = get_products(conn)
    print(f"📦 처리할 제품 수: {len(products)}개")
    
    results = {
        'created': 0,
        'skipped': 0,
        'errors': 0
    }
    
    for product_code, product_name, current_stock in products:
        try:
            # 이미 존재하는지 확인
            if check_existing_ledger(conn, target_date, product_code) and not force:
                results['skipped'] += 1
                continue
            
            # 기초 재고 계산
            beginning_stock = get_beginning_stock(conn, product_code, target_date)
            
            # 거래 내역 집계
            transactions = get_daily_transactions(conn, product_code, target_date)
            
            # 거래가 없어도 수불부 생성 (재고 추적을 위해)
            create_daily_ledger(conn, target_date, product_code, 
                              beginning_stock, transactions)
            
            results['created'] += 1
            
        except Exception as e:
            print(f"  ❌ 오류 ({product_code}): {e}")
            results['errors'] += 1
    
    conn.commit()
    return results

def backfill_missing_ledgers(conn, start_date: date, end_date: date) -> None:
    """누락된 일일 수불부 백필"""
    print(f"\n🔄 백필 시작: {start_date} ~ {end_date}")
    
    current_date = start_date
    while current_date <= end_date:
        print(f"\n처리 중: {current_date}")
        results = process_daily_ledger(conn, current_date)
        print(f"  ✅ 생성: {results['created']}, 건너뜀: {results['skipped']}, 오류: {results['errors']}")
        current_date += timedelta(days=1)

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='Daily Ledger 자동화 시스템')
    parser.add_argument('--date', type=str, help='처리할 날짜 (YYYY-MM-DD)')
    parser.add_argument('--backfill', action='store_true', 
                       help='누락된 데이터 백필')
    parser.add_argument('--start-date', type=str, 
                       help='백필 시작 날짜 (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, 
                       help='백필 종료 날짜 (YYYY-MM-DD)')
    parser.add_argument('--force', action='store_true', 
                       help='기존 데이터 덮어쓰기')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("📊 Daily Ledger 자동화 시스템")
    print(f"실행 시간: {datetime.now()}")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        if args.backfill:
            # 백필 모드
            if not args.start_date or not args.end_date:
                print("❌ 백필 모드에서는 --start-date와 --end-date가 필요합니다")
                sys.exit(1)
            
            start_date = datetime.strptime(args.start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(args.end_date, '%Y-%m-%d').date()
            
            backfill_missing_ledgers(conn, start_date, end_date)
            
        else:
            # 일반 처리 모드
            target_date = None
            if args.date:
                target_date = datetime.strptime(args.date, '%Y-%m-%d').date()
            
            results = process_daily_ledger(conn, target_date, args.force)
            
            print(f"\n📊 처리 결과:")
            print(f"  ✅ 생성: {results['created']}건")
            print(f"  ⏭️ 건너뜀: {results['skipped']}건")
            print(f"  ❌ 오류: {results['errors']}건")
        
        print("\n" + "=" * 60)
        print("✅ Daily Ledger 처리 완료")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()