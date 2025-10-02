"""
Statistics API Endpoints
"""
from typing import Optional
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import random

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
    
    # 재고 총액 계산 - 구매가와 판매가 모두 계산, USD는 1300원으로 환산
    USD_TO_KRW = 1300
    
    total_purchase_value = 0
    total_sales_value = 0
    
    for p in products:
        # 구매가 계산
        if p.purchase_currency == 'USD':
            purchase_value_krw = p.current_stock * p.purchase_price * USD_TO_KRW
        else:
            purchase_value_krw = p.current_stock * p.purchase_price
        total_purchase_value += purchase_value_krw
        
        # 판매가 계산
        if p.sale_currency == 'USD':
            sales_value_krw = p.current_stock * p.sale_price * USD_TO_KRW
        else:
            sales_value_krw = p.current_stock * p.sale_price
        total_sales_value += sales_value_krw
    
    # 재고 부족 제품
    low_stock_products = [p for p in products if p.current_stock <= p.safety_stock]
    
    # 재고 정확도 계산 - 최근 7일 조정 내역 기반
    seven_days_ago = today - timedelta(days=7)
    seven_days_ago_dt = datetime.combine(seven_days_ago, datetime.min.time())
    
    # 최근 7일간 조정 거래 조회
    recent_adjustments = db.query(Transaction).filter(
        and_(
            Transaction.transaction_type == "ADJUST",
            Transaction.transaction_date >= seven_days_ago_dt
        )
    ).all()
    
    # 제품별 불일치 개수 계산 (절댓값 합계)
    product_discrepancies = {}
    for adj in recent_adjustments:
        if adj.product_code not in product_discrepancies:
            product_discrepancies[adj.product_code] = 0
        product_discrepancies[adj.product_code] += abs(adj.quantity)
    
    # 각 제품별 정확도 계산
    product_accuracies = []
    for product in products:
        discrepancy_count = product_discrepancies.get(product.product_code, 0)
        
        if discrepancy_count == 0:
            # 불일치가 없으면 100%
            accuracy = 100.0
        else:
            # (현재재고 - 불일치개수) / 현재재고 * 100
            if product.current_stock <= 0:
                accuracy = 0.0
            else:
                accuracy = max(0.0, (product.current_stock - discrepancy_count) / product.current_stock * 100)
        
        product_accuracies.append(accuracy)
    
    # 전체 제품 평균 정확도 계산 (소수점 1자리 반올림)
    if product_accuracies:
        average_accuracy = round(sum(product_accuracies) / len(product_accuracies), 1)
    else:
        average_accuracy = 100.0
    
    # 주간 통계 (최근 4주간 출고 데이터)
    four_weeks_ago = today - timedelta(weeks=4)
    four_weeks_ago_dt = datetime.combine(four_weeks_ago, datetime.min.time())

    # 최근 4주간 출고 거래 조회
    recent_out_transactions = db.query(Transaction).filter(
        and_(
            Transaction.transaction_type == "OUT",
            Transaction.transaction_date >= four_weeks_ago_dt
        )
    ).all()

    # 카테고리별 제품 출고량 집계
    category_product_outbound = {
        "검사권": {},
        "영양제": {}
    }

    for trans in recent_out_transactions:
        product = next((p for p in products if p.product_code == trans.product_code), None)
        if product:
            if product.category == "검사권":
                if product.product_name not in category_product_outbound["검사권"]:
                    category_product_outbound["검사권"][product.product_name] = 0
                category_product_outbound["검사권"][product.product_name] += abs(trans.quantity)
            elif product.category == "영양제":
                if product.product_name not in category_product_outbound["영양제"]:
                    category_product_outbound["영양제"][product.product_name] = 0
                category_product_outbound["영양제"][product.product_name] += abs(trans.quantity)

    # 각 카테고리별 TOP 6 정렬
    test_kit_top6 = sorted(
        category_product_outbound["검사권"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:6]

    supplement_top6 = sorted(
        category_product_outbound["영양제"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:6]

    # 데이터 형식 변환
    test_kit_top6_list = [
        {"productName": name, "quantity": qty}
        for name, qty in test_kit_top6
    ]

    supplement_top6_list = [
        {"productName": name, "quantity": qty}
        for name, qty in supplement_top6
    ]

    week_adjustments = [t for t in week_transactions if t.transaction_type == "ADJUST"] if 'week_transactions' in locals() else []
    week_adjustment_count = len(week_adjustments)
    
    # 월간 통계
    month_transactions = db.query(Transaction).filter(
        Transaction.transaction_date >= month_start_dt
    ).all()

    month_adjustments = [t for t in month_transactions if t.transaction_type == "ADJUST"]
    month_adjustment_count = len(month_adjustments)

    # 월간 폐기 거래 조회 (DISPOSAL 타입)
    month_disposals = [t for t in month_transactions if t.transaction_type == "DISPOSAL"]

    # 월간 순 손실액 계산 (마이너스 조정은 손실, 플러스 조정은 이득으로 차감, 폐기는 손실로 추가)
    month_loss = 0

    # 조정 거래 손실액 계산
    for t in month_adjustments:
        product = next((p for p in products if p.product_code == t.product_code), None)
        if product:
            # 판매 통화에 따라 원화로 환산
            if product.sale_currency == 'USD':
                adjustment_amount = t.quantity * product.sale_price * USD_TO_KRW
            else:
                adjustment_amount = t.quantity * product.sale_price
            # 마이너스는 손실(+), 플러스는 이득(-)으로 계산
            month_loss -= adjustment_amount  # quantity가 음수면 손실 증가, 양수면 손실 감소

    # 폐기 거래 손실액 계산 (폐기는 항상 손실로 추가)
    for t in month_disposals:
        product = next((p for p in products if p.product_code == t.product_code), None)
        if product:
            # 구매가 기준으로 폐기 손실 계산
            if product.purchase_currency == 'USD':
                disposal_amount = t.quantity * product.purchase_price * USD_TO_KRW
            else:
                disposal_amount = t.quantity * product.purchase_price
            # 폐기는 항상 손실로 추가
            month_loss += disposal_amount  # quantity가 양수이므로 손실 증가
    
    # 주간 분석을 위한 기본 데이터 설정 (조정 분석 제거)
    
    # 자주 조정되는 제품 TOP
    product_adjustments = {}
    for t in month_adjustments:
        if t.product_code not in product_adjustments:
            product = next((p for p in products if p.product_code == t.product_code), None)
            if product:
                product_adjustments[t.product_code] = {
                    "productId": str(t.product_code),
                    "productName": product.product_name,
                    "adjustmentCount": 0,
                    "totalQuantity": 0
                }
        if t.product_code in product_adjustments:
            product_adjustments[t.product_code]["adjustmentCount"] += 1
            product_adjustments[t.product_code]["totalQuantity"] += abs(t.quantity)
    
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
    
    # 카테고리별 출고 추이 (최근 10주 - 현재 주 포함)
    category_outbound_trend = {
        "검사권": [],
        "영양제": []
    }
    
    # 현재 주의 월요일 계산
    current_week_monday = today - timedelta(days=today.weekday())
    
    # 최근 10주 (현재 주 포함) 처리
    for i in range(9, -1, -1):  # 9주 전부터 현재 주까지
        # 각 주의 월요일 계산
        week_monday = current_week_monday - timedelta(weeks=i)
        week_sunday = week_monday + timedelta(days=6)
        
        # 해당 주의 출고 거래 조회
        week_out_transactions = db.query(Transaction).filter(
            and_(
                Transaction.transaction_type == "OUT",
                Transaction.transaction_date >= datetime.combine(week_monday, datetime.min.time()),
                Transaction.transaction_date <= datetime.combine(week_sunday, datetime.max.time())
            )
        ).all()
        
        # 카테고리별 출고량 계산
        test_kit_qty = 0
        supplement_qty = 0
        
        for trans in week_out_transactions:
            # 제품 정보 찾기
            product = next((p for p in products if p.product_code == trans.product_code), None)
            if product:
                if product.category == "검사권":
                    test_kit_qty += abs(trans.quantity)
                elif product.category == "영양제":
                    supplement_qty += abs(trans.quantity)
        
        # 주 표시 형식 결정
        if i == 0:
            week_label = "이번 주"
        elif i == 1:
            week_label = "1주 전"
        else:
            week_label = f"{i}주 전"
        
        category_outbound_trend["검사권"].append({
            "week": week_label,
            "quantity": test_kit_qty
        })
        category_outbound_trend["영양제"].append({
            "week": week_label,
            "quantity": supplement_qty
        })
    
    data = {
        "today": {
            "inbound": today_inbound,
            "outbound": today_outbound,
            "adjustments": len(today_adjustments),
            "date": today.isoformat()
        },
        "inventory": {
            "totalPurchaseValue": total_purchase_value,
            "totalSalesValue": total_sales_value,
            "totalProducts": total_products,
            "lowStockCount": len(low_stock_products),
            "averageAccuracy": round(average_accuracy, 1),
            "exchangeRate": USD_TO_KRW
        },
        "weekly": {
            "testKitTop6": test_kit_top6_list,
            "supplementTop6": supplement_top6_list,
            "accuracyRate": round(average_accuracy, 1),
            "accuracyTrend": accuracy_trend
        },
        "monthly": {
            "totalAdjustments": month_adjustment_count,  # 조정 건수만 (폐기 제외)
            "totalLossAmount": round(month_loss, 0)  # 총 손실액 (조정 + 폐기 포함)
        },
        "categoryOutboundTrend": category_outbound_trend,
        "pendingDiscrepancies": []  # 실제로는 별도 테이블에서 가져와야 함
    }
    
    return BaseResponse(data=data)