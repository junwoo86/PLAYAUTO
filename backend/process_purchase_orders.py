#!/usr/bin/env python3
"""
발주서 처리 스크립트
Draft 상태의 발주서를 Ordered 상태로 변경하고 이메일 발송 시뮬레이션
"""

import psycopg2
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

def get_db_connection():
    """데이터베이스 연결"""
    return psycopg2.connect(
        host="15.164.112.237",
        port=5432,
        user="postgres",
        password="bico0211",
        database="dashboard"
    )

def get_draft_orders(conn):
    """Draft 상태의 발주서 조회"""
    cursor = conn.cursor()
    query = """
    SELECT 
        po.id,
        po.po_number,
        po.supplier,
        po.total_amount,
        po.expected_date,
        po.notes
    FROM playauto_platform.purchase_orders po
    WHERE po.status = 'draft'
    ORDER BY po.created_at
    """
    cursor.execute(query)
    return cursor.fetchall()

def get_order_items(conn, po_id):
    """발주서 항목 조회"""
    cursor = conn.cursor()
    query = """
    SELECT 
        poi.product_code,
        p.product_name,
        poi.ordered_quantity,
        poi.unit_price,
        p.supplier_email
    FROM playauto_platform.purchase_order_items poi
    JOIN playauto_platform.products p ON poi.product_code = p.product_code
    WHERE poi.po_id = %s
    """
    cursor.execute(query, (po_id,))
    return cursor.fetchall()

def update_order_status(conn, po_id, new_status):
    """발주서 상태 업데이트"""
    cursor = conn.cursor()
    update_query = """
    UPDATE playauto_platform.purchase_orders
    SET status = %s, updated_at = %s
    WHERE id = %s
    """
    cursor.execute(update_query, (new_status, datetime.now(), po_id))
    conn.commit()
    print(f"✅ 발주서 상태 업데이트 완료: {po_id} → {new_status}")

def create_order_email(po_number, supplier, items, total_amount, expected_date):
    """발주 이메일 내용 생성"""
    item_details = "\n".join([
        f"  - {item[1]} ({item[0]}): {item[2]}개 × ${item[3]:.2f} = ${item[2] * item[3]:.2f}"
        for item in items
    ])
    
    email_content = f"""
안녕하세요 {supplier}님,

다음과 같이 발주를 요청드립니다.

발주번호: {po_number}
발주일자: {datetime.now().strftime('%Y-%m-%d')}
납품 예정일: {expected_date}

발주 제품:
{item_details}

총 발주 금액: ${total_amount:.2f}

빠른 시일 내에 확인 부탁드립니다.

감사합니다.
PLAYAUTO 구매팀
"""
    return email_content

def simulate_email_send(supplier, supplier_email, subject, content):
    """이메일 발송 시뮬레이션"""
    print(f"\n📧 이메일 발송 시뮬레이션")
    print(f"  수신자: {supplier} <{supplier_email}>")
    print(f"  제목: {subject}")
    print(f"  내용 미리보기:")
    print("-" * 50)
    print(content[:200] + "..." if len(content) > 200 else content)
    print("-" * 50)
    print(f"  ✅ 이메일 발송 시뮬레이션 완료")
    
    # 실제 이메일 발송 시 아래 코드 활성화
    # send_actual_email(supplier_email, subject, content)

def send_actual_email(to_email, subject, content):
    """실제 이메일 발송 (필요시 활성화)"""
    # Gmail SMTP 설정 예시
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = os.getenv("SENDER_EMAIL", "playauto@example.com")
    sender_password = os.getenv("SENDER_PASSWORD", "")
    
    if not sender_password:
        print("⚠️ 이메일 발송 설정이 필요합니다 (환경변수: SENDER_EMAIL, SENDER_PASSWORD)")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(content, 'plain'))
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        
        print(f"✅ 이메일 발송 성공: {to_email}")
        return True
    except Exception as e:
        print(f"❌ 이메일 발송 실패: {e}")
        return False

def process_purchase_orders():
    """메인 처리 함수"""
    print("=" * 60)
    print("🛒 발주서 처리 시작")
    print(f"처리 시간: {datetime.now()}")
    print("=" * 60)
    
    conn = get_db_connection()
    
    try:
        # Draft 상태 발주서 조회
        draft_orders = get_draft_orders(conn)
        
        if not draft_orders:
            print("\n✅ 처리할 Draft 상태의 발주서가 없습니다.")
            return
        
        print(f"\n📋 처리할 발주서: {len(draft_orders)}건")
        
        for order in draft_orders:
            po_id, po_number, supplier, total_amount, expected_date, notes = order
            
            print(f"\n처리 중: {po_number}")
            print(f"  공급업체: {supplier}")
            print(f"  총 금액: ${total_amount:.2f}")
            print(f"  납품 예정일: {expected_date}")
            
            # 발주 항목 조회
            items = get_order_items(conn, po_id)
            
            if not items:
                print(f"  ⚠️ 발주 항목이 없습니다. 건너뜁니다.")
                continue
            
            # 공급업체 이메일 추출
            supplier_emails = list(set([item[4] for item in items if item[4]]))
            
            if supplier_emails:
                # 이메일 내용 생성
                email_content = create_order_email(
                    po_number, supplier, items, total_amount, expected_date
                )
                
                # 이메일 발송 시뮬레이션
                for email in supplier_emails:
                    if email:
                        simulate_email_send(
                            supplier,
                            email,
                            f"[PLAYAUTO] 발주 요청 - {po_number}",
                            email_content
                        )
            else:
                print(f"  ⚠️ 공급업체 이메일이 설정되지 않았습니다.")
            
            # 발주서 상태를 'ordered'로 변경
            update_order_status(conn, po_id, 'ordered')
            
            print(f"  ✅ {po_number} 처리 완료")
        
        print("\n" + "=" * 60)
        print(f"✅ 모든 발주서 처리 완료: {len(draft_orders)}건")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    process_purchase_orders()