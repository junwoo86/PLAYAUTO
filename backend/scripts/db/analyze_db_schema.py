#!/usr/bin/env python3
"""
데이터베이스 스키마와 실제 데이터를 분석하는 스크립트
"""

import psycopg2
from datetime import datetime
import json


def analyze_database():
    """데이터베이스 구조와 데이터 분석"""
    
    # 데이터베이스 연결
    conn = psycopg2.connect(
        host="15.164.112.237",
        port=5432,
        user="postgres", 
        password="bico0211",
        database="dashboard"
    )
    cursor = conn.cursor()
    
    print("=" * 80)
    print("PLAYAUTO 데이터베이스 스키마 및 데이터 분석")
    print(f"분석 시간: {datetime.now()}")
    print("=" * 80)
    
    # 스키마 내 테이블 목록 조회
    tables_query = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'playauto_platform'
    ORDER BY table_name;
    """
    
    cursor.execute(tables_query)
    tables = cursor.fetchall()
    print("\n📋 playauto_platform 스키마 내 테이블 목록:")
    for table in tables:
        print(f"  - {table[0]}")
    
    # 각 테이블별 상세 분석
    for table in tables:
        table_name = table[0]
        print(f"\n{'='*60}")
        print(f"📄 테이블: {table_name}")
        print(f"{'='*60}")
        
        # 테이블 구조 조회
        columns_query = f"""
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'playauto_platform' 
        AND table_name = '{table_name}'
        ORDER BY ordinal_position;
        """
        
        cursor.execute(columns_query)
        columns = cursor.fetchall()
        
        print("\n🏗️ 테이블 구조:")
        for col in columns:
            column_name, data_type, is_nullable, column_default, max_length = col
            nullable = "NULL" if is_nullable == 'YES' else "NOT NULL"
            default = f" DEFAULT {column_default}" if column_default else ""
            max_len = f"({max_length})" if max_length else ""
            print(f"  {column_name:<25} {data_type}{max_len:<15} {nullable}{default}")
        
        # Primary Key 조회
        pk_query = f"""
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = 'playauto_platform.{table_name}'::regclass
        AND i.indisprimary;
        """
        
        try:
            cursor.execute(pk_query)
            pk_result = cursor.fetchall()
            if pk_result:
                pk_cols = [row[0] for row in pk_result]
                print(f"\n🔑 Primary Key: {', '.join(pk_cols)}")
        except Exception as e:
            print(f"\n🔑 Primary Key 조회 실패: {e}")
        
        # Foreign Key 조회
        fk_query = f"""
        SELECT
            conname AS constraint_name,
            a.attname AS column_name,
            cl.relname AS referenced_table,
            af.attname AS referenced_column
        FROM pg_constraint AS c
        JOIN pg_class AS t ON c.conrelid = t.oid
        JOIN pg_attribute AS a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        JOIN pg_class AS cl ON c.confrelid = cl.oid
        JOIN pg_attribute AS af ON af.attrelid = cl.oid AND af.attnum = ANY(c.confkey)
        WHERE t.relname = '{table_name}'
        AND c.contype = 'f';
        """
        
        try:
            cursor.execute(fk_query)
            fk_result = cursor.fetchall()
            if fk_result:
                print("\n🔗 Foreign Keys:")
                for fk in fk_result:
                    constraint_name, column_name, referenced_table, referenced_column = fk
                    print(f"  {column_name} -> {referenced_table}.{referenced_column}")
        except Exception as e:
            print(f"\n🔗 Foreign Key 조회 실패: {e}")
        
        # 데이터 샘플 조회 (최대 5건)
        try:
            sample_query = f"SELECT * FROM playauto_platform.{table_name} LIMIT 5;"
            cursor.execute(sample_query)
            samples = cursor.fetchall()
            
            # 컬럼 이름 가져오기
            cursor.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'playauto_platform' 
            AND table_name = '{table_name}'
            ORDER BY ordinal_position;
            """)
            column_names = [row[0] for row in cursor.fetchall()]
            
            if samples:
                print("\n📊 데이터 샘플 (최대 5건):")
                for i, sample in enumerate(samples, 1):
                    print(f"\n  📝 Record {i}:")
                    for j, value in enumerate(sample):
                        if j < len(column_names):
                            # 값이 너무 길면 자르기
                            display_value = str(value)
                            if len(display_value) > 50:
                                display_value = display_value[:47] + "..."
                            print(f"    {column_names[j]:<25}: {display_value}")
            else:
                print("\n📊 데이터 샘플: 테이블이 비어있습니다.")
                
        except Exception as e:
            print(f"\n📊 데이터 샘플 조회 실패: {e}")
    
    # 테이블 간 관계 분석
    print(f"\n{'='*80}")
    print("🔗 테이블 간 관계 분석")
    print(f"{'='*80}")
    
    relationships_query = """
    SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'playauto_platform'
    ORDER BY tc.table_name, kcu.column_name;
    """
    
    try:
        cursor.execute(relationships_query)
        relationships = cursor.fetchall()
        for rel in relationships:
            source_table, source_column, target_table, target_column = rel
            print(f"  {source_table}.{source_column} -> {target_table}.{target_column}")
    except Exception as e:
        print(f"관계 분석 실패: {e}")
    
    cursor.close()
    conn.close()
    print(f"\n{'='*80}")
    print("분석 완료!")
    print(f"{'='*80}")


if __name__ == "__main__":
    analyze_database()