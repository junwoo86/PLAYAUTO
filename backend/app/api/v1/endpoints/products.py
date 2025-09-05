"""
Product API Endpoints
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_db
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
)
from app.schemas.common import MessageResponse
from app.services.product_service import ProductService

router = APIRouter()


@router.get("/", response_model=ProductListResponse)
def get_products(
    skip: int = Query(0, ge=0, description="Skip records"),
    limit: int = Query(20, ge=1, le=100, description="Limit records"),
    search: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
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
        category=category
    )
    
    total = ProductService.count_products(
        db=db,
        search=search,
        category=category
    )
    
    # Convert to response model
    product_responses = [ProductResponse.model_validate(p) for p in products]
    
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


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: UUID,
    db: Session = Depends(get_current_db)
):
    """
    Get single product by ID
    """
    product = ProductService.get_product(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found"
        )
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    product_update: ProductUpdate,
    db: Session = Depends(get_current_db)
):
    """
    Update existing product
    """
    product = ProductService.update_product(db, product_id, product_update)
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", response_model=MessageResponse)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_current_db)
):
    """
    Delete product (soft delete)
    """
    success = ProductService.delete_product(db, product_id)
    if success:
        return MessageResponse(
            success=True,
            message=f"Product {product_id} deleted successfully"
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to delete product"
    )


@router.post("/{product_id}/calculate-safety-stock", response_model=MessageResponse)
def calculate_safety_stock(
    product_id: UUID,
    db: Session = Depends(get_current_db)
):
    """
    Calculate and update safety stock for a product
    """
    product = ProductService.get_product(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with id {product_id} not found"
        )
    
    safety_stock = ProductService.calculate_safety_stock(db, product_id)
    product.safety_stock = safety_stock
    product.is_auto_calculated = True
    db.commit()
    
    return MessageResponse(
        success=True,
        message=f"Safety stock calculated: {safety_stock}"
    )