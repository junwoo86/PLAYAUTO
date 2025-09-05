import os
import psycopg2
from psycopg2.extras import RealDictCursor
import streamlit as st
from contextlib import contextmanager
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

import pandas as pd
from datetime import datetime
        

# Load environment variables
load_dotenv()

class DatabaseConnection:
    """PostgreSQL database connection manager"""
    
    def __init__(self):
        self.connection_params = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'dify'),
            'user': os.getenv('DB_USER', 'difyuser'),
            'password': os.getenv('DB_PASSWORD', '')
        }
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = psycopg2.connect(**self.connection_params)
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            st.error(f"Database connection error: {str(e)}")
            raise
        finally:
            if conn:
                conn.close()
    
    @contextmanager
    def get_cursor(self, dict_cursor=True):
        """Context manager for database cursor"""
        with self.get_connection() as conn:
            cursor_factory = RealDictCursor if dict_cursor else None
            cursor = conn.cursor(cursor_factory=cursor_factory)
            try:
                # Set timezone to Korean time for this session
                cursor.execute("SET timezone = 'Asia/Seoul'")
                yield cursor
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise
            finally:
                cursor.close()
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute SELECT query and return results"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()
    
    def execute_update(self, query: str, params: Optional[tuple] = None) -> int:
        """Execute UPDATE/INSERT/DELETE query and return affected rows"""
        with self.get_cursor() as cursor:
            cursor.execute(query, params)
            return cursor.rowcount
    
    def execute_many(self, query: str, params_list: List[tuple]) -> int:
        """Execute multiple queries with different parameters"""
        with self.get_cursor() as cursor:
            cursor.executemany(query, params_list)
            return cursor.rowcount

# Singleton instance
db = DatabaseConnection()

# Member-related queries
class MemberQueries:
    @staticmethod
    def get_all_members():
        query = """
        SELECT * FROM playauto_members
        ORDER BY joined_date DESC, last_update_time DESC
        """
        return db.execute_query(query)
    
    @staticmethod
    def insert_member(id: str, password: str, name: str, master: str, email: str, phone_no: str):
        query = """
        INSERT INTO playauto_members 
        (id, password, name, master, email, phone_no, joined_date) 
        VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE)
        """
        return db.execute_update(query, (id, password, name, master, email, phone_no))
    
    @staticmethod
    def verify_login(id: str, password: str):
        query = """
        SELECT id, name, master, email, phone_no, joined_date 
        FROM playauto_members 
        WHERE id = %s AND password = %s
        """
        results = db.execute_query(query, (id, password))
        return results[0] if results else None
    
    @staticmethod
    def get_member_by_id(id: str):
        query = """
        SELECT id, name, master, email, phone_no, joined_date 
        FROM playauto_members 
        WHERE id = %s
        """
        results = db.execute_query(query, (id,))
        return results[0] if results else None
    
    @staticmethod
    def update_member_info(id: str, email: str, phone_no: str):
        query = """
        UPDATE playauto_members 
        SET email = %s, phone_no = %s, last_update_time = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        return db.execute_update(query, (email, phone_no, id))
    
    @staticmethod
    def update_member_password(id: str, old_password: str, new_password: str):
        # First verify old password
        query_verify = """
        SELECT id FROM playauto_members 
        WHERE id = %s AND password = %s
        """
        results = db.execute_query(query_verify, (id, old_password))
        if not results:
            return False
        
        # Update password
        query_update = """
        UPDATE playauto_members 
        SET password = %s, last_update_time = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        return db.execute_update(query_update, (new_password, id))


