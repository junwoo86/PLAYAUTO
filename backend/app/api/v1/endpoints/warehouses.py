"""
Warehouse API endpoints
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from app.core.database import get_db
from app.models.warehouse import Warehouse
from app.models.product import Product
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseUpdate,
    WarehouseResponse,
    WarehouseListResponse
)

router = APIRouter()

@router.get("/", response_model=WarehouseListResponse)
def get_warehouses(
    page: int = Query(1, ge=1, description="페이지 번호"),
    limit: int = Query(20, ge=1, le=100, description="페이지당 항목 수"),
    is_active: Optional[bool] = Query(None, description="활성화 상태 필터"),
    search: Optional[str] = Query(None, description="검색어 (창고명, 위치)"),
    db: Session = Depends(get_db)
):
    """창고 목록 조회"""
    query = db.query(Warehouse)
    
    # 필터링
    if is_active is not None:
        query = query.filter(Warehouse.is_active == is_active)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Warehouse.name.ilike(search_term)) |
            (Warehouse.location.ilike(search_term))
        )
    
    # 전체 개수
    total = query.count()
    
    # 페이지네이션
    offset = (page - 1) * limit
    warehouses = query.offset(offset).limit(limit).all()
    
    # 각 창고의 제품 수 계산
    warehouse_responses = []
    for warehouse in warehouses:
        product_count = db.query(Product).filter(
            Product.warehouse_id == warehouse.id
        ).count()
        
        warehouse_dict = warehouse.__dict__.copy()
        warehouse_dict['product_count'] = product_count
        warehouse_responses.append(WarehouseResponse(**warehouse_dict))
    
    return WarehouseListResponse(
        items=warehouse_responses,
        total=total,
        page=page,
        pages=(total + limit - 1) // limit,
        limit=limit
    )

@router.get("/{warehouse_id}", response_model=WarehouseResponse)
def get_warehouse(warehouse_id: UUID, db: Session = Depends(get_db)):
    """창고 상세 조회"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="창고를 찾을 수 없습니다")
    
    # 제품 수 계산
    product_count = db.query(Product).filter(
        Product.warehouse_id == warehouse.id
    ).count()
    
    warehouse_dict = warehouse.__dict__.copy()
    warehouse_dict['product_count'] = product_count
    
    return WarehouseResponse(**warehouse_dict)

@router.post("/", response_model=WarehouseResponse)
def create_warehouse(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db)
):
    """창고 생성"""
    # 중복 이름 체크
    existing = db.query(Warehouse).filter(
        Warehouse.name == warehouse.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 창고명입니다")
    
    try:
        db_warehouse = Warehouse(**warehouse.dict())
        db.add(db_warehouse)
        db.commit()
        db.refresh(db_warehouse)
        
        warehouse_dict = db_warehouse.__dict__.copy()
        warehouse_dict['product_count'] = 0
        
        return WarehouseResponse(**warehouse_dict)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="창고 생성 중 오류가 발생했습니다")

@router.put("/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse(
    warehouse_id: UUID,
    warehouse_update: WarehouseUpdate,
    db: Session = Depends(get_db)
):
    """창고 수정"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="창고를 찾을 수 없습니다")
    
    # 이름 변경 시 중복 체크
    if warehouse_update.name and warehouse_update.name != warehouse.name:
        existing = db.query(Warehouse).filter(
            Warehouse.name == warehouse_update.name,
            Warehouse.id != warehouse_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="이미 존재하는 창고명입니다")
    
    # 업데이트
    for field, value in warehouse_update.dict(exclude_unset=True).items():
        setattr(warehouse, field, value)
    
    try:
        db.commit()
        db.refresh(warehouse)
        
        # 제품 수 계산
        product_count = db.query(Product).filter(
            Product.warehouse_id == warehouse.id
        ).count()
        
        warehouse_dict = warehouse.__dict__.copy()
        warehouse_dict['product_count'] = product_count
        
        return WarehouseResponse(**warehouse_dict)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="창고 수정 중 오류가 발생했습니다")

@router.delete("/{warehouse_id}")
def delete_warehouse(warehouse_id: UUID, db: Session = Depends(get_db)):
    """창고 삭제 (비활성화)"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="창고를 찾을 수 없습니다")
    
    # 해당 창고에 제품이 있는지 확인
    product_count = db.query(Product).filter(
        Product.warehouse_id == warehouse_id,
        Product.is_active == True
    ).count()
    
    if product_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"해당 창고에 {product_count}개의 활성 제품이 있습니다. 먼저 제품을 이동하거나 비활성화해주세요."
        )
    
    # Soft delete (비활성화)
    warehouse.is_active = False
    db.commit()
    
    return {"message": "창고가 비활성화되었습니다", "id": warehouse_id}