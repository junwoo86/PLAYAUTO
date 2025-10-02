"""
API v1 Router
"""
from fastapi import APIRouter

from app.api.v1.endpoints import products, transactions, statistics, daily_ledger, batch, purchase_orders, warehouses, scheduler, inventory, sales, product_bom, stock_checkpoints, auth, users, groups, notifications, disposal_report

api_router = APIRouter()

# 엔드포인트 라우터 등록
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(warehouses.router, prefix="/warehouses", tags=["warehouses"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics"])
api_router.include_router(daily_ledger.router, prefix="/daily-ledgers", tags=["daily-ledgers"])
api_router.include_router(batch.router, prefix="/batch", tags=["batch"])
api_router.include_router(purchase_orders.router, prefix="/purchase-orders", tags=["purchase-orders"])
api_router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(product_bom.router, prefix="/product-bom", tags=["product-bom"])
api_router.include_router(stock_checkpoints.router, prefix="/stock-checkpoints", tags=["stock-checkpoints"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(groups.router, prefix="/groups", tags=["groups"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(disposal_report.router, prefix="/disposal-report", tags=["disposal-report"])