# Product-related queries
class ProductQueries:
    @staticmethod
    def get_all_products():
        query = """
        SELECT 
            pi.마스터_sku, pi.플레이오토_sku,
            pi.상품명, pi.카테고리, pi.세트유무, 
            pi.출고량, pi.입고량, pi.현재재고, 
            pi.리드타임, pi.최소주문수량, pi.안전재고, 
            pi.제조사, pi.소비기한,
            COALESCE(pc.multiple, 1) as 배수
        FROM playauto_product_inventory pi
        LEFT JOIN playauto_product_category pc 
            ON pi.마스터_sku = pc.master_SKU
        ORDER BY pi.플레이오토_sku
        """
        return db.execute_query(query)
    
    @staticmethod
    def get_products_by_category(category: str):
        query = """
        SELECT * FROM playauto_product_inventory 
        WHERE 카테고리 = %s
        ORDER BY 플레이오토_sku
        """
        return db.execute_query(query, (category,))
    
    @staticmethod
    def get_low_stock_products(threshold_ratio: float = 1.0):
        """Get products where current stock is below safety stock * threshold_ratio"""
        query = """
        SELECT * FROM playauto_product_inventory 
        WHERE 현재재고 < (안전재고 * %s)
        ORDER BY (현재재고::float / NULLIF(안전재고, 0)) ASC
        """
        return db.execute_query(query, (threshold_ratio,))
    
    @staticmethod
    def get_product_by_sku(master_sku: str):
        query = """
        SELECT * FROM playauto_product_inventory WHERE 마스터_sku = %s
        """
        results = db.execute_query(query, (master_sku,))
        return results[0] if results else None
    
    @staticmethod
    def get_latest_playauto_sku():
        query = """
        SELECT MAX(플레이오토_sku) as max_sku
        FROM playauto_product_inventory
        """
        result = db.execute_query(query)
        if result and len(result) > 0 and result[0]['max_sku']:
            return result[0]['max_sku']
        return None
    
    @staticmethod
    def insert_product(master_sku: str, playauto_sku: str, product_name: str, category: str, is_set: str, current_stock: int, lead_time: int, moq: int, safety_stock: int, supplier: str, expiration, user_id: str):
        query = """
        INSERT INTO playauto_product_inventory 
        (마스터_sku, 플레이오토_sku, 상품명, 카테고리, 세트유무, 현재재고, 출고량, 입고량, 리드타임, 최소주문수량, 안전재고, 제조사, 소비기한, 등록한_회원_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        return db.execute_update(query, (master_sku, playauto_sku, product_name, category, is_set, current_stock, 0, 0, lead_time, moq, safety_stock, supplier, expiration, user_id))
    
    @staticmethod
    def set_product_info(master_sku: str, playauto_sku: str, product_name: str, is_set: str, multiple: int, category: str, category_mid: str, category_low: str):
        query = """
        INSERT INTO playauto_product_category 
        (master_SKU, playauto_SKU, product_name, is_set, multiple, category, category_mid, category_low) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        return db.execute_update(query, (master_sku, playauto_sku, product_name, is_set, multiple, category, category_mid, category_low))
    
    @staticmethod
    def update_product(master_sku: str, **kwargs):
        allowed_fields = ['리드타임', '최소주문수량', '안전재고', '현재재고', '출고량', '입고량', '소비기한']
        update_fields = []
        params = []
        
        for field, value in kwargs.items():
            if field in allowed_fields:
                update_fields.append(f"{field} = %s")
                params.append(value)
        
        if not update_fields:
            return 0
        
        params.append(master_sku)
        query = f"""
        UPDATE playauto_product_inventory 
        SET {', '.join(update_fields)}
        WHERE 마스터_sku = %s
        """
        return db.execute_update(query, tuple(params))
    
    @staticmethod
    def process_inventory_in(master_sku: str, quantity: int):  # 제고 테이블 입고량 업데이트
        """Process incoming inventory (increase stock)"""
        query = """
        UPDATE playauto_product_inventory 
        SET 입고량 = 입고량 + %s,
            현재재고 = 현재재고 + %s
        WHERE 마스터_sku = %s
        """
        return db.execute_update(query, (quantity, quantity, master_sku))
    
    @staticmethod
    def process_inventory_out(master_sku: str, quantity: int):  # 제고 테이블 출고량 업데이트
        """Process outgoing inventory (decrease stock)"""
        query = """
        UPDATE playauto_product_inventory 
        SET 출고량 = 출고량 + %s,
            현재재고 = 현재재고 - %s
        WHERE 마스터_sku = %s AND 현재재고 >= %s
        """
        return db.execute_update(query, (quantity, quantity, master_sku, quantity))
    
    @staticmethod
    def adjust_inventory(master_sku: str, new_stock_level: int):  # 현재 재고 업데이트
        """Directly adjust inventory to a specific level"""
        query = """
        UPDATE playauto_product_inventory 
        SET 현재재고 = %s
        WHERE 마스터_sku = %s
        """
        return db.execute_update(query, (new_stock_level, master_sku))
    
    @staticmethod
    def adjust_history(master_sku: str, current_stock: int, new_stock_level: int, reason: str, name: str, id: str):
        """Original and updated inventory and the reason for it"""
        query = """
        INSERT INTO playauto_inventory_adjust 
        (마스터_sku, 현재재고, 실제재고, 사유, 작업자명, 작업자_id) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        return db.execute_update(query, (master_sku, current_stock, new_stock_level, reason, name, id))
    
    @staticmethod
    def save_update_history(master_sku: str, product_name: str, old_values: dict, new_values: dict, user_id: str, user_name: str):
        """Save product update history"""
        query = """
        INSERT INTO playauto_update_history
        (마스터_SKU, 상품명, 
         리드타임_old, 최소주문수량_old, 안전재고_old, 소비기한_old, 제조사_old,
         리드타임_new, 최소주문수량_new, 안전재고_new, 소비기한_new, 제조사_new,
         수정자_id, 수정자명)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        return db.execute_update(query, (
            master_sku, product_name,
            old_values.get('리드타임'), old_values.get('최소주문수량'), 
            old_values.get('안전재고'), old_values.get('소비기한'), old_values.get('제조사'),
            new_values.get('리드타임'), new_values.get('최소주문수량'), 
            new_values.get('안전재고'), new_values.get('소비기한'), new_values.get('제조사'),
            user_id, user_name
        ))
    
    @staticmethod
    def adjust_inventory_history(master_sku: str, current_stock: int, new_stock_level: int, reason: str, name: str, id: str):
        """Original and updated inventory and the reason for it"""
        query = """
        INSERT INTO playauto_inventory_adjust 
        (마스터_sku, 현재재고, 실제재고, 사유, 작업자명, 작업자_id) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        return db.execute_update(query, (master_sku, current_stock, new_stock_level, reason, name, id))


# 입출고 테이블
class ShipmentQueries:
    @staticmethod
    def get_all_inv_inout():
        query = """
        SELECT 
            a.inv_code, a.마스터_SKU, b.상품명, b.제조사, a.입출고_여부, a.수량, a.시점, a.작업자_id 
        FROM playauto_copy_shipment_receipt a 
        INNER JOIN playauto_product_inventory b 
        ON a.마스터_SKU = b.마스터_SKU
        ORDER BY a.마스터_SKU, a.시점
        """
        return db.execute_query(query)
    
    @staticmethod
    def insert_edit_request(inv_code, master_sku, product_name, manufacturer, 
                           inout_type, old_qty, new_qty, old_date, new_date,
                           requester_name, requester_id, reason):
        """Insert an edit request for inventory in/out adjustment"""
        # Accept datetime strings directly (e.g., "2024-10-08 00:00:00")
        
        query = """
        INSERT INTO playauto_inNout_adjust 
        (inv_code, 마스터_SKU, 상품명, 제조사, 입출고_여부, 
         수량_old, 수량_new, 시점_old, 시점_new, 
         요청자명, 요청자_id, 사유, 승인)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '승인대기')
        """
        return db.execute_update(query, (inv_code, master_sku, product_name, manufacturer,
                                        inout_type, int(old_qty), int(new_qty), old_date, new_date,
                                        requester_name, requester_id, reason))

    @staticmethod
    def get_all_inv_out():
        """Get all shipment receipts ordered by time"""
        # query = """SELECT * FROM playauto_shipment_receipt ORDER BY 시점 DESC"""
        query = """
        SELECT 
            마스터_SKU, 수량, 시점 
        FROM playauto_copy_shipment_receipt 
        WHERE 입출고_여부='출고' 
        ORDER BY 마스터_SKU, 시점
        """
        return db.execute_query(query)
    
    @staticmethod
    def get_monthly_shipment_summary():
        """Get shipment data aggregated by month for the last 6 months"""
        query = """
        WITH monthly_data AS (
            SELECT 
                p.마스터_sku,
                p.상품명,
                EXTRACT(YEAR FROM sr.시점) as year,
                EXTRACT(MONTH FROM sr.시점) as month,
                SUM(CASE WHEN sr.입출고_여부 = '출고' THEN sr.수량 ELSE 0 END) as 월별출고량
            FROM playauto_product_inventory p
            LEFT JOIN playauto_shipment_receipt sr ON p.마스터_sku = sr.마스터_SKU
            WHERE sr.시점 >= CURRENT_DATE - INTERVAL '6 months'
                AND sr.입출고_여부 = '출고'
            GROUP BY p.마스터_sku, p.상품명, 
                     EXTRACT(YEAR FROM sr.시점), EXTRACT(MONTH FROM sr.시점)
        )
        SELECT 
            마스터_sku,
            상품명,
            SUM(CASE WHEN CURRENT_DATE - INTERVAL '6 months' <= make_date(year::int, month::int, 1) 
                     AND make_date(year::int, month::int, 1) < CURRENT_DATE - INTERVAL '5 months' 
                     THEN 월별출고량 ELSE 0 END) as 출고량_5개월전,
            SUM(CASE WHEN CURRENT_DATE - INTERVAL '5 months' <= make_date(year::int, month::int, 1) 
                     AND make_date(year::int, month::int, 1) < CURRENT_DATE - INTERVAL '4 months' 
                     THEN 월별출고량 ELSE 0 END) as 출고량_4개월전,
            SUM(CASE WHEN CURRENT_DATE - INTERVAL '4 months' <= make_date(year::int, month::int, 1) 
                     AND make_date(year::int, month::int, 1) < CURRENT_DATE - INTERVAL '3 months' 
                     THEN 월별출고량 ELSE 0 END) as 출고량_3개월전,
            SUM(CASE WHEN CURRENT_DATE - INTERVAL '3 months' <= make_date(year::int, month::int, 1) 
                     AND make_date(year::int, month::int, 1) < CURRENT_DATE - INTERVAL '2 months' 
                     THEN 월별출고량 ELSE 0 END) as 출고량_2개월전,
            SUM(CASE WHEN CURRENT_DATE - INTERVAL '2 months' <= make_date(year::int, month::int, 1) 
                     AND make_date(year::int, month::int, 1) < CURRENT_DATE - INTERVAL '1 month' 
                     THEN 월별출고량 ELSE 0 END) as 출고량_1개월전,
            SUM(CASE WHEN EXTRACT(YEAR FROM CURRENT_DATE) = year::int 
                    AND EXTRACT(MONTH FROM CURRENT_DATE) = month::int
                    THEN 월별출고량 ELSE 0 END) as 출고량_현재월
        FROM monthly_data
        GROUP BY 마스터_sku, 상품명
        ORDER BY 마스터_sku
        """
        return db.execute_query(query)
    
    @staticmethod
    def generate_inv_code(master_sku: str, transaction_type: str, transaction_datetime=None):
        """Generate inv_code for inventory transactions"""
        from datetime import datetime
        
        # Determine the transaction datetime
        if transaction_datetime:
            if isinstance(transaction_datetime, str):
                dt = datetime.strptime(transaction_datetime, '%Y-%m-%d %H:%M:%S')
            else:
                dt = transaction_datetime
        else:
            # Get current Korean time
            query = "SELECT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul' as now"
            result = db.execute_query(query)
            dt = result[0]['now']
        
        # Format the datetime part
        dt_str = dt.strftime('%y%m%d%H%M%S')
        
        # Convert transaction type to 'in' or 'out'
        trans_type = 'in' if transaction_type == '입고' else 'out'
        
        # Get the count of existing transactions for this second
        count_query = """
        SELECT COUNT(*) + 1 as next_num
        FROM playauto_copy_shipment_receipt
        WHERE 마스터_SKU = %s 
        AND 입출고_여부 = %s
        AND DATE_TRUNC('second', 시점) = DATE_TRUNC('second', %s::timestamp)
        """
        
        result = db.execute_query(count_query, (master_sku, transaction_type, dt))
        next_num = result[0]['next_num'] if result else 1
        
        # Generate the inv_code
        inv_code = f"{master_sku}-{trans_type}-{dt_str}-{str(next_num).zfill(3)}"
        
        return inv_code
    
    @staticmethod
    def insert_shipment_receipt(master_sku: str, transaction_type: str, quantity: int, id: str, inv_code: str = None, transaction_datetime=None):
        """Insert a new shipment receipt with optional custom datetime"""
        # Generate inv_code if not provided
        if not inv_code:
            inv_code = ShipmentQueries.generate_inv_code(master_sku, transaction_type, transaction_datetime)
        
        if transaction_datetime:
            # Use provided datetime
            query = """
            INSERT INTO playauto_copy_shipment_receipt 
            (마스터_SKU, 입출고_여부, 수량, 시점, 작업자_id, inv_code)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            return db.execute_update(query, (master_sku, transaction_type, quantity, transaction_datetime, id, inv_code))
        else:
            # Use current timestamp with Korean timezone
            query = """
            INSERT INTO playauto_copy_shipment_receipt 
            (마스터_SKU, 입출고_여부, 수량, 시점, 작업자_id, inv_code)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul', %s, %s)
            """
            return db.execute_update(query, (master_sku, transaction_type, quantity, id, inv_code))
    
    @staticmethod
    def get_total_monthly_shipments():
        """Get total shipment amounts by month for the last 6 months"""
        query = """
        SELECT 
            TO_CHAR(시점, 'YYYY-MM') as month,
            SUM(수량) as total_shipment
        FROM playauto_copy_shipment_receipt
        WHERE 입출고_여부 = '출고'
            AND 시점 >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY TO_CHAR(시점, 'YYYY-MM')
        ORDER BY month
        """
        return db.execute_query(query)

    @staticmethod
    def get_all_inv_adjust():
        query = """select * from playauto_inNout_adjust"""
        return db.execute_query(query)


