"""
제품 BOM API 엔드포인트
세트 상품 구성 관리를 위한 API
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.models import ProductBOM, Product
from app.services.transaction_service import TransactionService
from app.schemas.transaction import TransactionCreate
from app.core.timezone_utils import get_current_utc_time

router = APIRouter()

# Pydantic 모델
class ProductBOMCreate(BaseModel):
    parent_product_code: str
    child_product_code: str
    quantity: int

class ProductBOMResponse(BaseModel):
    id: UUID
    parent_product_code: str
    child_product_code: str
    child_product_name: str
    quantity: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class ProductBOMListResponse(BaseModel):
    items: List[ProductBOMResponse]
    total: int

@router.get("/", response_model=ProductBOMListResponse)
def get_product_boms(
    parent_product_code: Optional[str] = Query(None),
    child_product_code: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    제품 BOM 목록 조회
    """
    # BOM 데이터 조회
    query = db.query(ProductBOM)

    if parent_product_code:
        query = query.filter(ProductBOM.parent_product_code == parent_product_code)
    if child_product_code:
        query = query.filter(ProductBOM.child_product_code == child_product_code)

    boms = query.all()

    # 응답 아이템 생성
    response_items = []
    for bom in boms:
        # child product name 조회
        child_product = db.query(Product).filter(
            Product.product_code == bom.child_product_code
        ).first()

        child_product_name = child_product.product_name if child_product else "Unknown"

        response_items.append(ProductBOMResponse(
            id=bom.id,
            parent_product_code=bom.parent_product_code,
            child_product_code=bom.child_product_code,
            child_product_name=child_product_name,
            quantity=bom.quantity,
            created_at=bom.created_at,
            updated_at=bom.updated_at
        ))

    return ProductBOMListResponse(
        items=response_items,
        total=len(response_items)
    )

@router.post("/", response_model=ProductBOMResponse)
def create_product_bom(
    bom_data: ProductBOMCreate,
    db: Session = Depends(get_db)
):
    """
    제품 BOM 생성
    """
    # 부모 제품 존재 확인
    parent_product = db.query(Product).filter(
        Product.product_code == bom_data.parent_product_code
    ).first()

    if not parent_product:
        raise HTTPException(status_code=404, detail="Parent product not found")

    # 자식 제품 존재 확인
    child_product = db.query(Product).filter(
        Product.product_code == bom_data.child_product_code
    ).first()

    if not child_product:
        raise HTTPException(status_code=404, detail="Child product not found")

    # 순환 참조 방지
    if bom_data.parent_product_code == bom_data.child_product_code:
        raise HTTPException(status_code=400, detail="Parent and child cannot be the same")

    # 중복 확인
    existing_bom = db.query(ProductBOM).filter(
        and_(
            ProductBOM.parent_product_code == bom_data.parent_product_code,
            ProductBOM.child_product_code == bom_data.child_product_code
        )
    ).first()

    if existing_bom:
        raise HTTPException(status_code=400, detail="BOM already exists")

    # BOM 생성
    new_bom = ProductBOM(
        parent_product_code=bom_data.parent_product_code,
        child_product_code=bom_data.child_product_code,
        quantity=bom_data.quantity
    )

    db.add(new_bom)
    db.commit()
    db.refresh(new_bom)

    return ProductBOMResponse(
        id=new_bom.id,
        parent_product_code=new_bom.parent_product_code,
        child_product_code=new_bom.child_product_code,
        child_product_name=child_product.product_name,
        quantity=new_bom.quantity,
        created_at=new_bom.created_at,
        updated_at=new_bom.updated_at
    )

@router.delete("/{bom_id}")
def delete_product_bom(
    bom_id: UUID,
    db: Session = Depends(get_db)
):
    """
    제품 BOM 삭제
    """
    bom = db.query(ProductBOM).filter(ProductBOM.id == bom_id).first()

    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    db.delete(bom)
    db.commit()

    return {"message": "BOM deleted successfully"}

