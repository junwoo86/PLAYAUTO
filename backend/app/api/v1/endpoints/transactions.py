"""
Transaction API Endpoints
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_db
from app.schemas.transaction import (
    TransactionCreate, TransactionResponse, TransactionListResponse,
    BatchTransactionCreate, StockCountRequest
)
from app.schemas.common import MessageResponse
from app.services.transaction_service import TransactionService
from app.models.product import Product
from app.models.discrepancy import Discrepancy

router = APIRouter()


@router.get("/", response_model=TransactionListResponse)
def get_transactions(
    skip: int = Query(0, ge=0, description="Skip records"),
    limit: int = Query(20, ge=1, le=100, description="Limit records"),
    product_id: Optional[UUID] = Query(None, description="Filter by product ID"),
    transaction_type: Optional[str] = Query(None, description="Filter by type"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    db: Session = Depends(get_current_db)
):
    """
    Get list of transactions with filters
    """
    transactions = TransactionService.get_transactions(
        db=db,
        skip=skip,
        limit=limit,
        product_id=product_id,
        transaction_type=transaction_type,
        start_date=start_date,
        end_date=end_date
    )
    
    # Add product information
    transaction_responses = []
    for trans in transactions:
        trans_dict = TransactionResponse.model_validate(trans)
        # Add product info
        product = db.query(Product).filter(Product.id == trans.product_id).first()
        if product:
            trans_dict.product_name = product.product_name
            trans_dict.product_code = product.product_code
        transaction_responses.append(trans_dict)
    
    return TransactionListResponse(
        data=transaction_responses,
        pagination={
            "page": skip // limit + 1,
            "limit": limit,
            "total": len(transaction_responses),
            "total_pages": (len(transaction_responses) + limit - 1) // limit
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
    product = db.query(Product).filter(Product.id == transaction.product_id).first()
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
        product = db.query(Product).filter(Product.id == count_item.product_id).first()
        if not product:
            continue
        
        # Calculate discrepancy
        discrepancy = count_item.physical_stock - product.current_stock
        
        if discrepancy != 0:
            discrepancies_found += 1
            
            # Create discrepancy record
            disc_record = Discrepancy(
                product_id=count_item.product_id,
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
                    product_id=count_item.product_id,
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