# Inventory transaction queries
class InventoryQueries:
    @staticmethod
    def get_inventory_history(product_id: Optional[int] = None, days: int = 30):
        query = """
        SELECT 
            t.transaction_id,
            t.product_id,
            p.product_name,
            t.transaction_type,
            t.quantity,
            t.transaction_date,
            t.created_by,
            t.notes
        FROM inventory_transactions t
        JOIN products p ON t.product_id = p.product_id
        WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '%s days'
        """
        params = [days]
        
        if product_id:
            query += " AND t.product_id = %s"
            params.append(product_id)
        
        query += " ORDER BY t.transaction_date DESC"
        return db.execute_query(query, tuple(params))
    
    @staticmethod
    def add_inventory_transaction(product_id: int, transaction_type: str, 
                                  quantity: int, created_by: str, notes: str = None):
        query = """
        INSERT INTO inventory_transactions 
        (product_id, transaction_type, quantity, created_by, notes)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING transaction_id
        """
        return db.execute_query(query, (product_id, transaction_type, quantity, created_by, notes))
    
    @staticmethod
    def get_daily_sales(product_id: int, days: int = 90):
        query = """
        SELECT 
            DATE(transaction_date) as sale_date,
            SUM(quantity) as total_quantity
        FROM inventory_transactions
        WHERE product_id = %s 
        AND transaction_type = 'OUT'
        AND transaction_date >= CURRENT_DATE - INTERVAL '%s days'
        GROUP BY DATE(transaction_date)
        ORDER BY sale_date
        """
        return db.execute_query(query, (product_id, days))


