"""
Inventory Analysis API Endpoints
"""
from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.models.product import Product
from app.models.transaction import Transaction
from app.schemas.inventory import InventoryAnalysisResponse

router = APIRouter()


@router.get("/analysis", response_model=InventoryAnalysisResponse)
def get_inventory_analysis(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    category: Optional[str] = Query(None, description="카테고리 필터"),
    db: Session = Depends(get_db)
):
    """재고 분석 정보를 조회합니다."""

    # 기본 날짜 설정 (지난 30일)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # 제품 쿼리
    product_query = db.query(Product)
    if category:
        product_query = product_query.filter(Product.category == category)

    products = product_query.all()

    # 재고 분석 데이터 생성
    inventory_items = []
    total_value = 0
    low_stock_count = 0
    out_of_stock_count = 0

    for product in products:
        # 회전율 계산 (최근 30일 기준)
        out_transactions = db.query(
            func.sum(Transaction.quantity)
        ).filter(
            and_(
                Transaction.product_code == product.product_code,
                Transaction.transaction_type == 'OUT',
                func.date(Transaction.created_at) >= start_date,
                func.date(Transaction.created_at) <= end_date
            )
        ).scalar() or 0

        avg_daily_usage = float(out_transactions) / 30 if out_transactions else 0
        turnover_rate = (avg_daily_usage * 365) / product.current_stock if product.current_stock > 0 else 0

        # 재고 일수 계산
        days_of_stock = product.current_stock / avg_daily_usage if avg_daily_usage > 0 else float('inf')

        # 재고 가치
        inventory_value = float(product.current_stock * product.purchase_price)
        total_value += inventory_value

        # 재고 상태
        if product.current_stock == 0:
            out_of_stock_count += 1
            stock_status = "out_of_stock"
        elif product.current_stock <= product.safety_stock:
            low_stock_count += 1
            stock_status = "low_stock"
        else:
            stock_status = "normal"

        inventory_items.append({
            "product_code": product.product_code,
            "product_name": product.product_name,
            "category": product.category,
            "current_stock": product.current_stock,
            "safety_stock": product.safety_stock,
            "turnover_rate": round(turnover_rate, 2),
            "days_of_stock": round(days_of_stock, 1) if days_of_stock != float('inf') else None,
            "inventory_value": inventory_value,
            "stock_status": stock_status,
            "avg_daily_usage": round(avg_daily_usage, 2)
        })

    # 카테고리별 집계
    category_summary = {}
    for item in inventory_items:
        cat = item['category'] or 'Unknown'
        if cat not in category_summary:
            category_summary[cat] = {
                "category": cat,
                "total_items": 0,
                "total_value": 0,
                "avg_turnover": 0
            }
        category_summary[cat]['total_items'] += 1
        category_summary[cat]['total_value'] += item['inventory_value']
        category_summary[cat]['avg_turnover'] += item['turnover_rate']

    # 평균 계산
    for cat in category_summary:
        if category_summary[cat]['total_items'] > 0:
            category_summary[cat]['avg_turnover'] /= category_summary[cat]['total_items']
            category_summary[cat]['avg_turnover'] = round(category_summary[cat]['avg_turnover'], 2)

    return InventoryAnalysisResponse(
        start_date=datetime.combine(start_date, datetime.min.time()),
        end_date=datetime.combine(end_date, datetime.min.time()),
        total_products=len(products),
        total_inventory_value=total_value,
        low_stock_count=low_stock_count,
        out_of_stock_count=out_of_stock_count,
        avg_turnover_rate=round(sum(item['turnover_rate'] for item in inventory_items) / len(inventory_items), 2) if inventory_items else 0,
        inventory_items=inventory_items,
        category_summary=list(category_summary.values())
    )