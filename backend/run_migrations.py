#!/usr/bin/env python3
"""
데이터베이스 마이그레이션 실행 스크립트
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
import sys
from pathlib import Path

# 환경 변수 설정
DB_HOST = "15.164.112.237"
DB_PORT = 5432
DB_NAME = "dashboard"
DB_USER = "postgres"
DB_PASSWORD = "bico0211"
DB_SCHEMA = "playauto_platform"

def run_migration(migration_file):
    """단일 마이그레이션 파일 실행"""
    print(f"\n{'='*60}")
    print(f"실행 중: {migration_file.name}")
    print(f"{'='*60}")
    
    try:
        # 데이터베이스 연결
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        with conn.cursor() as cursor:
            # SQL 파일 읽기
            with open(migration_file, 'r', encoding='utf-8') as f:
                sql = f.read()
            
            # SQL 실행
            cursor.execute(sql)
            
            # NOTICE 메시지 출력
            for notice in conn.notices:
                print(f"  {notice.strip()}")
            
        print(f"✅ {migration_file.name} 실행 완료")
        return True
        
    except psycopg2.Error as e:
        print(f"❌ 데이터베이스 오류: {e}")
        return False
    except Exception as e:
        print(f"❌ 일반 오류: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def check_schema():
    """스키마 존재 여부 확인"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name = %s
            """, (DB_SCHEMA,))
            result = cursor.fetchone()
            
            if result:
                print(f"✅ 스키마 '{DB_SCHEMA}' 확인됨")
                
                # 테이블 목록 확인
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                    ORDER BY table_name
                """, (DB_SCHEMA,))
                tables = cursor.fetchall()
                
                if tables:
                    print(f"\n기존 테이블 목록:")
                    for table in tables:
                        print(f"  - {table[0]}")
                else:
                    print("  (테이블 없음)")
            else:
                print(f"ℹ️ 스키마 '{DB_SCHEMA}'가 없습니다. 생성됩니다.")
        
        conn.close()
        return True
        
    except psycopg2.Error as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        return False

def main():
    print("🚀 PLAYAUTO 데이터베이스 마이그레이션 시작")
    print(f"서버: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    print(f"스키마: {DB_SCHEMA}")
    
    # 스키마 확인
    if not check_schema():
        sys.exit(1)
    
    # 마이그레이션 디렉토리 확인
    migration_dir = Path(__file__).parent / "migrations"
    if not migration_dir.exists():
        print(f"❌ 마이그레이션 디렉토리를 찾을 수 없습니다: {migration_dir}")
        sys.exit(1)
    
    # SQL 파일 목록 가져오기 (파일명 순서대로)
    migration_files = sorted(migration_dir.glob("*.sql"))
    
    if not migration_files:
        print("ℹ️ 실행할 마이그레이션 파일이 없습니다.")
        return
    
    print(f"\n발견된 마이그레이션 파일: {len(migration_files)}개")
    for f in migration_files:
        print(f"  - {f.name}")
    
    # 사용자 확인
    response = input("\n마이그레이션을 실행하시겠습니까? (y/n): ")
    if response.lower() != 'y':
        print("취소되었습니다.")
        return
    
    # 각 마이그레이션 실행
    success_count = 0
    for migration_file in migration_files:
        if run_migration(migration_file):
            success_count += 1
        else:
            print(f"\n⚠️ {migration_file.name} 실행 실패. 중단합니다.")
            break
    
    # 결과 출력
    print(f"\n{'='*60}")
    print(f"마이그레이션 완료: {success_count}/{len(migration_files)} 성공")
    
    if success_count == len(migration_files):
        print("✅ 모든 마이그레이션이 성공적으로 완료되었습니다!")
        
        # 최종 테이블 확인
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD
            )
            
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = %s 
                    ORDER BY table_name
                """, (DB_SCHEMA,))
                tables = cursor.fetchall()
                
                print(f"\n생성된 테이블 ({len(tables)}개):")
                for table in tables:
                    cursor.execute("""
                        SELECT COUNT(*) 
                        FROM {}.{}
                    """.format(DB_SCHEMA, table[0]))
                    count = cursor.fetchone()[0]
                    print(f"  - {table[0]}: {count}개 레코드")
            
            conn.close()
            
        except Exception as e:
            print(f"테이블 확인 중 오류: {e}")
    else:
        print("⚠️ 일부 마이그레이션이 실패했습니다.")

if __name__ == "__main__":
    main()