# Prediction queries
class PredictionQueries:
    @staticmethod
    def save_prediction(product_id: int, prediction_date: str, 
                        predicted_quantity: int, model_type: str, confidence: float):
        query = """
        INSERT INTO predictions 
        (product_id, prediction_date, predicted_quantity, model_type, confidence_score)
        VALUES (%s, %s, %s, %s, %s)
        """
        return db.execute_update(query, 
                                 (product_id, prediction_date, predicted_quantity, model_type, confidence))
    
    @staticmethod
    def get_latest_predictions(product_id: Optional[int] = None):
        query = """
        SELECT 
            p.prediction_id,
            p.product_id,
            pr.product_name,
            p.prediction_date,
            p.predicted_quantity,
            p.model_type,
            p.confidence_score,
            p.created_at
        FROM predictions p
        JOIN products pr ON p.product_id = pr.product_id
        WHERE p.created_at = (
            SELECT MAX(created_at) 
            FROM predictions p2 
            WHERE p2.product_id = p.product_id
        )
        """
        if product_id:
            query += " AND p.product_id = %s"
            return db.execute_query(query, (product_id,))
        return db.execute_query(query)
    
    @staticmethod
    def save_manual_adjustment(master_sku: str, pred_1month: float, pred_2month: float, pred_3month: float,
                               adjusted_1month: float, adjusted_2month: float, adjusted_3month: float,
                               reason: str, edited_by: str):
        """Save manual prediction adjustment to playauto_predictions table"""
        query = """
        INSERT INTO playauto_predictions 
        (마스터_sku, pred_1month, pred_2month, pred_3month, 
         adjusted_1month, adjusted_2month, adjusted_3month, 
         reason, edited_by)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING 예측결과_id
        """
        return db.execute_query(query, (master_sku, pred_1month, pred_2month, pred_3month,
                                        adjusted_1month, adjusted_2month, adjusted_3month,
                                        reason, edited_by))
    
    @staticmethod
    def get_latest_adjustment(master_sku: str):
        """Get the most recent manual adjustment for a product"""
        query = """
        SELECT * FROM playauto_predictions 
        WHERE 마스터_sku = %s 
        ORDER BY edited_at DESC 
        LIMIT 1
        """
        results = db.execute_query(query, (master_sku,))
        return results[0] if results else None
    
    @staticmethod
    def get_adjusted_prediction(master_sku: str):
        query = """
        SELECT DISTINCT ON (마스터_sku)
            adjusted_1month,
            adjusted_2month,
            adjusted_3month
        FROM playauto_predictions
        WHERE adjusted_1month IS NOT NULL AND 마스터_sku = %s
        ORDER BY 마스터_sku, edited_at DESC
        """
        return db.execute_query(query, (master_sku,))


