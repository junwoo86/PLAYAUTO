"""
Product Service Layer
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from fastapi import HTTPException, status
from uuid import UUID

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
        warehouse_id: Optional[UUID] = None,
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
        
        # 창고 필터
        if warehouse_id:
            query = query.filter(Product.warehouse_id == warehouse_id)
        
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
    def update_product_by_code(
        db: Session, 
        product_code: str, 
        product_update: ProductUpdate
    ) -> Product:
        """Update existing product by product code"""
        product = ProductService.get_product_by_code(db, product_code)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with code {product_code} not found"
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
    def delete_product_by_code(db: Session, product_code: str) -> bool:
        """Delete product by code (soft delete)"""
        product = ProductService.get_product_by_code(db, product_code)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with code {product_code} not found"
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
        warehouse_id: Optional[UUID] = None,
        is_active: bool = True
    ) -> int:
        """Count total products with filters"""
        query = db.query(func.count(Product.product_code))
        
        if is_active is not None:
            query = query.filter(Product.is_active == is_active)
        
        if category:
            query = query.filter(Product.category == category)
        
        if warehouse_id:
            query = query.filter(Product.warehouse_id == warehouse_id)
        
        if search:
            search_filter = or_(
                Product.product_code.ilike(f"%{search}%"),
                Product.product_name.ilike(f"%{search}%"),
                Product.manufacturer.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        return query.scalar()
    
    @staticmethod
    def calculate_safety_stock_by_code(db: Session, product_code: str) -> int:
        """Calculate safety stock by product code based on 3-month average"""
        from app.services.transaction_service import TransactionService
        return TransactionService.calculate_safety_stock(db, product_code)

    @staticmethod
    def get_products_optimized(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        category: Optional[str] = None,
        warehouse_id: Optional[UUID] = None,
        is_active: bool = True
    ) -> List[Product]:
        """최적화된 제품 목록 조회 - eager loading 사용"""
        query = db.query(Product).options(joinedload(Product.warehouse))

        # 활성 상태 필터
        if is_active is not None:
            query = query.filter(Product.is_active == is_active)

        # 카테고리 필터
        if category:
            query = query.filter(Product.category == category)

        # 창고 필터
        if warehouse_id:
            query = query.filter(Product.warehouse_id == warehouse_id)

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
    def update_auto_safety_stocks(db: Session) -> dict:
        """
        모든 활성화 제품의 안전 재고량 자동 계산 활성화 및 업데이트

        3개월 이전에 출고 이력이 있는 제품:
        - is_auto_calculated = True
        - safety_stock 자동 계산

        3개월 이전 출고 이력이 없는 제품:
        - is_auto_calculated = False

        Returns:
            dict: {
                "total_products": 전체 제품 수,
                "updated_count": 자동 계산 활성화된 수,
                "disabled_count": 자동 계산 비활성화된 수,
                "errors": 오류 목록
            }
        """
        from app.services.transaction_service import TransactionService
        from datetime import timedelta
        from app.core.timezone_utils import get_current_utc_time
        from app.models.transaction import Transaction

        # 모든 활성화 제품 조회
        products = db.query(Product).filter(Product.is_active == True).all()

        total_products = len(products)
        updated_count = 0
        disabled_count = 0
        errors = []

        # 3개월 전 날짜
        three_months_ago = get_current_utc_time() - timedelta(days=90)

        for product in products:
            try:
                # 3개월 이전에 출고 이력이 있는지 확인
                has_old_outbound = db.query(Transaction).filter(
                    Transaction.product_code == product.product_code,
                    Transaction.transaction_type == "OUT",
                    Transaction.transaction_date < three_months_ago
                ).first() is not None

                if has_old_outbound:
                    # 자동 계산 활성화
                    product.is_auto_calculated = True

                    # 안전 재고량 계산
                    safety_stock = TransactionService.calculate_safety_stock(
                        db, product.product_code
                    )

                    if safety_stock > 0:
                        product.safety_stock = safety_stock
                        updated_count += 1
                else:
                    # 자동 계산 비활성화
                    product.is_auto_calculated = False
                    disabled_count += 1

            except Exception as e:
                errors.append({
                    "product_code": product.product_code,
                    "error": str(e)
                })

        # 변경사항 커밋
        db.commit()

        return {
            "total_products": total_products,
            "updated_count": updated_count,
            "disabled_count": disabled_count,
            "errors": errors
        }