@router.post("/assemble")
def assemble_set_products(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    세트 제품 조립
    """
    product_code = data.get('product_code')
    quantity = data.get('quantity', 1)

    # 세트 제품 확인
    set_product = db.query(Product).filter(Product.product_code == product_code).first()
    if not set_product:
        raise HTTPException(status_code=404, detail="Set product not found")

    # BOM 데이터 가져오기
    boms = db.query(ProductBOM).filter(ProductBOM.parent_product_code == product_code).all()
    if not boms:
        raise HTTPException(status_code=400, detail="No BOM data found for this set")

    # 구성 부품의 재고 확인
    for bom in boms:
        child_product = db.query(Product).filter(
            Product.product_code == bom.child_product_code
        ).first()

        if not child_product:
            raise HTTPException(
                status_code=404,
                detail=f"Child product {bom.child_product_code} not found"
            )

        required_quantity = bom.quantity * quantity
        if child_product.current_stock < required_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {child_product.product_name}. Need {required_quantity}, have {child_product.current_stock}"
            )

    # 트랜잭션 시작 - 재고 업데이트 및 트랜잭션 기록
    try:
        # 1. 세트 제품 입고 트랜잭션 생성
        set_transaction = TransactionCreate(
            transaction_type="IN",
            product_code=set_product.product_code,
            quantity=quantity,
            reason="세트 조립",
            created_by="system",
            transaction_date=get_current_utc_time()
        )
        TransactionService.create_transaction(db, set_transaction, "system")

        # 2. 구성 부품 출고 트랜잭션 생성
        for bom in boms:
            child_product = db.query(Product).filter(
                Product.product_code == bom.child_product_code
            ).first()

            # 부품 출고 트랜잭션
            component_transaction = TransactionCreate(
                transaction_type="OUT",
                product_code=bom.child_product_code,
                quantity=bom.quantity * quantity,
                reason=f"{set_product.product_code}_{set_product.product_name}_세트 조립",
                created_by="system",
                transaction_date=get_current_utc_time()
            )
            TransactionService.create_transaction(db, component_transaction, "system")

        db.commit()

        # 업데이트된 세트 제품 정보 다시 조회
        db.refresh(set_product)

        return {
            "success": True,
            "message": f"Successfully assembled {quantity} set(s)",
            "set_product": {
                "product_code": set_product.product_code,
                "product_name": set_product.product_name,
                "new_quantity": set_product.current_stock
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disassemble")
def disassemble_set_products(
    data: dict,
    db: Session = Depends(get_db)
):
    """
    세트 제품 해체
    """
    product_code = data.get('product_code')
    quantity = data.get('quantity', 1)

    # 세트 제품 확인
    set_product = db.query(Product).filter(Product.product_code == product_code).first()
    if not set_product:
        raise HTTPException(status_code=404, detail="Set product not found")

    # 세트 재고 확인
    if set_product.current_stock < quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient set stock. Need {quantity}, have {set_product.current_stock}"
        )

    # BOM 데이터 가져오기
    boms = db.query(ProductBOM).filter(ProductBOM.parent_product_code == product_code).all()
    if not boms:
        raise HTTPException(status_code=400, detail="No BOM data found for this set")

    # 트랜잭션 시작 - 재고 업데이트 및 트랜잭션 기록
    try:
        # 1. 세트 제품 출고 트랜잭션 생성
        set_transaction = TransactionCreate(
            transaction_type="OUT",
            product_code=set_product.product_code,
            quantity=quantity,
            reason="세트 해체",
            created_by="system",
            transaction_date=get_current_utc_time()
        )
        TransactionService.create_transaction(db, set_transaction, "system")

        # 2. 구성 부품 입고 트랜잭션 생성
        for bom in boms:
            child_product = db.query(Product).filter(
                Product.product_code == bom.child_product_code
            ).first()

            if not child_product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Child product {bom.child_product_code} not found"
                )

            # 부품 입고 트랜잭션
            component_transaction = TransactionCreate(
                transaction_type="IN",
                product_code=bom.child_product_code,
                quantity=bom.quantity * quantity,
                reason="세트 해체",
                created_by="system",
                transaction_date=get_current_utc_time()
            )
            TransactionService.create_transaction(db, component_transaction, "system")

        db.commit()

        # 업데이트된 세트 제품 정보 다시 조회
        db.refresh(set_product)

        return {
            "success": True,
            "message": f"Successfully disassembled {quantity} set(s)",
            "set_product": {
                "product_code": set_product.product_code,
                "product_name": set_product.product_name,
                "new_quantity": set_product.current_stock
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))