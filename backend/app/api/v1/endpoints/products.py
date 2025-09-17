"""
Product API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.deps import get_current_db
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    PastQuantityResponse
)
from app.schemas.common import MessageResponse
from app.services.product_service import ProductService
from app.models.transaction import Transaction
from app.models.warehouse import Warehouse
from sqlalchemy import and_, func
from datetime import datetime, timedelta, date

router = APIRouter()


@router.get("/", response_model=ProductListResponse)
def get_products(
    skip: int = Query(0, ge=0, description="Skip records"),
    limit: int = Query(20, ge=1, le=100, description="Limit records"),
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    warehouse_id: Optional[UUID] = Query(None, description="Filter by warehouse"),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    db: Session = Depends(get_current_db)
):
    """
    Get list of products with pagination and filters
    """
    products = ProductService.get_products(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        category=category,
        warehouse_id=warehouse_id,
        is_active=is_active
    )
    
    total = ProductService.count_products(
        db=db,
        search=search,
        category=category,
        warehouse_id=warehouse_id,
        is_active=is_active
    )
    
    # Convert to response model with discrepancy info (1주일 이내 조정 이력 기반)
    product_responses = []
    one_week_ago = datetime.now() - timedelta(days=7)
    
    for product in products:
        # 1주일 이내 모든 ADJUST 트랜잭션의 합계 및 개수 조회
        adjustment_stats = db.query(
            func.sum(Transaction.quantity).label('total_adjustment'),
            func.count(Transaction.id).label('adjustment_count')
        ).filter(
            and_(
                Transaction.product_code == product.product_code,
                Transaction.transaction_type == 'ADJUST',
                Transaction.transaction_date >= one_week_ago
            )
        ).first()
        
        # 제품 데이터를 dict로 변환
        product_dict = {
            "product_code": product.product_code,
            "product_name": product.product_name,
            "barcode": product.barcode,  # 바코드 필드 추가
            "category": product.category,
            "manufacturer": product.manufacturer,
            "supplier": product.supplier,
            "supplier_email": product.supplier_email,
            "contact_email": product.contact_email,  # 담당자 이메일 필드 추가
            "order_email_template": product.order_email_template,
            "zone_id": product.zone_id,
            "unit": product.unit,
            "warehouse_id": product.warehouse_id,
            "purchase_currency": product.purchase_currency or "KRW",
            "sale_currency": product.sale_currency or "KRW",
            "purchase_price": product.purchase_price or 0,
            "sale_price": product.sale_price or 0,
            "current_stock": product.current_stock or 0,
            "safety_stock": product.safety_stock or 0,
            "is_auto_calculated": product.is_auto_calculated if product.is_auto_calculated is not None else False,
            "moq": product.moq or 1,
            "lead_time_days": product.lead_time_days or 7,
            "memo": product.memo,  # 메모 필드 추가
            "is_active": product.is_active if product.is_active is not None else True,
            "created_at": product.created_at,
            "updated_at": product.updated_at,
            "warehouse_name": None
        }

        # 창고 정보 추가
        if product.warehouse_id:
            warehouse = db.query(Warehouse).filter(Warehouse.id == product.warehouse_id).first()
            if warehouse:
                product_dict['warehouse_name'] = warehouse.name

        # BOM 정보 추가
        from app.models.product_bom import ProductBOM
        bom_items = db.query(ProductBOM).filter(
            ProductBOM.parent_product_code == product.product_code
        ).all()

        product_dict['bom'] = [
            {
                'child_product_code': item.child_product_code,
                'quantity': item.quantity
            }
            for item in bom_items
        ] if bom_items else []

        if adjustment_stats and adjustment_stats.total_adjustment is not None:
            # 7일간 모든 조정의 합계
            product_dict['discrepancy'] = int(adjustment_stats.total_adjustment)
            product_dict['has_pending_discrepancy'] = True
            # 조정 건수 정보를 last_discrepancy_date 대신 저장
            product_dict['discrepancy_count'] = int(adjustment_stats.adjustment_count or 0)
            product_dict['last_discrepancy_date'] = None  # 더 이상 사용하지 않음
        else:
            product_dict['discrepancy'] = 0
            product_dict['has_pending_discrepancy'] = False
            product_dict['discrepancy_count'] = 0
            product_dict['last_discrepancy_date'] = None

        product_responses.append(ProductResponse(**product_dict))
    
    return ProductListResponse(
        data=product_responses,
        pagination={
            "page": skip // limit + 1,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    )


@router.post("/", response_model=ProductResponse)
def create_product(
    product_create: ProductCreate,
    db: Session = Depends(get_current_db)
):
    """
    Create new product
    """
    product = ProductService.create_product(db, product_create)
    return ProductResponse.model_validate(product)


@router.get("/check-duplicate/{product_code}", response_model=dict)
def check_product_code_duplicate(
    product_code: str,
    current_code: Optional[str] = Query(None, description="Current product code for edit mode"),
    db: Session = Depends(get_current_db)
):
    """
    Check if product code already exists (for real-time validation)
    """
    # 수정 모드에서 현재 코드와 같으면 중복이 아님
    if current_code and current_code == product_code:
        return {"isDuplicate": False, "message": "현재 제품 코드입니다"}
    
    existing = ProductService.get_product_by_code(db, product_code)
    is_duplicate = existing is not None
    
    return {
        "isDuplicate": is_duplicate,
        "message": "이미 존재하는 제품 코드입니다" if is_duplicate else "사용 가능한 제품 코드입니다"
    }


@router.get("/{product_code}", response_model=ProductResponse)
def get_product(
    product_code: str,
    db: Session = Depends(get_current_db)
):
    """
    Get single product by product code
    """
    product = ProductService.get_product_by_code(db, product_code)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with code {product_code} not found"
        )
    
    # 1주일 이내 모든 조정 이력의 합계 조회
    one_week_ago = datetime.now() - timedelta(days=7)
    adjustment_stats = db.query(
        func.sum(Transaction.quantity).label('total_adjustment'),
        func.count(Transaction.id).label('adjustment_count')
    ).filter(
        and_(
            Transaction.product_code == product_code,
            Transaction.transaction_type == 'ADJUST',
            Transaction.transaction_date >= one_week_ago
        )
    ).first()
    
    product_dict = ProductResponse.model_validate(product).__dict__
    
    if adjustment_stats and adjustment_stats.total_adjustment is not None:
        product_dict['discrepancy'] = int(adjustment_stats.total_adjustment)
        product_dict['has_pending_discrepancy'] = True
        product_dict['discrepancy_count'] = adjustment_stats.adjustment_count
        product_dict['last_discrepancy_date'] = None
    else:
        product_dict['discrepancy'] = 0
        product_dict['has_pending_discrepancy'] = False
        product_dict['discrepancy_count'] = 0
        product_dict['last_discrepancy_date'] = None
    
    return ProductResponse(**product_dict)


@router.put("/{product_code}", response_model=ProductResponse)
def update_product(
    product_code: str,
    product_update: ProductUpdate,
    db: Session = Depends(get_current_db)
):
    """
    Update existing product
    """
    product = ProductService.update_product_by_code(db, product_code, product_update)
    return ProductResponse.model_validate(product)


@router.delete("/{product_code}", response_model=MessageResponse)
def delete_product(
    product_code: str,
    db: Session = Depends(get_current_db)
):
    """
    Delete product (soft delete)
    """
    success = ProductService.delete_product_by_code(db, product_code)
    if success:
        return MessageResponse(
            success=True,
            message=f"Product {product_code} deleted successfully"
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to delete product"
    )


@router.post("/{product_code}/calculate-safety-stock", response_model=MessageResponse)
def calculate_safety_stock(
    product_code: str,
    db: Session = Depends(get_current_db)
):
    """
    Calculate and update safety stock for a product
    """
    product = ProductService.get_product_by_code(db, product_code)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with code {product_code} not found"
        )
    
    safety_stock = ProductService.calculate_safety_stock_by_code(db, product_code)
    product.safety_stock = safety_stock
    product.is_auto_calculated = True
    db.commit()
    
    return MessageResponse(
        success=True,
        message=f"Safety stock calculated: {safety_stock}"
    )


@router.get("/past-quantity", response_model=PastQuantityResponse)
def get_past_quantity(
    product_code: str = Query(..., description="제품 코드"),
    target_date: date = Query(..., description="조회할 날짜"),
    db: Session = Depends(get_current_db)
):
    """특정 날짜의 제품 수량을 조회합니다."""
    from app.models.product import Product

    # 제품 확인
    product = db.query(Product).filter(Product.product_code == product_code).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"제품 코드 {product_code}를 찾을 수 없습니다"
        )

    # 대상 날짜 이후의 모든 트랜잭션 조회
    target_datetime = datetime.combine(target_date, datetime.max.time())

    transactions = db.query(Transaction).filter(
        and_(
            Transaction.product_code == product_code,
            Transaction.created_at > target_datetime
        )
    ).order_by(Transaction.created_at).all()

    # 현재 재고에서 역산
    calculated_quantity = product.current_stock

    for transaction in transactions:
        if transaction.transaction_type == "IN":
            calculated_quantity -= transaction.quantity
        elif transaction.transaction_type == "OUT":
            calculated_quantity += transaction.quantity
        elif transaction.transaction_type == "adjustment":
            calculated_quantity -= transaction.quantity
        elif transaction.transaction_type == "return":
            calculated_quantity += transaction.quantity

    # 해당 날짜의 트랜잭션 내역
    day_transactions = db.query(Transaction).filter(
        and_(
            Transaction.product_code == product_code,
            func.date(Transaction.created_at) == target_date
        )
    ).all()

    transaction_summary = []
    for trans in day_transactions:
        transaction_summary.append({
            "transaction_type": trans.transaction_type,
            "quantity": trans.quantity,
            "created_at": trans.created_at.isoformat(),
            "memo": trans.memo
        })

    return PastQuantityResponse(
        product_code=product_code,
        product_name=product.product_name,
        target_date=target_date,
        quantity=max(0, calculated_quantity),
        current_stock=product.current_stock,
        transactions=transaction_summary
    )