# API Key management queries
class ApiKeyQueries:
    @staticmethod
    def create_api_key(key_hash: str, name: str, created_by: str, permissions: str = 'read,write'):
        """Create a new API key"""
        query = """
        INSERT INTO playauto_api_keys 
        (key_hash, name, created_by, permissions, is_active) 
        VALUES (%s, %s, %s, %s, true)
        RETURNING key_id, created_at
        """
        return db.execute_query(query, (key_hash, name, created_by, permissions))
    
    @staticmethod
    def get_api_key(key_hash: str):
        """Get API key by hash"""
        query = """
        SELECT key_id, name, permissions, is_active, created_by, created_at, last_used
        FROM playauto_api_keys 
        WHERE key_hash = %s AND is_active = true
        """
        results = db.execute_query(query, (key_hash,))
        return results[0] if results else None
    
    @staticmethod
    def update_last_used(key_hash: str):
        """Update last used timestamp for API key"""
        query = """
        UPDATE playauto_api_keys 
        SET last_used = CURRENT_TIMESTAMP
        WHERE key_hash = %s
        """
        return db.execute_update(query, (key_hash,))
    
    @staticmethod
    def deactivate_api_key(key_id: int):
        """Deactivate an API key"""
        query = """
        UPDATE playauto_api_keys 
        SET is_active = false
        WHERE key_id = %s
        """
        return db.execute_update(query, (key_id,))
    
    @staticmethod
    def get_all_api_keys(created_by: str = None):
        """Get all API keys, optionally filtered by creator"""
        if created_by:
            query = """
            SELECT key_id, name, permissions, is_active, created_by, created_at, last_used
            FROM playauto_api_keys 
            WHERE created_by = %s
            ORDER BY created_at DESC
            """
            return db.execute_query(query, (created_by,))
        else:
            query = """
            SELECT key_id, name, permissions, is_active, created_by, created_at, last_used
            FROM playauto_api_keys 
            ORDER BY created_at DESC
            """
            return db.execute_query(query)
