"""
Transaction API Endpoints
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_db
from app.schemas.transaction import (
    TransactionCreate, TransactionResponse, TransactionListResponse,
    BatchTransactionCreate, StockCountRequest, TransactionSummaryResponse
)
from app.schemas.common import MessageResponse
from app.services.transaction_service import TransactionService
from app.models.product import Product
from app.models.discrepancy import Discrepancy
from sqlalchemy.orm import joinedload

router = APIRouter()


@router.get("/", response_model=TransactionListResponse)
def get_transactions(
    skip: int = Query(0, ge=0, description="Skip records"),
    limit: int = Query(20, ge=1, le=100, description="Limit records"),
    product_code: Optional[str] = Query(None, description="Filter by product code"),
    transaction_type: Optional[str] = Query(None, description="Filter by type"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    db: Session = Depends(get_current_db)
):
    """
    Get list of transactions with filters - 최적화된 버전
    """
    # eager loading으로 트랜잭션과 Product 정보를 한번에 가져오기
    transactions = TransactionService.get_transactions_optimized(
        db=db,
        skip=skip,
        limit=limit,
        product_code=product_code,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date
    )

    # 모든 트랜잭션의 product_code 수집
    product_codes = list(set(trans.product_code for trans in transactions if trans.product_code))

    # 필요한 제품 정보를 한 번에 가져오기
    products = {}
    if product_codes:
        products_query = db.query(Product).filter(Product.product_code.in_(product_codes)).all()
        products = {p.product_code: p for p in products_query}

    # 트랜잭션 응답 생성
    transaction_responses = []
    for trans in transactions:
        trans_dict = TransactionResponse.model_validate(trans)
        # 제품 정보 추가
        if trans.product_code and trans.product_code in products:
            product = products[trans.product_code]
            trans_dict.product_name = product.product_name
            trans_dict.product_code = product.product_code
        transaction_responses.append(trans_dict)

    # 전체 개수를 위한 별도 쿼리
    total_count = TransactionService.count_transactions(
        db=db,
        product_code=product_code,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date
    )

    return TransactionListResponse(
        data=transaction_responses,
        pagination={
            "page": skip // limit + 1,
            "limit": limit,
            "total": total_count,
            "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 0
        }
    )


@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction_create: TransactionCreate,
    db: Session = Depends(get_current_db)
):
    """
    Create single transaction
    """
    transaction = TransactionService.create_transaction(
        db, transaction_create
    )
    
    # Add product info
    trans_response = TransactionResponse.model_validate(transaction)
    product = db.query(Product).filter(Product.product_code == transaction.product_code).first()
    if product:
        trans_response.product_name = product.product_name
        trans_response.product_code = product.product_code
    
    return trans_response


@router.post("/batch", response_model=MessageResponse)
def batch_create_transactions(
    batch_request: BatchTransactionCreate,
    db: Session = Depends(get_current_db)
):
    """
    Create multiple transactions in batch
    """
    transactions = TransactionService.batch_create_transactions(
        db, batch_request.transactions
    )
    
    return MessageResponse(
        success=True,
        message=f"Successfully created {len(transactions)} transactions"
    )


@router.post("/stock-count", response_model=MessageResponse)
def process_stock_count(
    stock_count: StockCountRequest,
    db: Session = Depends(get_current_db)
):
    """
    Process stock count (inventory check)
    Creates adjustment transactions and discrepancy records
    """
    processed = 0
    discrepancies_found = 0
    
    for count_item in stock_count.counts:
        # Get product
        product = db.query(Product).filter(Product.product_code == count_item.product_code).first()
        if not product:
            continue
        
        # Calculate discrepancy
        discrepancy = count_item.physical_stock - product.current_stock
        
        if discrepancy != 0:
            discrepancies_found += 1
            
            # Create discrepancy record
            disc_record = Discrepancy(
                product_code=count_item.product_code,
                system_stock=product.current_stock,
                physical_stock=count_item.physical_stock,
                discrepancy=discrepancy,
                explanation=count_item.explanation,
                status="pending" if not count_item.explanation else "resolved"
            )
            
            if count_item.explanation:
                disc_record.resolved_at = datetime.now()
                disc_record.resolved_by = stock_count.created_by or "system"
            
            db.add(disc_record)
            
            # Create adjustment transaction
            if count_item.explanation:  # Only adjust if explanation provided
                transaction = TransactionCreate(
                    transaction_type="adjustment",
                    product_code=count_item.product_code,
                    quantity=discrepancy,
                    reason="Stock Count",
                    memo=count_item.explanation
                )
                TransactionService.create_transaction(
                    db, transaction, stock_count.created_by or "system"
                )
                processed += 1
    
    db.commit()
    
    return MessageResponse(
        success=True,
        message=f"Stock count completed. Processed: {processed}, Discrepancies: {discrepancies_found}"
    )


@router.delete("/{transaction_id}", response_model=MessageResponse)
def delete_transaction(
    transaction_id: UUID,
    db: Session = Depends(get_current_db)
):
    """
    Delete a transaction with restrictions based on adjustment history
    
    Rules:
    - Adjustments can only be deleted if they are the most recent adjustment for the product
    - IN/OUT transactions can only be deleted if they occurred after the last adjustment
    - If no adjustments exist for the product, any transaction can be deleted
    """
    from app.models.transaction import Transaction
    from sqlalchemy import desc
    
    # Get the transaction to be deleted
    transaction = TransactionService.get_transaction(db, transaction_id)
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="거래 내역을 찾을 수 없습니다"
        )
    
    # Get the most recent adjustment for this product
    last_adjustment = db.query(Transaction).filter(
        Transaction.product_code == transaction.product_code,
        Transaction.transaction_type == "adjustment"
    ).order_by(desc(Transaction.transaction_date)).first()
    
    # Apply deletion restrictions
    if transaction.transaction_type == "adjustment":
        # Check if this is the most recent adjustment
        if last_adjustment and last_adjustment.id != transaction.id:
            # There's a more recent adjustment, cannot delete this one
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이 조정 내역은 삭제할 수 없습니다. 가장 최근의 조정 내역만 삭제 가능합니다."
            )
    else:  # IN or OUT transaction
        # Check if there's an adjustment after this transaction
        if last_adjustment and last_adjustment.transaction_date > transaction.transaction_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"이 거래는 삭제할 수 없습니다. {last_adjustment.transaction_date.strftime('%Y-%m-%d %H:%M')}에 수행된 재고 조정 이전의 거래입니다."
            )
    
    # Get the product to reverse the stock change
    product = db.query(Product).filter(Product.product_code == transaction.product_code).first()
    if product:
        # Reverse the stock change
        if transaction.transaction_type == "IN":
            product.current_stock -= transaction.quantity
        elif transaction.transaction_type == "OUT":
            product.current_stock += transaction.quantity
        elif transaction.transaction_type == "adjustment":
            # For adjustments, reverse the adjustment
            product.current_stock -= transaction.quantity
    
    # Delete the transaction
    db.delete(transaction)
    db.commit()
    
    return MessageResponse(
        success=True,
        message="거래 내역이 성공적으로 삭제되었습니다"
    )


@router.get("/summary", response_model=TransactionSummaryResponse)
def get_transaction_summary(
    start_date: Optional[date] = Query(None, description="시작 날짜"),
    end_date: Optional[date] = Query(None, description="종료 날짜"),
    db: Session = Depends(get_current_db)
):
    """입출고 요약 정보를 조회합니다."""
    from sqlalchemy import func
    from app.models.transaction import Transaction

    # 기본 날짜 설정 (지난 30일)
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # 날짜 범위 쿼리
    query = db.query(
        func.date(Transaction.created_at).label('date'),
        Transaction.transaction_type,
        func.count(Transaction.id).label('count'),
        func.sum(Transaction.quantity).label('total_quantity')
    ).filter(
        func.date(Transaction.created_at) >= start_date,
        func.date(Transaction.created_at) <= end_date
    ).group_by(
        func.date(Transaction.created_at),
        Transaction.transaction_type
    ).order_by(func.date(Transaction.created_at))

    results = query.all()

    # 데이터 포맷팅
    summary_data = {}
    for result in results:
        date_str = result.date.strftime('%Y-%m-%d')
        if date_str not in summary_data:
            summary_data[date_str] = {
                'date': date_str,
                'in_count': 0,
                'in_quantity': 0,
                'out_count': 0,
                'out_quantity': 0,
                'adjustment_count': 0,
                'adjustment_quantity': 0,
                'return_count': 0,
                'return_quantity': 0,
                'transfer_count': 0,
                'transfer_quantity': 0
            }

        if result.transaction_type == 'IN':
            summary_data[date_str]['in_count'] = result.count
            summary_data[date_str]['in_quantity'] = float(result.total_quantity or 0)
        elif result.transaction_type == 'OUT':
            summary_data[date_str]['out_count'] = result.count
            summary_data[date_str]['out_quantity'] = float(result.total_quantity or 0)
        elif result.transaction_type == 'adjustment':
            summary_data[date_str]['adjustment_count'] = result.count
            summary_data[date_str]['adjustment_quantity'] = float(result.total_quantity or 0)
        elif result.transaction_type == 'return':
            summary_data[date_str]['return_count'] = result.count
            summary_data[date_str]['return_quantity'] = float(result.total_quantity or 0)
        elif result.transaction_type == 'transfer':
            summary_data[date_str]['transfer_count'] = result.count
            summary_data[date_str]['transfer_quantity'] = float(result.total_quantity or 0)

    # 전체 요약
    total_summary = {
        'in_count': sum(d['in_count'] for d in summary_data.values()),
        'in_quantity': sum(d['in_quantity'] for d in summary_data.values()),
        'out_count': sum(d['out_count'] for d in summary_data.values()),
        'out_quantity': sum(d['out_quantity'] for d in summary_data.values()),
        'adjustment_count': sum(d['adjustment_count'] for d in summary_data.values()),
        'adjustment_quantity': sum(d['adjustment_quantity'] for d in summary_data.values()),
        'return_count': sum(d['return_count'] for d in summary_data.values()),
        'return_quantity': sum(d['return_quantity'] for d in summary_data.values()),
        'transfer_count': sum(d['transfer_count'] for d in summary_data.values()),
        'transfer_quantity': sum(d['transfer_quantity'] for d in summary_data.values())
    }

    return TransactionSummaryResponse(
        start_date=datetime.combine(start_date, datetime.min.time()),
        end_date=datetime.combine(end_date, datetime.min.time()),
        daily_summary=list(summary_data.values()),
        total_summary=total_summary
    )