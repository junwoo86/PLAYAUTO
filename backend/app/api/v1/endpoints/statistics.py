"""
Statistics API Endpoints
"""
from typing import Optional
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.api.deps import get_db
from app.models.product import Product
from app.models.transaction import Transaction
from app.schemas.common import BaseResponse

router = APIRouter()

@router.get("/dashboard", response_model=BaseResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    
    # 오늘 날짜 설정
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    # 이번 주 시작일 (월요일)
    week_start = today - timedelta(days=today.weekday())
    week_start_dt = datetime.combine(week_start, datetime.min.time())
    
    # 이번 달 시작일
    month_start = date(today.year, today.month, 1)
    month_start_dt = datetime.combine(month_start, datetime.min.time())
    
    # 오늘의 거래 통계
    today_transactions = db.query(Transaction).filter(
        and_(
            Transaction.transaction_date >= today_start,
            Transaction.transaction_date <= today_end
        )
    ).all()
    
    today_inbound = sum(t.quantity for t in today_transactions if t.transaction_type == "IN")
    today_outbound = sum(abs(t.quantity) for t in today_transactions if t.transaction_type == "OUT")
    today_adjustments = [t for t in today_transactions if t.transaction_type == "ADJUST"]
    
    # 제품 통계
    products = db.query(Product).filter(Product.is_active == True).all()
    total_products = len(products)
    
    # 재고 총액 계산
    total_inventory_value = sum(p.current_stock * p.price for p in products)
    
    # 재고 부족 제품
    low_stock_products = [p for p in products if p.current_stock <= p.safety_stock]
    
    # 재고 정확도 (임시로 95-100% 사이 랜덤값)
    import random
    average_accuracy = random.uniform(95, 100)
    
    # 주간 통계
    week_transactions = db.query(Transaction).filter(
        Transaction.transaction_date >= week_start_dt
    ).all()
    
    week_adjustments = [t for t in week_transactions if t.transaction_type == "ADJUST"]
    week_adjustment_count = len(week_adjustments)
    
    # 월간 통계
    month_transactions = db.query(Transaction).filter(
        Transaction.transaction_date >= month_start_dt
    ).all()
    
    month_adjustments = [t for t in month_transactions if t.transaction_type == "ADJUST"]
    month_adjustment_count = len(month_adjustments)
    
    # 월간 손실액 계산 (조정에서 마이너스 값들의 합)
    month_loss = sum(abs(t.quantity * p.price) for t in month_adjustments 
                    if t.quantity < 0 
                    for p in products if p.id == t.product_id)
    
    # 조정 사유 분석
    reason_breakdown = {}
    for t in week_adjustments:
        reason = t.reason or "기타"
        reason_breakdown[reason] = reason_breakdown.get(reason, 0) + 1
    
    # 퍼센트로 변환
    total_reasons = sum(reason_breakdown.values()) if reason_breakdown else 1
    reason_breakdown_pct = {k: round(v/total_reasons * 100, 1) for k, v in reason_breakdown.items()}
    
    # 자주 조정되는 제품 TOP
    product_adjustments = {}
    for t in month_adjustments:
        if t.product_id not in product_adjustments:
            product = next((p for p in products if p.id == t.product_id), None)
            if product:
                product_adjustments[t.product_id] = {
                    "productId": str(t.product_id),
                    "productName": product.product_name,
                    "adjustmentCount": 0,
                    "totalQuantity": 0
                }
        if t.product_id in product_adjustments:
            product_adjustments[t.product_id]["adjustmentCount"] += 1
            product_adjustments[t.product_id]["totalQuantity"] += abs(t.quantity)
    
    top_adjusted_products = sorted(
        product_adjustments.values(), 
        key=lambda x: x["adjustmentCount"], 
        reverse=True
    )[:10]
    
    # 정확도 추이 (최근 4주)
    accuracy_trend = []
    for i in range(4):
        week_date = today - timedelta(weeks=i)
        accuracy_trend.append({
            "date": week_date.strftime("%m-%d"),
            "rate": random.uniform(94, 99)
        })
    accuracy_trend.reverse()
    
    data = {
        "today": {
            "inbound": today_inbound,
            "outbound": today_outbound,
            "adjustments": len(today_adjustments),
            "date": today.isoformat()
        },
        "inventory": {
            "totalValue": total_inventory_value,
            "totalProducts": total_products,
            "lowStockCount": len(low_stock_products),
            "averageAccuracy": round(average_accuracy, 1)
        },
        "weekly": {
            "totalAdjustments": week_adjustment_count,
            "accuracyRate": round(average_accuracy, 1),
            "accuracyTrend": accuracy_trend,
            "reasonBreakdown": reason_breakdown_pct,
            "topAdjustedProducts": top_adjusted_products[:6]
        },
        "monthly": {
            "totalAdjustments": month_adjustment_count,
            "totalLossAmount": round(month_loss, 0),
            "averageLoss": round(month_loss / max(month_adjustment_count, 1), 0)
        },
        "pendingDiscrepancies": []  # 실제로는 별도 테이블에서 가져와야 함
    }
    
    return BaseResponse(data=data)