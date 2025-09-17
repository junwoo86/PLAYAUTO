"""
Inventory Analysis Pydantic schemas
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class InventoryItem(BaseModel):
    """재고 항목 분석"""
    product_code: str
    product_name: str
    category: Optional[str]
    current_stock: int
    safety_stock: int
    turnover_rate: float
    days_of_stock: Optional[float]
    inventory_value: float
    stock_status: str
    avg_daily_usage: float


class CategorySummary(BaseModel):
    """카테고리별 요약"""
    category: str
    total_items: int
    total_value: float
    avg_turnover: float


class InventoryAnalysisResponse(BaseModel):
    """재고 분석 응답"""
    start_date: datetime
    end_date: datetime
    total_products: int
    total_inventory_value: float
    low_stock_count: int
    out_of_stock_count: int
    avg_turnover_rate: float
    inventory_items: List[Dict[str, Any]]
    category_summary: List[Dict[str, Any]]