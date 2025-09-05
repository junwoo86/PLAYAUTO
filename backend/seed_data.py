#!/usr/bin/env python3
"""
데이터베이스에 초기 테스트 데이터를 추가하는 스크립트
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.product import Product
from app.models.transaction import Transaction

def seed_products(db: Session):
    """제품 데이터 추가"""
    products_data = [
        {
            "id": uuid4(),
            "product_code": "SKU001",
            "product_name": "바이오밸런스 영양제",
            "category": "영양제",
            "manufacturer": "바이오팜",
            "supplier": "NPK",
            "supplier_email": "order@npk.co.kr",
            "zone_id": "A-01",
            "unit": "개",
            "price": Decimal("25000"),
            "current_stock": 2005,
            "safety_stock": 150,
            "is_auto_calculated": True,
            "moq": 50,
            "lead_time_days": 7,
            "is_active": True
        },
        {
            "id": uuid4(),
            "product_code": "SKU002",
            "product_name": "비타민C 1000mg",
            "category": "영양제",
            "manufacturer": "한국팜",
            "supplier": "한국팜",
            "supplier_email": "supply@koreapharm.co.kr",
            "zone_id": "A-02",
            "unit": "개",
            "price": Decimal("15000"),
            "current_stock": 500,
            "safety_stock": 80,
            "is_auto_calculated": True,
            "moq": 100,
            "lead_time_days": 5,
            "is_active": True
        },
        {
            "id": uuid4(),
            "product_code": "SKU003",
            "product_name": "오메가3 소프트젤",
            "category": "영양제",
            "manufacturer": "오션헬스",
            "supplier": "NPK",
            "supplier_email": "order@npk.co.kr",
            "zone_id": "B-01",
            "unit": "개",
            "price": Decimal("35000"),
            "current_stock": 300,
            "safety_stock": 50,
            "is_auto_calculated": False,
            "moq": 100,
            "lead_time_days": 10,
            "is_active": True
        },
        {
            "id": uuid4(),
            "product_code": "SKU004",
            "product_name": "프로바이오틱스 30포",
            "category": "영양제",
            "manufacturer": "바이오텍",
            "supplier": "바이오텍",
            "supplier_email": "order@biotech.co.kr",
            "zone_id": "B-02",
            "unit": "박스",
            "price": Decimal("45000"),
            "current_stock": 150,
            "safety_stock": 30,
            "is_auto_calculated": True,
            "moq": 200,
            "lead_time_days": 14,
            "is_active": True
        },
        {
            "id": uuid4(),
            "product_code": "SKU005",
            "product_name": "칼슘 마그네슘 비타민D",
            "category": "영양제",
            "manufacturer": "헬스케어",
            "supplier": "헬스케어",
            "supplier_email": "sales@healthcare.co.kr",
            "zone_id": "C-01",
            "unit": "개",
            "price": Decimal("28000"),
            "current_stock": 450,
            "safety_stock": 100,
            "is_auto_calculated": True,
            "moq": 50,
            "lead_time_days": 7,
            "is_active": True
        },
        {
            "id": uuid4(),
            "product_code": "MED001",
            "product_name": "혈압측정기 전자식",
            "category": "의료기기",
            "manufacturer": "메디텍",
            "supplier": "메디텍",
            "supplier_email": "order@meditech.co.kr",
            "zone_id": "D-01",
            "unit": "대",
            "price": Decimal("120000"),
            "current_stock": 25,
            "safety_stock": 10,
            "is_auto_calculated": False,
            "moq": 5,
            "lead_time_days": 21,
            "is_active": True
        },
        {
            "id": uuid4(),
            "product_code": "MED002",
            "product_name": "체온계 비접촉식",
            "category": "의료기기",
            "manufacturer": "헬스모니터",
            "supplier": "의료기기유통",
            "supplier_email": "sales@meddevice.co.kr",
            "zone_id": "D-02",
            "unit": "개",
            "price": Decimal("45000"),
            "current_stock": 80,
            "safety_stock": 20,
            "is_auto_calculated": True,
            "moq": 10,
            "lead_time_days": 7,
            "is_active": True
        },
        {
            "id": uuid4(),
            "product_code": "MASK001",
            "product_name": "KF94 마스크 대형",
            "category": "위생용품",
            "manufacturer": "클린텍",
            "supplier": "클린텍",
            "supplier_email": "order@cleantech.co.kr",
            "zone_id": "E-01",
            "unit": "박스",
            "price": Decimal("30000"),
            "current_stock": 500,
            "safety_stock": 200,
            "is_auto_calculated": True,
            "moq": 100,
            "lead_time_days": 3,
            "is_active": True
        }
    ]
    
    # 기존 제품 확인 및 추가
    for product_data in products_data:
        existing = db.query(Product).filter_by(product_code=product_data["product_code"]).first()
        if not existing:
            product = Product(**product_data)
            db.add(product)
            print(f"제품 추가: {product_data['product_name']}")
        else:
            print(f"제품 이미 존재: {product_data['product_name']}")
    
    db.commit()
    return db.query(Product).all()

def seed_transactions(db: Session, products):
    """거래 내역 데이터 추가"""
    if not products:
        print("제품이 없어 거래 내역을 추가할 수 없습니다.")
        return
    
    # 각 제품별로 거래 내역 생성
    for product in products[:3]:  # 처음 3개 제품만
        # 입고 거래
        inbound = Transaction(
            id=uuid4(),
            transaction_type="IN",
            product_id=product.id,
            quantity=100,
            previous_stock=product.current_stock - 100,
            new_stock=product.current_stock,
            reason="정기 입고",
            memo="월간 정기 입고 처리",
            location="본사 창고",
            created_by="관리자",
            transaction_date=datetime.now() - timedelta(days=5)
        )
        db.add(inbound)
        
        # 출고 거래
        outbound = Transaction(
            id=uuid4(),
            transaction_type="OUT",
            product_id=product.id,
            quantity=50,
            previous_stock=product.current_stock + 50,
            new_stock=product.current_stock,
            reason="판매 출고",
            memo="온라인 주문 출고",
            location="본사 창고",
            created_by="관리자",
            transaction_date=datetime.now() - timedelta(days=2)
        )
        db.add(outbound)
        
        print(f"거래 내역 추가: {product.product_name}")
    
    db.commit()

def main():
    """메인 실행 함수"""
    print("데이터베이스 시드 작업 시작...")
    
    db = SessionLocal()
    try:
        # 제품 데이터 추가
        print("\n1. 제품 데이터 추가 중...")
        products = seed_products(db)
        print(f"총 {len(products)}개 제품 확인됨")
        
        # 거래 내역 추가
        print("\n2. 거래 내역 추가 중...")
        seed_transactions(db, products)
        
        print("\n✅ 데이터베이스 시드 작업 완료!")
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()