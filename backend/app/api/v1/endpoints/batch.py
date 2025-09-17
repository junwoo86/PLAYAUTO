"""
배치 처리 API 엔드포인트
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
import csv
import io
from datetime import datetime

from app.core.database import get_db
from app.core.timezone_utils import parse_datetime_string
from app.models.product import Product
from app.models.transaction import Transaction
from app.api.v1.endpoints.transactions import create_transaction
from app.schemas.product import ProductCreate

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

class BatchProduct(BaseModel):
    productCode: str
    productName: str
    barcode: str = None
    category: str = None
    manufacturer: str = None
    unit: str = None
    initialStock: int = 0
    safetyStock: int = 0
    purchasePrice: float = 0
    purchaseCurrency: str = "KRW"
    salePrice: float = 0
    saleCurrency: str = "KRW"
    zoneId: str = None
    warehouse: str = None  # 창고 이름
    supplier: str = None
    supplierEmail: str = None
    contactEmail: str = None
    leadTime: int = None
    moq: int = None
    memo: str = None

class BatchProductRequest(BaseModel):
    products: List[BatchProduct]

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
            
            # 트랜잭션 생성 데이터 준비 (사용하지 않음 - 직접 생성)
            # product_code를 사용해야 함
            
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
                # ADJUST는 조정량을 의미 (양수: 증가, 음수: 감소)
                new_stock = previous_stock + trans.quantity
            else:
                errors.append({
                    "row": idx + 1,
                    "error": f"알 수 없는 트랜잭션 타입: {trans.transaction_type}"
                })
                failed_count += 1
                continue
            
            # 트랜잭션 생성
            # 날짜 처리: ISO 형식 문자열을 datetime 객체로 변환
            transaction_date = parse_datetime_string(trans.date)
            
            transaction = Transaction(
                product_code=trans.product_code,  # product_code 사용
                transaction_type=trans.transaction_type,
                quantity=trans.quantity,
                previous_stock=previous_stock,
                new_stock=new_stock,
                reason=trans.reason,
                memo=trans.memo,
                location=product.zone_id,  # location 대신 zone_id 사용
                created_by="batch_process",  # created_by 추가
                transaction_date=transaction_date  # datetime 객체 사용
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
    CSV 템플릿 다운로드 - 쉼표가 포함된 데이터를 위해 큰따옴표로 감싸기
    """
    # StringIO를 사용하여 메모리에 CSV 생성
    import io
    import csv
    from fastapi.responses import StreamingResponse
    
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)  # 모든 필드를 큰따옴표로 감싸기
    
    # 헤더 작성
    writer.writerow(['제품코드', '제품명', '구분', '수량', '날짜', '사유', '메모'])
    
    # 샘플 데이터 작성 (쉼표가 포함된 예시 포함)
    writer.writerow(['P001', '테스트제품1', 'IN', '100', '2025-01-06', '입고', '샘플 데이터'])
    writer.writerow(['P002', '테스트제품2, 대형', 'OUT', '50', '2025-01-06', '출고', '샘플, 테스트용'])
    writer.writerow(['P003', '테스트제품3', 'ADJUST', '200', '2025-01-06', '재고조정', '샘플 데이터'])
    
    # 파일 포인터를 처음으로 이동
    output.seek(0)
    
    # StreamingResponse로 반환
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),  # BOM 추가
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=batch_template.csv"
        }
    )

@router.post("/products", response_model=BatchResult)
def process_batch_products(
    request: BatchProductRequest,
    db: Session = Depends(get_db)
):
    """
    제품 일괄 추가 처리
    """
    from app.models.warehouse import Warehouse
    import re

    success_count = 0
    failed_count = 0
    errors = []

    for idx, prod in enumerate(request.products):
        try:
            # SKU 중복 확인
            existing_product = db.query(Product).filter(
                Product.product_code == prod.productCode
            ).first()

            if existing_product:
                errors.append({
                    "row": idx + 1,
                    "error": f"SKU '{prod.productCode}'가 이미 존재합니다."
                })
                failed_count += 1
                continue

            # 창고 이름으로 warehouse_id 찾기
            warehouse_id = None
            if prod.warehouse:
                # 입력된 창고 이름에서 모든 공백 제거
                normalized_input = re.sub(r'\s+', '', prod.warehouse)

                # 모든 창고 조회
                warehouses = db.query(Warehouse).all()
                for warehouse in warehouses:
                    # DB의 창고 이름에서도 모든 공백 제거하여 비교
                    normalized_db = re.sub(r'\s+', '', warehouse.name)
                    if normalized_input.lower() == normalized_db.lower():
                        warehouse_id = warehouse.id
                        break

                if not warehouse_id:
                    errors.append({
                        "row": idx + 1,
                        "error": f"창고 '{prod.warehouse}'를 찾을 수 없습니다."
                    })
                    failed_count += 1
                    continue

            # 새 제품 생성
            new_product = Product(
                product_code=prod.productCode,
                product_name=prod.productName,
                barcode=prod.barcode,
                category=prod.category,
                manufacturer=prod.manufacturer,
                unit=prod.unit or "개",
                safety_stock=prod.safetyStock,
                purchase_price=prod.purchasePrice,
                purchase_currency=prod.purchaseCurrency,
                sale_price=prod.salePrice,
                sale_currency=prod.saleCurrency,
                zone_id=prod.zoneId,
                warehouse_id=warehouse_id,  # 매핑된 warehouse_id 사용
                supplier=prod.supplier,
                supplier_email=prod.supplierEmail,
                contact_email=prod.contactEmail,
                lead_time_days=prod.leadTime,
                moq=prod.moq,
                memo=prod.memo,
                current_stock=prod.initialStock,  # 초기 재고 설정
                is_active=True
            )

            db.add(new_product)
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