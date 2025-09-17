#!/bin/bash

# 페이지 파일 목록
pages=(
  "ProductMove"
  "StockAlert"
  "TransactionForm"
  "DailyLedger"
  "IndividualProcess"
  "History"
  "DailyClosing"
  "PurchaseOrder"
  "WarehouseManagement"
  "TransactionSummary"
  "PastQuantityLookup"
  "InventoryAnalysis"
  "SalesAnalysis"
)

echo "토스트 메시지 통일 작업 시작..."

for page in "${pages[@]}"; do
  file="/Users/junwoo/Developer/Work/PLAYAUTO/frontend/src/pages/${page}.tsx"

  if [ -f "$file" ]; then
    echo "처리 중: $page.tsx"

    # toast import 변경
    sed -i '' "s/import toast, { Toaster } from 'react-hot-toast';/import { showSuccess, showError, showWarning, showInfo } from '..\/utils\/toast';/" "$file"
    sed -i '' "s/import toast from 'react-hot-toast';/import { showSuccess, showError, showWarning, showInfo } from '..\/utils\/toast';/" "$file"
    sed -i '' "s/import { toast } from 'react-hot-toast';/import { showSuccess, showError, showWarning, showInfo } from '..\/utils\/toast';/" "$file"

    # toast 호출 변경
    sed -i '' "s/toast\.success(/showSuccess(/" "$file"
    sed -i '' "s/toast\.error(/showError(/" "$file"
    sed -i '' "s/toast\.warning(/showWarning(/" "$file"
    sed -i '' "s/toast(/showInfo(/" "$file"

    echo "  - import 문 변경 완료"
    echo "  - toast 호출 변경 완료"
  else
    echo "파일을 찾을 수 없음: $page.tsx"
  fi
done

echo "토스트 메시지 통일 작업 완료!"