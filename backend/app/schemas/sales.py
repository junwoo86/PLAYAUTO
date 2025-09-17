"""
Sales Analysis Pydantic schemas
"""
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class SalesTrend(BaseModel):
    """매출 추세"""
    date: str
    sales_amount: float
    quantity_sold: int
    transaction_count: int


class TopProduct(BaseModel):
    """상위 제품"""
    product_code: str
    product_name: str
    quantity_sold: int
    sales_amount: float
    transaction_count: int


class CategorySales(BaseModel):
    """카테고리별 매출"""
    category: str
    sales_amount: float
    quantity_sold: int


class SalesAnalysisResponse(BaseModel):
    """매출 분석 응답"""
    start_date: datetime
    end_date: datetime
    total_sales: float
    total_quantity_sold: int
    total_transactions: int
    avg_daily_sales: float
    avg_order_value: float
    sales_trend: List[Dict[str, Any]]
    top_products: List[Dict[str, Any]]
    category_sales: List[Dict[str, Any]]