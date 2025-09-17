"""
Sales Analysis API Endpoints
"""
from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.models.product import Product
from app.models.transaction import Transaction
from app.schemas.sales import SalesAnalysisResponse

router = APIRouter()


@router.get("/analysis", response_model=SalesAnalysisResponse)
def get_sales_analysis(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    group_by: str = Query("daily", description="그룹화 기준 (daily, weekly, monthly)"),
    db: Session = Depends(get_db)
):
    """매출 분석 정보를 조회합니다."""

    # 기본 날짜 설정 (지난 30일)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # 출고 트랜잭션 조회
    out_transactions = db.query(
        Transaction,
        Product
    ).join(
        Product, Transaction.product_code == Product.product_code
    ).filter(
        and_(
            Transaction.transaction_type == 'OUT',
            func.date(Transaction.created_at) >= start_date,
            func.date(Transaction.created_at) <= end_date
        )
    ).all()

    # 일별 매출 계산
    daily_sales = {}
    for trans, product in out_transactions:
        date_str = trans.created_at.strftime('%Y-%m-%d')
        if date_str not in daily_sales:
            daily_sales[date_str] = {
                'date': date_str,
                'sales_amount': 0,
                'quantity_sold': 0,
                'transaction_count': 0
            }

        sales_amount = float(trans.quantity * product.sale_price)
        daily_sales[date_str]['sales_amount'] += sales_amount
        daily_sales[date_str]['quantity_sold'] += trans.quantity
        daily_sales[date_str]['transaction_count'] += 1

    # 제품별 매출 순위
    product_sales = {}
    for trans, product in out_transactions:
        if product.product_code not in product_sales:
            product_sales[product.product_code] = {
                'product_code': product.product_code,
                'product_name': product.product_name,
                'quantity_sold': 0,
                'sales_amount': 0,
                'transaction_count': 0
            }

        sales_amount = float(trans.quantity * product.sale_price)
        product_sales[product.product_code]['quantity_sold'] += trans.quantity
        product_sales[product.product_code]['sales_amount'] += sales_amount
        product_sales[product.product_code]['transaction_count'] += 1

    # 상위 10개 제품
    top_products = sorted(
        product_sales.values(),
        key=lambda x: x['sales_amount'],
        reverse=True
    )[:10]

    # 카테고리별 매출
    category_sales = {}
    for trans, product in out_transactions:
        cat = product.category or 'Unknown'
        if cat not in category_sales:
            category_sales[cat] = {
                'category': cat,
                'sales_amount': 0,
                'quantity_sold': 0
            }

        sales_amount = float(trans.quantity * product.sale_price)
        category_sales[cat]['sales_amount'] += sales_amount
        category_sales[cat]['quantity_sold'] += trans.quantity

    # 총계 계산
    total_sales = sum(d['sales_amount'] for d in daily_sales.values())
    total_quantity = sum(d['quantity_sold'] for d in daily_sales.values())
    total_transactions = sum(d['transaction_count'] for d in daily_sales.values())

    # 평균 계산
    days_count = len(daily_sales)
    avg_daily_sales = total_sales / days_count if days_count > 0 else 0
    avg_order_value = total_sales / total_transactions if total_transactions > 0 else 0

    # 그룹화 처리
    if group_by == "weekly":
        weekly_sales = {}
        for date_str, data in daily_sales.items():
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            week_start = date_obj - timedelta(days=date_obj.weekday())
            week_key = week_start.strftime('%Y-%m-%d')

            if week_key not in weekly_sales:
                weekly_sales[week_key] = {
                    'date': week_key,
                    'sales_amount': 0,
                    'quantity_sold': 0,
                    'transaction_count': 0
                }

            weekly_sales[week_key]['sales_amount'] += data['sales_amount']
            weekly_sales[week_key]['quantity_sold'] += data['quantity_sold']
            weekly_sales[week_key]['transaction_count'] += data['transaction_count']

        sales_trend = list(weekly_sales.values())
    elif group_by == "monthly":
        monthly_sales = {}
        for date_str, data in daily_sales.items():
            month_key = date_str[:7]  # YYYY-MM

            if month_key not in monthly_sales:
                monthly_sales[month_key] = {
                    'date': f"{month_key}-01",
                    'sales_amount': 0,
                    'quantity_sold': 0,
                    'transaction_count': 0
                }

            monthly_sales[month_key]['sales_amount'] += data['sales_amount']
            monthly_sales[month_key]['quantity_sold'] += data['quantity_sold']
            monthly_sales[month_key]['transaction_count'] += data['transaction_count']

        sales_trend = list(monthly_sales.values())
    else:
        sales_trend = list(daily_sales.values())

    # 정렬
    sales_trend.sort(key=lambda x: x['date'])

    return SalesAnalysisResponse(
        start_date=datetime.combine(start_date, datetime.min.time()),
        end_date=datetime.combine(end_date, datetime.min.time()),
        total_sales=total_sales,
        total_quantity_sold=total_quantity,
        total_transactions=total_transactions,
        avg_daily_sales=avg_daily_sales,
        avg_order_value=avg_order_value,
        sales_trend=sales_trend,
        top_products=top_products,
        category_sales=list(category_sales.values())
    )