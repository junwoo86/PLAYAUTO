"""
Product BOM (Bill of Materials) API 엔드포인트
세트 상품의 구성 요소 관리
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.database import get_db
from app.models.product_bom import ProductBOM
from app.models.product import Product
from app.schemas.product_bom import (
    ProductBOMCreate,
    ProductBOMUpdate,
    ProductBOMResponse,
    ProductBOMListResponse,
    SetProductStockResponse
)

router = APIRouter()


@router.get("/", response_model=ProductBOMListResponse)
async def get_product_boms(
    parent_product_code: Optional[str] = Query(None, description="부모 제품 코드"),
    child_product_code: Optional[str] = Query(None, description="자식 제품 코드"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """
    BOM 목록 조회

    - parent_product_code: 특정 세트 상품의 구성품 조회
    - child_product_code: 특정 제품이 포함된 세트 상품 조회
    """
    query = db.query(ProductBOM)

    if parent_product_code:
        query = query.filter(ProductBOM.parent_product_code == parent_product_code)
    if child_product_code:
        query = query.filter(ProductBOM.child_product_code == child_product_code)

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    # 관련 제품 정보 조회
    bom_responses = []
    for bom in items:
        parent = db.query(Product).filter(Product.product_code == bom.parent_product_code).first()
        child = db.query(Product).filter(Product.product_code == bom.child_product_code).first()

        bom_responses.append({
            "id": bom.id,
            "parent_product_code": bom.parent_product_code,
            "parent_product_name": parent.product_name if parent else None,
            "child_product_code": bom.child_product_code,
            "child_product_name": child.product_name if child else None,
            "quantity": bom.quantity,
            "created_at": bom.created_at,
            "updated_at": bom.updated_at
        })

    return {
        "items": bom_responses,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/set-product-stock/{product_code}", response_model=SetProductStockResponse)
async def get_set_product_stock(
    product_code: str,
    db: Session = Depends(get_db)
):
    """
    세트 상품의 재고 가능 수량 계산
    구성품 재고를 기준으로 생산 가능한 세트 수량 반환
    """
    # BOM 구성 조회
    bom_items = db.query(ProductBOM).filter(
        ProductBOM.parent_product_code == product_code
    ).all()

    if not bom_items:
        raise HTTPException(status_code=404, detail="세트 상품 구성이 없습니다")

    # 각 구성품의 재고로 만들 수 있는 세트 수량 계산
    min_possible_sets = float('inf')
    component_stocks = []

    for bom in bom_items:
        component = db.query(Product).filter(
            Product.product_code == bom.child_product_code
        ).first()

        if not component:
            raise HTTPException(
                status_code=404,
                detail=f"구성품을 찾을 수 없습니다: {bom.child_product_code}"
            )

        # 이 구성품으로 만들 수 있는 세트 수
        possible_sets = component.current_stock // bom.quantity
        min_possible_sets = min(min_possible_sets, possible_sets)

        component_stocks.append({
            "product_code": component.product_code,
            "product_name": component.product_name,
            "required_quantity": bom.quantity,
            "current_stock": component.current_stock,
            "possible_sets": possible_sets
        })

    return {
        "parent_product_code": product_code,
        "possible_sets": int(min_possible_sets) if min_possible_sets != float('inf') else 0,
        "components": component_stocks
    }


@router.post("/", response_model=ProductBOMResponse)
async def create_product_bom(
    bom: ProductBOMCreate,
    db: Session = Depends(get_db)
):
    """
    BOM 생성 (세트 상품 구성 추가)
    """
    # 부모 제품 확인
    parent = db.query(Product).filter(Product.product_code == bom.parent_product_code).first()
    if not parent:
        raise HTTPException(status_code=404, detail=f"부모 제품을 찾을 수 없습니다: {bom.parent_product_code}")

    # 자식 제품 확인
    child = db.query(Product).filter(Product.product_code == bom.child_product_code).first()
    if not child:
        raise HTTPException(status_code=404, detail=f"자식 제품을 찾을 수 없습니다: {bom.child_product_code}")

    # 순환 참조 확인 (자기 자신을 구성품으로 할 수 없음)
    if bom.parent_product_code == bom.child_product_code:
        raise HTTPException(status_code=400, detail="제품은 자기 자신을 구성품으로 가질 수 없습니다")

    # 중복 확인
    existing = db.query(ProductBOM).filter(
        and_(
            ProductBOM.parent_product_code == bom.parent_product_code,
            ProductBOM.child_product_code == bom.child_product_code
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 BOM 구성입니다")

    # BOM 생성
    db_bom = ProductBOM(
        parent_product_code=bom.parent_product_code,
        child_product_code=bom.child_product_code,
        quantity=bom.quantity
    )

    db.add(db_bom)
    db.commit()
    db.refresh(db_bom)

    return {
        "id": db_bom.id,
        "parent_product_code": db_bom.parent_product_code,
        "parent_product_name": parent.product_name,
        "child_product_code": db_bom.child_product_code,
        "child_product_name": child.product_name,
        "quantity": db_bom.quantity,
        "created_at": db_bom.created_at,
        "updated_at": db_bom.updated_at
    }


@router.put("/{bom_id}", response_model=ProductBOMResponse)
async def update_product_bom(
    bom_id: UUID,
    bom_update: ProductBOMUpdate,
    db: Session = Depends(get_db)
):
    """
    BOM 수정 (수량 변경)
    """
    db_bom = db.query(ProductBOM).filter(ProductBOM.id == bom_id).first()
    if not db_bom:
        raise HTTPException(status_code=404, detail="BOM을 찾을 수 없습니다")

    # 수량만 업데이트 가능
    if bom_update.quantity is not None:
        db_bom.quantity = bom_update.quantity

    db.commit()
    db.refresh(db_bom)

    # 관련 제품 정보 조회
    parent = db.query(Product).filter(Product.product_code == db_bom.parent_product_code).first()
    child = db.query(Product).filter(Product.product_code == db_bom.child_product_code).first()

    return {
        "id": db_bom.id,
        "parent_product_code": db_bom.parent_product_code,
        "parent_product_name": parent.product_name if parent else None,
        "child_product_code": db_bom.child_product_code,
        "child_product_name": child.product_name if child else None,
        "quantity": db_bom.quantity,
        "created_at": db_bom.created_at,
        "updated_at": db_bom.updated_at
    }


@router.delete("/{bom_id}")
async def delete_product_bom(
    bom_id: UUID,
    db: Session = Depends(get_db)
):
    """
    BOM 삭제
    """
    db_bom = db.query(ProductBOM).filter(ProductBOM.id == bom_id).first()
    if not db_bom:
        raise HTTPException(status_code=404, detail="BOM을 찾을 수 없습니다")

    db.delete(db_bom)
    db.commit()

    return {"message": "BOM이 삭제되었습니다"}


@router.post("/bulk", response_model=List[ProductBOMResponse])
async def create_bulk_product_bom(
    boms: List[ProductBOMCreate],
    db: Session = Depends(get_db)
):
    """
    BOM 일괄 생성
    세트 상품의 여러 구성품을 한 번에 등록
    """
    created_boms = []

    for bom in boms:
        # 부모 제품 확인
        parent = db.query(Product).filter(Product.product_code == bom.parent_product_code).first()
        if not parent:
            raise HTTPException(status_code=404, detail=f"부모 제품을 찾을 수 없습니다: {bom.parent_product_code}")

        # 자식 제품 확인
        child = db.query(Product).filter(Product.product_code == bom.child_product_code).first()
        if not child:
            raise HTTPException(status_code=404, detail=f"자식 제품을 찾을 수 없습니다: {bom.child_product_code}")

        # 중복 확인
        existing = db.query(ProductBOM).filter(
            and_(
                ProductBOM.parent_product_code == bom.parent_product_code,
                ProductBOM.child_product_code == bom.child_product_code
            )
        ).first()

        if not existing:
            db_bom = ProductBOM(
                parent_product_code=bom.parent_product_code,
                child_product_code=bom.child_product_code,
                quantity=bom.quantity
            )
            db.add(db_bom)
            db.flush()  # ID를 얻기 위해 flush
            created_boms.append({
                "id": db_bom.id,
                "parent_product_code": bom.parent_product_code,
                "parent_product_name": parent.product_name,
                "child_product_code": bom.child_product_code,
                "child_product_name": child.product_name,
                "quantity": bom.quantity,
                "created_at": db_bom.created_at,
                "updated_at": db_bom.updated_at
            })

    db.commit()

    return created_boms