"""
Product Service Layer
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException, status

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class ProductService:
    """Product business logic service"""
    
    @staticmethod
    def get_products(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: bool = True
    ) -> List[Product]:
        """Get list of products with filters"""
        query = db.query(Product)
        
        # 활성 상태 필터
        if is_active is not None:
            query = query.filter(Product.is_active == is_active)
        
        # 카테고리 필터
        if category:
            query = query.filter(Product.category == category)
        
        # 검색 필터
        if search:
            search_filter = or_(
                Product.product_code.ilike(f"%{search}%"),
                Product.product_name.ilike(f"%{search}%"),
                Product.manufacturer.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        return query.offset(skip).limit(limit).all()
    
    @staticmethod
    def get_product(db: Session, product_id: UUID) -> Optional[Product]:
        """Get single product by ID"""
        return db.query(Product).filter(Product.id == product_id).first()
    
    @staticmethod
    def get_product_by_code(db: Session, product_code: str) -> Optional[Product]:
        """Get product by product code"""
        return db.query(Product).filter(Product.product_code == product_code).first()
    
    @staticmethod
    def create_product(db: Session, product_create: ProductCreate) -> Product:
        """Create new product"""
        # 중복 체크
        existing = ProductService.get_product_by_code(db, product_create.product_code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product with code {product_create.product_code} already exists"
            )
        
        # 제품 생성
        product = Product(**product_create.model_dump())
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
    
    @staticmethod
    def update_product(
        db: Session, 
        product_id: UUID, 
        product_update: ProductUpdate
    ) -> Product:
        """Update existing product"""
        product = ProductService.get_product(db, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found"
            )
        
        # 업데이트할 필드만 적용
        update_data = product_update.model_dump(exclude_unset=True)
        
        # 제품코드 변경시 중복 체크
        if "product_code" in update_data and update_data["product_code"] != product.product_code:
            existing = ProductService.get_product_by_code(db, update_data["product_code"])
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product with code {update_data['product_code']} already exists"
                )
        
        for field, value in update_data.items():
            setattr(product, field, value)
        
        db.commit()
        db.refresh(product)
        return product
    
    @staticmethod
    def delete_product(db: Session, product_id: UUID) -> bool:
        """Delete product (soft delete)"""
        product = ProductService.get_product(db, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found"
            )
        
        # Soft delete
        product.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def count_products(
        db: Session,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: bool = True
    ) -> int:
        """Count total products with filters"""
        query = db.query(func.count(Product.id))
        
        if is_active is not None:
            query = query.filter(Product.is_active == is_active)
        
        if category:
            query = query.filter(Product.category == category)
        
        if search:
            search_filter = or_(
                Product.product_code.ilike(f"%{search}%"),
                Product.product_name.ilike(f"%{search}%"),
                Product.manufacturer.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        return query.scalar()
    
    @staticmethod
    def calculate_safety_stock(db: Session, product_id: UUID) -> int:
        """Calculate safety stock based on 3-month average"""
        # TODO: Implement safety stock calculation based on transaction history
        # For now, return a default value
        return 10