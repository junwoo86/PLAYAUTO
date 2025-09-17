"""
발주 관리 API 엔드포인트
"""
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.product import Product

router = APIRouter()

# Pydantic 스키마
class PurchaseOrderItemCreate(BaseModel):
    product_code: str
    ordered_quantity: int
    unit_price: float

class PurchaseOrderCreate(BaseModel):
    supplier: str
    expected_date: Optional[str] = None
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderItemUpdate(BaseModel):
    item_id: Optional[str] = None
    product_code: str
    ordered_quantity: int
    unit_price: float

class PurchaseOrderUpdate(BaseModel):
    supplier: Optional[str] = None
    status: Optional[str] = None
    expected_date: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[PurchaseOrderItemUpdate]] = None

class PurchaseOrderResponse(BaseModel):
    id: str
    po_number: str
    supplier: str
    status: str
    total_amount: float
    expected_date: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str
    items: List[dict]
    product_name: Optional[str] = None  # 첫 번째 품목명
    currency: Optional[str] = None  # 통화 정보

@router.get("/", response_model=List[PurchaseOrderResponse])
def get_purchase_orders(
    status: Optional[str] = Query(None),
    supplier: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    발주서 목록 조회
    """
    query = db.query(PurchaseOrder)
    
    if status:
        query = query.filter(PurchaseOrder.status == status)
    if supplier:
        query = query.filter(PurchaseOrder.supplier.contains(supplier))
    
    orders = query.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for order in orders:
        # 발주 항목 조회
        items = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.po_id == order.id
        ).all()
        
        items_data = []
        product_name = ""  # 첫 번째 품목명 저장용
        currency = "KRW"  # 기본 통화
        for item in items:
            product = db.query(Product).filter(Product.product_code == item.product_code).first()
            if product:
                if not product_name:  # 첫 번째 품목명 저장
                    product_name = product.product_name
                # 첫 번째 제품의 구매 통화 저장
                if hasattr(product, 'purchase_currency') and product.purchase_currency:
                    currency = product.purchase_currency
            items_data.append({
                "id": str(item.id),
                "product_code": item.product_code,
                "product_name": product.product_name if product else "",
                "ordered_quantity": item.ordered_quantity,
                "received_quantity": item.received_quantity,
                "unit_price": float(item.unit_price),
                "subtotal": float(item.ordered_quantity * item.unit_price),
                "status": item.status
            })
        
        result.append({
            "id": str(order.id),
            "po_number": order.po_number,
            "supplier": order.supplier,
            "status": order.status,
            "total_amount": float(order.total_amount),
            "expected_date": order.expected_date.isoformat() if order.expected_date else None,
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat(),
            "items": items_data,
            "product_name": product_name,  # 첫 번째 품목명 추가
            "currency": currency  # 통화 정보 추가
        })
    
    return result

@router.post("/", response_model=PurchaseOrderResponse)
def create_purchase_order(
    order_data: PurchaseOrderCreate,
    db: Session = Depends(get_db)
):
    """
    새 발주서 생성
    """
    # PO 번호 생성 (연도-월-순번 형식)
    today = datetime.now()
    po_prefix = f"PO{today.year}{today.month:02d}"
    
    # 이번 달 마지막 발주서 번호 찾기
    last_order = db.query(PurchaseOrder).filter(
        PurchaseOrder.po_number.like(f"{po_prefix}%")
    ).order_by(PurchaseOrder.po_number.desc()).first()
    
    if last_order:
        last_num = int(last_order.po_number[-4:])
        new_num = last_num + 1
    else:
        new_num = 1
    
    po_number = f"{po_prefix}{new_num:04d}"
    
    # 발주서 생성
    order = PurchaseOrder(
        po_number=po_number,
        supplier=order_data.supplier,
        status="draft",
        expected_date=order_data.expected_date,
        notes=order_data.notes,
        total_amount=0
    )
    
    db.add(order)
    db.flush()  # ID 생성
    
    # 발주 항목 추가
    total_amount = 0
    items_data = []
    
    for item_data in order_data.items:
        item = PurchaseOrderItem(
            po_id=order.id,
            product_code=item_data.product_code,
            ordered_quantity=item_data.ordered_quantity,
            unit_price=item_data.unit_price,
            status="pending"
        )
        db.add(item)
        total_amount += item_data.ordered_quantity * item_data.unit_price
        
        # 제품 정보 가져오기
        product = db.query(Product).filter(Product.product_code == item.product_code).first()
        items_data.append({
            "id": str(item.id),
            "product_code": item.product_code,
            "product_name": product.product_name if product else "",
            "ordered_quantity": item.ordered_quantity,
            "received_quantity": 0,
            "unit_price": float(item.unit_price),
            "subtotal": float(item.ordered_quantity * item.unit_price),
            "status": item.status
        })
    
    # 총 금액 업데이트
    order.total_amount = total_amount
    
    db.commit()
    db.refresh(order)
    
    # 첫 번째 제품의 통화 정보 가져오기
    currency = "KRW"
    product_name = ""
    if items_data:
        first_product = db.query(Product).filter(Product.product_code == items_data[0]["product_code"]).first()
        if first_product:
            product_name = first_product.product_name
            if hasattr(first_product, 'purchase_currency') and first_product.purchase_currency:
                currency = first_product.purchase_currency
    
    return {
        "id": str(order.id),
        "po_number": order.po_number,
        "supplier": order.supplier,
        "status": order.status,
        "total_amount": float(order.total_amount),
        "expected_date": order.expected_date.isoformat() if order.expected_date else None,
        "notes": order.notes,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "items": items_data,
        "product_name": product_name,
        "currency": currency
    }

@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: str,
    db: Session = Depends(get_db)
):
    """
    발주서 상세 조회
    """
    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == uuid.UUID(po_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="발주서를 찾을 수 없습니다")
    
    # 발주 항목 조회
    items = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.po_id == order.id
    ).all()
    
    items_data = []
    currency = "KRW"
    product_name = ""
    for item in items:
        product = db.query(Product).filter(Product.product_code == item.product_code).first()
        if product:
            if not product_name:
                product_name = product.product_name
            if hasattr(product, 'purchase_currency') and product.purchase_currency:
                currency = product.purchase_currency
        items_data.append({
            "id": str(item.id),
            "product_code": item.product_code,
            "product_name": product.product_name if product else "",
            "ordered_quantity": item.ordered_quantity,
            "received_quantity": item.received_quantity,
            "unit_price": float(item.unit_price),
            "subtotal": float(item.ordered_quantity * item.unit_price),
            "status": item.status
        })
    
    return {
        "id": str(order.id),
        "po_number": order.po_number,
        "supplier": order.supplier,
        "status": order.status,
        "total_amount": float(order.total_amount),
        "expected_date": order.expected_date.isoformat() if order.expected_date else None,
        "notes": order.notes,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "items": items_data,
        "product_name": product_name,
        "currency": currency
    }

@router.put("/{po_id}")
def update_purchase_order(
    po_id: str,
    order_data: PurchaseOrderUpdate,
    db: Session = Depends(get_db)
):
    """
    발주서 전체 정보 수정
    """
    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == uuid.UUID(po_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="발주서를 찾을 수 없습니다")
    
    # 발주서 기본 정보 업데이트
    if order_data.supplier is not None:
        order.supplier = order_data.supplier
    if order_data.status is not None:
        if order_data.status not in ['draft', 'pending', 'partial', 'completed', 'cancelled']:
            raise HTTPException(status_code=400, detail="유효하지 않은 상태입니다")
        order.status = order_data.status
    if order_data.expected_date is not None:
        order.expected_date = order_data.expected_date
    if order_data.notes is not None:
        order.notes = order_data.notes
    
    # 발주 항목 업데이트
    if order_data.items is not None:
        total_amount = 0
        for item_data in order_data.items:
            if item_data.item_id:
                # 기존 항목 업데이트
                item = db.query(PurchaseOrderItem).filter(
                    PurchaseOrderItem.id == uuid.UUID(item_data.item_id)
                ).first()
                if item:
                    item.product_code = item_data.product_code
                    item.ordered_quantity = item_data.ordered_quantity
                    item.unit_price = item_data.unit_price
                    total_amount += item_data.ordered_quantity * item_data.unit_price
            else:
                # 새 항목 추가 (필요한 경우)
                new_item = PurchaseOrderItem(
                    po_id=order.id,
                    product_code=item_data.product_code,
                    ordered_quantity=item_data.ordered_quantity,
                    unit_price=item_data.unit_price,
                    status="pending"
                )
                db.add(new_item)
                total_amount += item_data.ordered_quantity * item_data.unit_price
        
        # 총 금액 업데이트
        order.total_amount = total_amount
    
    db.commit()
    db.refresh(order)
    
    # 응답 데이터 구성
    items = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.po_id == order.id
    ).all()
    
    items_data = []
    product_name = ""
    currency = "KRW"  # 기본값
    
    for item in items:
        product = db.query(Product).filter(Product.product_code == item.product_code).first()
        if product:
            if not product_name:
                product_name = product.product_name
            # 제품의 구매 통화 정보 가져오기
            if product.purchase_currency:
                currency = product.purchase_currency
                
        items_data.append({
            "id": str(item.id),
            "product_code": item.product_code,
            "product_name": product.product_name if product else "",
            "ordered_quantity": item.ordered_quantity,
            "received_quantity": item.received_quantity,
            "unit_price": float(item.unit_price),
            "subtotal": float(item.ordered_quantity * item.unit_price),
            "status": item.status,
            "currency": currency
        })
    
    return {
        "id": str(order.id),
        "po_number": order.po_number,
        "supplier": order.supplier,
        "status": order.status,
        "total_amount": float(order.total_amount),
        "expected_date": order.expected_date.isoformat() if order.expected_date else None,
        "notes": order.notes,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "items": items_data,
        "product_name": product_name,
        "currency": currency
    }

@router.put("/{po_id}/status")
def update_purchase_order_status(
    po_id: str,
    status: str,
    db: Session = Depends(get_db)
):
    """
    발주서 상태 업데이트
    """
    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == uuid.UUID(po_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="발주서를 찾을 수 없습니다")
    
    if status not in ['draft', 'ordered', 'partial', 'completed', 'cancelled']:
        raise HTTPException(status_code=400, detail="유효하지 않은 상태입니다")
    
    order.status = status
    db.commit()
    
    return {"message": f"발주서 상태가 {status}로 변경되었습니다"}

@router.post("/{po_id}/receive")
def receive_purchase_order_items(
    po_id: str,
    received_items: List[dict],
    db: Session = Depends(get_db)
):
    """
    발주 제품 입고 처리
    """
    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == uuid.UUID(po_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="발주서를 찾을 수 없습니다")
    
    for received_item in received_items:
        item = db.query(PurchaseOrderItem).filter(
            PurchaseOrderItem.id == uuid.UUID(received_item['item_id'])
        ).first()
        
        if item:
            item.received_quantity += received_item['quantity']
            
            # 상태 업데이트
            if item.received_quantity >= item.ordered_quantity:
                item.status = 'received'
            elif item.received_quantity > 0:
                item.status = 'partial'
            
            # 제품 재고 업데이트
            product = db.query(Product).filter(Product.product_code == item.product_code).first()
            if product:
                product.current_stock += received_item['quantity']
    
    # 발주서 상태 확인 및 업데이트
    all_items = db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.po_id == order.id
    ).all()
    
    if all(item.status == 'received' for item in all_items):
        order.status = 'completed'
    elif any(item.status in ['partial', 'received'] for item in all_items):
        order.status = 'partial'
    
    db.commit()
    
    return {"message": "입고 처리가 완료되었습니다"}

@router.delete("/{po_id}")
def delete_purchase_order(
    po_id: str,
    db: Session = Depends(get_db)
):
    """
    발주서 삭제 (취소 처리)
    상태를 'cancelled'로 변경하거나 완전 삭제
    """
    order = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == uuid.UUID(po_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="발주서를 찾을 수 없습니다")
    
    # 이미 입고 처리가 시작된 경우 삭제 불가
    if order.status in ['partial', 'completed']:
        raise HTTPException(
            status_code=400, 
            detail="입고가 진행된 발주서는 삭제할 수 없습니다. 대신 취소 상태로 변경해주세요."
        )
    
    # 발주서와 연관된 항목들 삭제
    db.query(PurchaseOrderItem).filter(
        PurchaseOrderItem.po_id == order.id
    ).delete()
    
    # 발주서 삭제
    db.delete(order)
    db.commit()
    
    return {"message": "발주서가 삭제되었습니다"}