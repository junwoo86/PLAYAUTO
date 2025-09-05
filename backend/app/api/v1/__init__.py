"""
API v1 Router
"""
from fastapi import APIRouter

from app.api.v1.endpoints import products, transactions, statistics, daily_ledger, batch, purchase_orders

api_router = APIRouter()

# 엔드포인트 라우터 등록
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics"])
api_router.include_router(daily_ledger.router, prefix="/daily-ledger", tags=["daily-ledger"])
api_router.include_router(batch.router, prefix="/batch", tags=["batch"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["purchase-orders"])