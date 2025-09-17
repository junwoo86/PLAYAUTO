"""
API v1 Router
"""
from fastapi import APIRouter

from app.api.v1.endpoints import products, transactions, statistics, daily_ledger, batch, purchase_orders, warehouses, scheduler, product_bom, inventory, sales

api_router = APIRouter()

# 엔드포인트 라우터 등록
api_router.include_router(warehouses.router, prefix="/warehouses", tags=["warehouses"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics"])
api_router.include_router(daily_ledger.router, prefix="/daily-ledger", tags=["daily-ledger"])
api_router.include_router(batch.router, prefix="/batch", tags=["batch"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["purchase-orders"])
api_router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
api_router.include_router(product_bom.router, prefix="/product-bom", tags=["product-bom"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])