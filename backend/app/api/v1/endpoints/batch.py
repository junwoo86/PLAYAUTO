"""
배치 처리 API 엔드포인트
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import csv
import io

from app.core.database import get_db
from app.models.product import Product
from app.models.transaction import Transaction
from app.api.v1.endpoints.transactions import create_transaction

router = APIRouter()

class BatchTransaction(BaseModel):
    product_code: str
    product_name: str = None
    transaction_type: str  # IN, OUT, ADJUST
    quantity: int
    date: str
    reason: str = None
    memo: str = None

class BatchRequest(BaseModel):
    transactions: List[BatchTransaction]

class BatchResult(BaseModel):
    success: int
    failed: int
    errors: List[dict]

@router.post("/process", response_model=BatchResult)
def process_batch(
    request: BatchRequest,
    db: Session = Depends(get_db)
):
    """
    일괄 트랜잭션 처리
    """
    success_count = 0
    failed_count = 0
    errors = []
    
    for idx, trans in enumerate(request.transactions):
        try:
            # 제품 코드로 제품 찾기
            product = db.query(Product).filter(
                Product.product_code == trans.product_code
            ).first()
            
            if not product:
                errors.append({
                    "row": idx + 1,
                    "error": f"제품 코드 {trans.product_code}를 찾을 수 없습니다"
                })
                failed_count += 1
                continue
            
            # 트랜잭션 생성
            transaction_data = {
                "product_id": str(product.id),
                "transaction_type": trans.transaction_type,
                "quantity": trans.quantity,
                "date": trans.date,
                "reason": trans.reason,
                "memo": trans.memo
            }
            
            # 재고 업데이트 로직
            previous_stock = product.current_stock
            
            if trans.transaction_type == "IN":
                new_stock = previous_stock + trans.quantity
            elif trans.transaction_type == "OUT":
                if trans.quantity > previous_stock:
                    errors.append({
                        "row": idx + 1,
                        "error": f"재고 부족: 현재 {previous_stock}, 요청 {trans.quantity}"
                    })
                    failed_count += 1
                    continue
                new_stock = previous_stock - trans.quantity
            elif trans.transaction_type == "ADJUST":
                new_stock = trans.quantity
            else:
                errors.append({
                    "row": idx + 1,
                    "error": f"알 수 없는 트랜잭션 타입: {trans.transaction_type}"
                })
                failed_count += 1
                continue
            
            # 트랜잭션 생성
            transaction = Transaction(
                product_id=product.id,
                transaction_type=trans.transaction_type,
                quantity=trans.quantity,
                previous_stock=previous_stock,
                new_stock=new_stock,
                reason=trans.reason,
                memo=trans.memo,
                location=product.location,
                date=trans.date
            )
            
            db.add(transaction)
            
            # 제품 재고 업데이트
            product.current_stock = new_stock
            
            success_count += 1
            
        except Exception as e:
            errors.append({
                "row": idx + 1,
                "error": str(e)
            })
            failed_count += 1
    
    # 모든 변경사항 커밋
    if success_count > 0:
        db.commit()
    
    return BatchResult(
        success=success_count,
        failed=failed_count,
        errors=errors
    )

@router.post("/upload-csv", response_model=BatchResult)
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    CSV 파일 업로드 및 처리
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="CSV 파일만 업로드 가능합니다")
    
    contents = await file.read()
    decoded = contents.decode('utf-8-sig')  # BOM 처리
    
    csv_reader = csv.DictReader(io.StringIO(decoded))
    transactions = []
    
    for row in csv_reader:
        try:
            trans = BatchTransaction(
                product_code=row.get('제품코드', row.get('product_code', '')),
                product_name=row.get('제품명', row.get('product_name', '')),
                transaction_type=row.get('구분', row.get('type', '')).upper(),
                quantity=int(row.get('수량', row.get('quantity', 0))),
                date=row.get('날짜', row.get('date', '')),
                reason=row.get('사유', row.get('reason', '')),
                memo=row.get('메모', row.get('memo', ''))
            )
            transactions.append(trans)
        except Exception as e:
            continue
    
    # 배치 처리
    request = BatchRequest(transactions=transactions)
    return process_batch(request, db)

@router.get("/template")
def download_template():
    """
    CSV 템플릿 다운로드
    """
    csv_content = """제품코드,제품명,구분,수량,날짜,사유,메모
P001,테스트제품1,IN,100,2025-01-06,입고,샘플 데이터
P002,테스트제품2,OUT,50,2025-01-06,출고,샘플 데이터
P003,테스트제품3,ADJUST,200,2025-01-06,재고조정,샘플 데이터"""
    
    return {
        "content": csv_content,
        "filename": "batch_template.csv"
    }