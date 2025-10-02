import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet, Upload, Download, AlertTriangle,
  CheckCircle, CheckCircle2, XCircle, Save, ArrowRightLeft,
  ClipboardCheck, Package, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { productAPI, transactionAPI } from '../services/api';
import { showSuccess, showError, showInfo, showWarning } from '../utils/toast';
import { PageHeader, Button, Alert } from '../components';
import { TextareaField } from '../components/forms/FormField';
import { getLocalDateString, getLocalDateTimeString } from '../utils/dateUtils';

// 입출고 일괄 처리용 행 타입
interface TransactionRow {
  category?: string;
  productCode: string;
  productName: string;
  manufacturer?: string;
  inbound: number;
  outbound: number;
  date: string;
  memo: string;
  status: 'valid' | 'error' | 'warning';
  errorMessage?: string;
}

// 재고실사 일괄 처리용 행 타입
interface StockCountRow {
  category?: string;
  productCode: string;
  productName: string;
  manufacturer?: string;
  zoneId?: string;
  systemStock: number;
  physicalStock: number;
  discrepancy: number;
  status: 'valid' | 'error' | 'warning';
  errorMessage?: string;
  explanation?: string;
}

// 제품 추가 일괄 처리용 행 타입
interface ProductRow {
  productCode: string;
  productName: string;
  barcode?: string;
  category?: string;
  manufacturer?: string;
  unit?: string;
  initialStock: number;
  safetyStock: number;
  purchasePrice: number;
  purchaseCurrency: string;
  salePrice: number;
  saleCurrency: string;
  zoneId?: string;
  warehouse?: string;  // 창고 필드 추가
  supplier?: string;
  supplierEmail?: string;
  contactEmail?: string;
  leadTime?: number;
  moq?: number;
  memo?: string;
  status: 'valid' | 'error' | 'warning';
  errorMessage?: string;
}

function BatchProcess() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    try {
      // 비활성화된 제품도 포함하여 조회 (과거 이력 기록을 위해)
      // limit은 백엔드에서 최대 500으로 제한됨
      // 활성화/비활성화 제품을 각각 조회해서 합침
      const activeResponse = await productAPI.getAll(0, 500, undefined, undefined, undefined, true);
      const inactiveResponse = await productAPI.getAll(0, 500, undefined, undefined, undefined, false);
      const allProducts = [...(activeResponse.data || []), ...(inactiveResponse.data || [])];
      setProducts(allProducts);
    } catch (error) {
      showError('제품 목록을 불러오는데 실패했습니다');
    }
  };
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'transaction' | 'stockcount' | 'product'>('transaction');
  
  // 입출고 일괄 처리 상태
  const [transactionData, setTransactionData] = useState<TransactionRow[]>([]);
  const [showTransactionPreview, setShowTransactionPreview] = useState(false);
  
  // 재고실사 일괄 처리 상태
  const [stockCountData, setStockCountData] = useState<StockCountRow[]>([]);
  const [showStockCountPreview, setShowStockCountPreview] = useState(false);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [explanations, setExplanations] = useState<{[key: string]: string}>({});
  
  // 공통 상태
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const transactionFileInputRef = useRef<HTMLInputElement>(null);
  const stockCountFileInputRef = useRef<HTMLInputElement>(null);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // 추가 상태
  const [pendingDiscrepancies, setPendingDiscrepancies] = useState<any[]>([]);

  // 제품 추가 일괄 처리 상태
  const [productData, setProductData] = useState<ProductRow[]>([]);
  const [showProductPreview, setShowProductPreview] = useState(false);
  const [duplicateProducts, setDuplicateProducts] = useState<{sku: string[], name: string[]}>({sku: [], name: []});
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // 헬퍼 함수들은 이제 utils/toast에서 import해서 사용

  const addTransaction = async (transaction: any) => {
    try {
      await transactionAPI.create(transaction);
    } catch (error) {
      console.error('Transaction creation failed:', error);
    }
  };

  const resolveDiscrepancy = async (productId: string, explanation: string) => {
    // 불일치 해결 로직 구현
    console.log('Resolving discrepancy for product:', productId, 'with explanation:', explanation);
  };

  // 입출고 템플릿 다운로드
  const downloadTransactionTemplate = () => {
    // CSV 필드를 큰따옴표로 감싸는 헬퍼 함수
    const escapeCSVField = (field: string | number | null | undefined): string => {
      if (field === null || field === undefined) return '""';
      const fieldStr = String(field);
      // 큰따옴표가 있으면 이스케이프 처리
      const escaped = fieldStr.replace(/"/g, '""');
      // 쉼표, 큰따옴표, 개행이 포함되어 있거나 항상 큰따옴표로 감싸기
      return `"${escaped}"`;
    };
    
    const headers = ['카테고리', '제품코드', '제품명', '제조사', '입고수량', '출고수량', '날짜(YYYY-MM-DD)', '메모'];
    // 카테고리 → 제품명 순서로 정렬
    const sortedProducts = [...products].sort((a, b) => {
      // 1순위: 카테고리
      const categoryCompare = (a.category || '').localeCompare(b.category || '');
      if (categoryCompare !== 0) return categoryCompare;
      // 2순위: 제품명
      return (a.product_name || '').localeCompare(b.product_name || '');
    });
    
    const sampleData = sortedProducts.map(p => [
      escapeCSVField(p.category),
      escapeCSVField(p.product_code),
      escapeCSVField(p.product_name),
      escapeCSVField(p.manufacturer),
      escapeCSVField('0'),
      escapeCSVField('0'),
      escapeCSVField(getLocalDateString()),
      escapeCSVField('')
    ]);
    
    const csvContent = [
      headers.map(escapeCSVField).join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `입출고_일괄처리_템플릿_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showInfo('템플릿 다운로드가 완료되었습니다. 입고/출고 수량을 입력해주세요.');
  };

  // 재고실사 템플릿 다운로드
  const downloadStockCountTemplate = () => {
    // CSV 필드를 큰따옴표로 감싸는 헬퍼 함수
    const escapeCSVField = (field: string | number | null | undefined): string => {
      if (field === null || field === undefined) return '""';
      const fieldStr = String(field);
      // 큰따옴표가 있으면 이스케이프 처리
      const escaped = fieldStr.replace(/"/g, '""');
      // 쉼표, 큰따옴표, 개행이 포함되어 있거나 항상 큰따옴표로 감싸기
      return `"${escaped}"`;
    };
    
    const headers = ['구역ID', '카테고리', '제품코드', '제품명', '제조사', '시스템재고', '실사재고'];
    // 구역ID → 제품명 순서로 정렬
    const sortedProducts = [...products].sort((a, b) => {
      // 1순위: 구역ID
      const zoneCompare = (a.zone_id || '').localeCompare(b.zone_id || '');
      if (zoneCompare !== 0) return zoneCompare;
      // 2순위: 제품명
      return (a.product_name || '').localeCompare(b.product_name || '');
    });
    
    const sampleData = sortedProducts.map(p => [
      escapeCSVField(p.zone_id),
      escapeCSVField(p.category),
      escapeCSVField(p.product_code),
      escapeCSVField(p.product_name),
      escapeCSVField(p.manufacturer),
      escapeCSVField(p.current_stock || 0),
      escapeCSVField('') // 실사재고는 비워둠 - 사용자가 직접 입력
    ]);
    
    const csvContent = [
      headers.map(escapeCSVField).join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `재고실사_템플릿_${getLocalDateString()}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showInfo('템플릿 다운로드가 완료되었습니다. 실사재고 수량을 확인 후 수정해주세요.');
  };

  // 제품 추가 템플릿 다운로드
  const downloadProductTemplate = () => {
    // CSV 필드를 큰따옴표로 감싸는 헬퍼 함수
    const escapeCSVField = (field: string | number | null | undefined): string => {
      if (field === null || field === undefined) return '""';
      const fieldStr = String(field);
      const escaped = fieldStr.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = [
      '제품코드(SKU)*', '제품명*', '바코드', '카테고리', '제조사',
      '단위', '초기수량', '안전재고', '판매단가', '판매통화',
      '구역ID', '창고', '공급업체', '공급업체이메일', '담당자이메일',
      '리드타임(일)', '최소주문수량', '메모'
    ];

    // 샘플 데이터 (1행만)
    const sampleData = [
      [
        escapeCSVField('P-NEW-001'),
        escapeCSVField('신규 제품 예시'),
        escapeCSVField('8801234567890'),
        escapeCSVField('영양제'),
        escapeCSVField('한국제약'),
        escapeCSVField('개'),
        escapeCSVField('50'),
        escapeCSVField('100'),
        escapeCSVField('15000'),
        escapeCSVField('KRW'),
        escapeCSVField('A-1'),
        escapeCSVField('본사 창고'),  // 창고 필드 추가
        escapeCSVField('메디팜'),
        escapeCSVField('supplier@medipharm.kr'),
        escapeCSVField('contact@company.kr'),
        escapeCSVField('7'),
        escapeCSVField('10'),
        escapeCSVField('신규 등록 제품')
      ]
    ];

    const csvContent = [
      headers.map(escapeCSVField).join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `제품추가_템플릿_${getLocalDateString()}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showInfo('템플릿 다운로드가 완료되었습니다. 제품 정보를 입력 후 업로드해주세요.');
  };

  // CSV 파싱 헬퍼 함수 - 큰따옴표로 감싸진 필드 처리
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && inQuotes && nextChar === '"') {
        // 이스케이프된 큰따옴표
        current += '"';
        i++; // 다음 문자 건너뛰기
      } else if (char === '"') {
        // 큰따옴표 시작/끝
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // 필드 구분자
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // 마지막 필드 추가
    if (current || line.endsWith(',')) {
      result.push(current.trim());
    }
    
    return result;
  };
  
  // 입출고 파일 파싱
  const parseTransactionFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const data: TransactionRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        // 날짜 형식 변환 (2025.9.30 -> 2025-09-30)
        let dateValue = values[6] || '';
        if (dateValue && dateValue.includes('.')) {
          const parts = dateValue.split('.');
          if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1].padStart(2, '0');
            const day = parts[2].padStart(2, '0');
            dateValue = `${year}-${month}-${day}`;
          }
        }

        const row: TransactionRow = {
          category: values[0] || '',
          productCode: values[1] || '',
          productName: values[2] || '',
          manufacturer: values[3] || '',
          inbound: parseInt(values[4]) || 0,
          outbound: parseInt(values[5]) || 0,
          date: dateValue || new Date().toISOString().split('T')[0],
          memo: values[7] || '',
          status: 'valid'
        };
        
        // 검증
        const product = products.find(p => p.product_code === row.productCode);
        if (!product) {
          row.status = 'error';
          row.errorMessage = '존재하지 않는 제품코드';
        } else if (row.inbound === 0 && row.outbound === 0) {
          row.status = 'warning';
          row.errorMessage = '입고/출고 수량이 모두 0입니다';
        } else {
          // 비활성화 제품 경고
          if (!product.is_active) {
            row.status = 'warning';
            row.errorMessage = `비활성화된 제품 (과거 이력 기록용)`;
          }
          // 재고 부족 경고 (과거 이력일 경우 백엔드에서 처리)
          else if (row.outbound > product.current_stock + row.inbound) {
            row.status = 'warning';
            row.errorMessage = `재고 부족 가능성 (현재: ${product.current_stock}개 + 입고: ${row.inbound}개 = ${product.current_stock + row.inbound}개 < 출고: ${row.outbound}개) - 과거 이력이면 처리됨`;
          }
        }
        
        data.push(row);
      }
      
      setTransactionData(data);
      setShowTransactionPreview(true);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 재고실사 파일 파싱
  const parseStockCountFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const data: StockCountRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: StockCountRow = {
          zoneId: values[0] || '',
          category: values[1] || '',
          productCode: values[2] || '',
          productName: values[3] || '',
          manufacturer: values[4] || '',
          systemStock: parseInt(values[5]) || 0,
          physicalStock: parseInt(values[6]) || 0,
          discrepancy: 0,
          status: 'valid'
        };
        
        // 검증
        const product = products.find(p => p.product_code === row.productCode);
        if (!product) {
          row.status = 'error';
          row.errorMessage = '존재하지 않는 제품코드';
        } else {
          row.systemStock = product.current_stock;
          row.discrepancy = row.physicalStock - row.systemStock;
          
          if (row.discrepancy !== 0) {
            row.status = 'warning';
            row.errorMessage = `불일치: ${row.discrepancy > 0 ? '+' : ''}${row.discrepancy}개`;
          }
        }
        
        data.push(row);
      }
      
      setStockCountData(data);
      setShowStockCountPreview(true);
      
      // 불일치가 있으면 소명 모달 표시
      const hasDiscrepancy = data.some(d => d.discrepancy !== 0);
      if (hasDiscrepancy) {
        setShowExplanationModal(true);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 제품 CSV 파일 파싱
  const parseProductFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      // 헤더 제거
      lines.shift();

      const data: ProductRow[] = [];
      const skuSet = new Set<string>();
      const nameSet = new Set<string>();
      const duplicateSKUs: string[] = [];
      const duplicateNames: string[] = [];

      // 기존 제품 정보 가져오기 (중복 체크용)
      const existingSKUs = new Set(products.map(p => p.product_code));
      const existingNames = new Set(products.map(p => p.product_name));

      // 숫자 파싱 헬퍼 함수 (천 단위 구분자 제거)
      const parseNumber = (value: string | undefined): number => {
        if (!value) return 0;
        // 쉼표 제거 후 파싱
        const cleanValue = value.toString().replace(/,/g, '');
        return parseInt(cleanValue) || 0;
      };

      // 안전재고 파싱 함수 (최소값 1 보장)
      const parseSafetyStock = (value: string | undefined): number => {
        if (!value || value === '-' || value === '0') return 1;
        // 쉼표 제거 후 파싱
        const cleanValue = value.toString().replace(/,/g, '');
        const parsed = parseInt(cleanValue);
        return parsed > 0 ? parsed : 1;
      };

      for (let i = 0; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);

        // 필수 필드 체크
        if (!values[0] || !values[1]) continue;

        const row: ProductRow = {
          productCode: values[0]?.trim() || '',
          productName: values[1]?.trim() || '',
          barcode: values[2]?.trim() || '',
          category: values[3]?.trim() || '',
          manufacturer: values[4]?.trim() || '',
          unit: values[5]?.trim() || '개',
          initialStock: parseNumber(values[6]),
          safetyStock: parseSafetyStock(values[7]),
          purchasePrice: 0,  // 기본값 0
          purchaseCurrency: 'KRW',  // 기본값 KRW
          salePrice: parseFloat(values[8]?.replace(/,/g, '')) || 0,
          saleCurrency: values[9]?.trim() || 'KRW',
          zoneId: values[10]?.trim() || '',
          warehouse: values[11]?.trim() || '',  // 창고 필드 추가
          supplier: values[12]?.trim() || '',
          supplierEmail: values[13]?.trim() || '',
          contactEmail: values[14]?.trim() || '',
          leadTime: parseNumber(values[15]),
          moq: parseNumber(values[16]),
          memo: values[17]?.trim() || '',
          status: 'valid',
          errorMessage: ''
        };

        // SKU 중복 체크 (DB에 이미 존재하는지)
        if (existingSKUs.has(row.productCode)) {
          row.status = 'error';
          row.errorMessage = `이미 등록된 제품코드(SKU): ${row.productCode}`;
          duplicateSKUs.push(row.productCode);
        }
        // SKU 중복 체크 (CSV 내에서)
        else if (skuSet.has(row.productCode)) {
          row.status = 'error';
          row.errorMessage = `CSV 내 중복 제품코드(SKU): ${row.productCode}`;
          duplicateSKUs.push(row.productCode);
        } else {
          skuSet.add(row.productCode);
        }

        // 제품명 중복 체크 (경고만)
        if (existingNames.has(row.productName)) {
          if (row.status !== 'error') {
            row.status = 'warning';
            row.errorMessage = `이미 등록된 제품명: ${row.productName}`;
          }
          duplicateNames.push(row.productName);
        } else if (nameSet.has(row.productName)) {
          if (row.status !== 'error') {
            row.status = 'warning';
            row.errorMessage = `CSV 내 중복 제품명: ${row.productName}`;
          }
          duplicateNames.push(row.productName);
        } else {
          nameSet.add(row.productName);
        }

        data.push(row);
      }

      setProductData(data);
      setShowProductPreview(true);
      setDuplicateProducts({ sku: duplicateSKUs, name: duplicateNames });

      // SKU 중복이 있으면 에러 표시
      if (duplicateSKUs.length > 0) {
        showError(`중복된 제품코드(SKU)가 있습니다: ${duplicateSKUs.join(', ')}`);
      }
      // 제품명 중복이 있으면 경고 표시
      else if (duplicateNames.length > 0) {
        setShowDuplicateWarning(true);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'transaction' | 'stockcount' | 'product') => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        if (type === 'transaction') {
          parseTransactionFile(file);
        } else if (type === 'stockcount') {
          parseStockCountFile(file);
        } else if (type === 'product') {
          parseProductFile(file);
        }
      } else {
        showError('CSV 파일만 업로드 가능합니다.');
      }
    }
  };

  // 입출고 일괄 처리 실행
  const processTransactions = async () => {
    setIsProcessing(true);
    
    try {
      const transactions = [];
      
      for (const row of transactionData) {
        if (row.status === 'error') continue;
        
        const product = products.find(p => p.product_code === row.productCode);
        if (!product) continue;
        
        // 입고 처리
        if (row.inbound > 0) {
          // 날짜가 있으면 해당 날짜의 현재 시간을 사용
          let transactionDate = getLocalDateTimeString();
          if (row.date) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            transactionDate = `${row.date}T${hours}:${minutes}:${seconds}+09:00`;
          }

          transactions.push({
            product_code: row.productCode,
            product_name: row.productName,
            transaction_type: 'IN',
            quantity: row.inbound,
            date: transactionDate,
            memo: row.memo || '일괄 입고 처리'
          });
        }

        // 출고 처리
        if (row.outbound > 0) {
          // 날짜가 있으면 해당 날짜의 현재 시간을 사용
          let transactionDate = getLocalDateTimeString();
          if (row.date) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            transactionDate = `${row.date}T${hours}:${minutes}:${seconds}+09:00`;
          }

          transactions.push({
            product_code: row.productCode,
            product_name: row.productName,
            transaction_type: 'OUT',
            quantity: row.outbound,
            date: transactionDate,
            memo: row.memo || '일괄 출고 처리'
          });
        }
      }
      
      if (transactions.length > 0) {
        // 백엔드 batch API 호출
        const response = await fetch('http://localhost:8000/api/v1/batch/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transactions })
        });
        
        const result = await response.json();
        
        if (result.success > 0) {
          showSuccess(`${result.success}개 거래가 처리되었습니다.`);
        }
        
        if (result.failed > 0) {
          showError(`${result.failed}개 거래가 실패했습니다.`);
          console.error('Batch processing errors:', result.errors);
        }
      }
      
      await fetchProducts(); // 제품 목록 새로고침
      setShowTransactionPreview(false);
      setTransactionData([]);
    } catch (error) {
      console.error('Batch processing error:', error);
      showError('일괄 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 재고실사 일괄 처리 실행
  const processStockCount = async () => {
    // 불일치 항목 중 소명이 없는 것 체크
    const discrepancyRows = stockCountData.filter(d => d.discrepancy !== 0);
    const missingExplanations = discrepancyRows.filter(d => 
      !explanations[d.productCode] || explanations[d.productCode].length < 10
    );
    
    if (missingExplanations.length > 0) {
      showError('모든 불일치 항목에 대해 10자 이상의 소명을 입력해주세요.');
      setShowExplanationModal(true);
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const transactions = [];
      
      for (const row of stockCountData) {
        if (row.status === 'error') continue;
        
        const product = products.find(p => p.product_code === row.productCode);
        if (!product) continue;
        
        // 불일치 조정 처리
        if (row.discrepancy !== 0) {
          transactions.push({
            product_code: row.productCode,
            product_name: row.productName,
            transaction_type: 'ADJUST',
            quantity: row.discrepancy, // ADJUST는 조정량 (차이값)으로 설정
            date: getLocalDateTimeString(),  // 로컬 시간을 한국 타임존으로 전송
            reason: '재고실사',
            memo: explanations[row.productCode] || '재고실사 조정'
          });
        }
      }
      
      if (transactions.length > 0) {
        // 백엔드 batch API 호출
        const response = await fetch('http://localhost:8000/api/v1/batch/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transactions })
        });
        
        const result = await response.json();
        
        if (result.success > 0) {
          showSuccess(`${result.success}개 재고 조정이 완료되었습니다.`);
        }
        
        if (result.failed > 0) {
          showError(`${result.failed}개 조정이 실패했습니다.`);
          console.error('Stock count errors:', result.errors);
        }
      }
      
      await fetchProducts(); // 제품 목록 새로고침
      setShowStockCountPreview(false);
      setStockCountData([]);
      setExplanations({});
    } catch (error) {
      console.error('Stock count processing error:', error);
      showError('재고실사 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 제품 추가 일괄 처리
  const processProducts = async () => {
    // 중복된 제품명이 있는 경우 경고 확인
    const nameWarnings = productData.filter(d => d.status === 'warning' && d.errorMessage?.includes('제품명'));
    if (nameWarnings.length > 0 && !showDuplicateWarning) {
      const confirmMessage = `다음 제품명이 이미 존재합니다:\n${nameWarnings.map(p => `- ${p.productName}`).join('\n')}\n\n계속 진행하시겠습니까?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setIsProcessing(true);

    try {
      const validProducts = productData.filter(d => d.status !== 'error');

      // 백엔드 batch/products API 호출
      const response = await fetch('http://localhost:8000/api/v1/batch/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products: validProducts })
      });

      const result = await response.json();

      if (result.success > 0) {
        showSuccess(`${result.success}개의 제품이 성공적으로 추가되었습니다.`);

        // 제품 목록 새로고침
        await fetchProducts();
      }

      if (result.failed > 0) {
        showWarning(`${result.failed}개의 제품 추가에 실패했습니다.`);
      }

      // 상태 초기화
      setShowProductPreview(false);
      setProductData([]);
      setDuplicateProducts({sku: [], name: []});
      setShowDuplicateWarning(false);

      // 파일 입력 초기화
      if (productFileInputRef.current) {
        productFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Product batch processing error:', error);
      showError('제품 추가 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="일괄 처리"
        icon={FileSpreadsheet}
      />

      {/* 탭 선택 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('transaction')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transaction'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={16} />
                입출고 일괄 처리
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stockcount')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'stockcount'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardCheck size={16} />
                재고실사 일괄 처리
              </div>
            </button>
            <button
              onClick={() => setActiveTab('product')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'product'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package size={16} />
                제품 추가 일괄 처리
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* 입출고 일괄 처리 탭 */}
          {activeTab === 'transaction' && (
            <div>
              {/* 설명 */}
              <Alert
                type="info"
                message="입고와 출고를 한번에 처리할 수 있습니다. 템플릿을 다운로드하여 수량을 입력 후 업로드하세요."
                className="mb-4"
              />

              {/* 템플릿 다운로드 버튼 */}
              <div className="mb-6">
                <Button icon={Download} onClick={downloadTransactionTemplate}>
                  입출고 템플릿 다운로드
                </Button>
              </div>

              {/* 파일 업로드 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'transaction')}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">CSV 파일을 드래그하여 업로드하거나</p>
                <input
                  ref={transactionFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) parseTransactionFile(file);
                  }}
                  className="hidden"
                />
                <Button
                  onClick={() => transactionFileInputRef.current?.click()}
                  variant="outline"
                >
                  파일 선택
                </Button>
                <p className="text-sm text-gray-500 mt-2">CSV 파일만 지원됩니다</p>
              </div>

              {/* 미리보기 */}
              {showTransactionPreview && (
                <div className="mt-6 border rounded-lg">
                  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-semibold">데이터 미리보기</h3>
                    <span className="text-sm text-gray-600">
                      총 {transactionData.length}건 | 
                      정상 {transactionData.filter(d => d.status === 'valid').length}건 | 
                      오류 {transactionData.filter(d => d.status === 'error').length}건
                    </span>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b">
                          <th className="text-left p-3">상태</th>
                          <th className="text-left p-3">카테고리</th>
                          <th className="text-left p-3">제품코드</th>
                          <th className="text-left p-3">제품명</th>
                          <th className="text-left p-3">제조사</th>
                          <th className="text-right p-3">입고</th>
                          <th className="text-right p-3">출고</th>
                          <th className="text-left p-3">날짜</th>
                          <th className="text-left p-3">메모</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactionData.map((row, idx) => (
                          <tr key={idx} className={`border-b ${
                            row.status === 'error' ? 'bg-red-50' : 
                            row.status === 'warning' ? 'bg-yellow-50' : ''
                          }`}>
                            <td className="p-3">
                              {row.status === 'valid' && <CheckCircle size={16} className="text-green-500" />}
                              {row.status === 'warning' && <AlertTriangle size={16} className="text-yellow-500" />}
                              {row.status === 'error' && <XCircle size={16} className="text-red-500" />}
                            </td>
                            <td className="p-3">{row.category || '-'}</td>
                            <td className="p-3">{row.productCode}</td>
                            <td className="p-3">{row.productName}</td>
                            <td className="p-3">{row.manufacturer || '-'}</td>
                            <td className="text-right p-3">{row.inbound || '-'}</td>
                            <td className="text-right p-3">{row.outbound || '-'}</td>
                            <td className="p-3">{row.date}</td>
                            <td className="p-3">
                              {row.errorMessage ? (
                                <span className="text-red-600 text-xs">{row.errorMessage}</span>
                              ) : (
                                row.memo
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTransactionPreview(false);
                        setTransactionData([]);
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={processTransactions}
                      disabled={isProcessing || transactionData.some(d => d.status === 'error')}
                      icon={Save}
                    >
                      {isProcessing ? '처리중...' : '처리 실행'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 재고실사 일괄 처리 탭 */}
          {activeTab === 'stockcount' && (
            <div>
              {/* 설명 */}
              <Alert
                type="warning"
                message="실사재고와 시스템재고가 다른 경우 반드시 원인을 입력해야 합니다. 소명 없이는 일일마감이 불가능합니다."
                className="mb-4"
              />

              {/* 템플릿 다운로드 버튼 */}
              <div className="mb-6">
                <Button icon={Download} onClick={downloadStockCountTemplate}>
                  재고실사 템플릿 다운로드
                </Button>
              </div>

              {/* 파일 업로드 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'stockcount')}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">CSV 파일을 드래그하여 업로드하거나</p>
                <input
                  ref={stockCountFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) parseStockCountFile(file);
                  }}
                  className="hidden"
                />
                <Button
                  onClick={() => stockCountFileInputRef.current?.click()}
                  variant="outline"
                >
                  파일 선택
                </Button>
                <p className="text-sm text-gray-500 mt-2">CSV 파일만 지원됩니다</p>
              </div>

              {/* 미리보기 */}
              {showStockCountPreview && (
                <div className="mt-6 border rounded-lg">
                  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-semibold">재고실사 결과</h3>
                    <span className="text-sm text-gray-600">
                      총 {stockCountData.length}건 | 
                      일치 {stockCountData.filter(d => d.discrepancy === 0).length}건 | 
                      불일치 {stockCountData.filter(d => d.discrepancy !== 0).length}건
                    </span>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b">
                          <th className="text-left p-3">상태</th>
                          <th className="text-left p-3">구역ID</th>
                          <th className="text-left p-3">카테고리</th>
                          <th className="text-left p-3">제품코드</th>
                          <th className="text-left p-3">제품명</th>
                          <th className="text-left p-3">제조사</th>
                          <th className="text-right p-3">시스템재고</th>
                          <th className="text-right p-3">실사재고</th>
                          <th className="text-right p-3">차이</th>
                          <th className="text-left p-3">소명</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockCountData.map((row, idx) => (
                          <tr key={idx} className={`border-b ${
                            row.status === 'error' ? 'bg-red-50' : 
                            row.discrepancy !== 0 ? 'bg-yellow-50' : ''
                          }`}>
                            <td className="p-3">
                              {row.discrepancy === 0 && <CheckCircle size={16} className="text-green-500" />}
                              {row.discrepancy !== 0 && <AlertTriangle size={16} className="text-yellow-500" />}
                              {row.status === 'error' && <XCircle size={16} className="text-red-500" />}
                            </td>
                            <td className="p-3">{row.zoneId || '-'}</td>
                            <td className="p-3">{row.category || '-'}</td>
                            <td className="p-3">{row.productCode}</td>
                            <td className="p-3">{row.productName}</td>
                            <td className="p-3">{row.manufacturer || '-'}</td>
                            <td className="text-right p-3">{row.systemStock}</td>
                            <td className="text-right p-3">{row.physicalStock}</td>
                            <td className="text-right p-3">
                              <span className={row.discrepancy !== 0 ? 'font-bold text-red-600' : ''}>
                                {row.discrepancy > 0 ? '+' : ''}{row.discrepancy}
                              </span>
                            </td>
                            <td className="p-3">
                              {explanations[row.productCode] && (
                                <span className="text-xs text-green-600">✓ 입력완료</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowStockCountPreview(false);
                        setStockCountData([]);
                        setExplanations({});
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={processStockCount}
                      disabled={isProcessing || stockCountData.some(d => d.status === 'error')}
                      icon={Save}
                    >
                      {isProcessing ? '처리중...' : '조정 실행'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 제품 추가 일괄 처리 탭 */}
          {activeTab === 'product' && (
            <div>
              {/* 설명 */}
              <Alert
                type="info"
                message="여러 제품을 한번에 추가할 수 있습니다. 템플릿을 다운로드하여 정보를 입력 후 업로드하세요."
                className="mb-4"
              />

              {/* 템플릿 다운로드 버튼 */}
              <div className="mb-6">
                <Button icon={Download} onClick={downloadProductTemplate}>
                  제품 추가 템플릿 다운로드
                </Button>
              </div>

              {/* 파일 업로드 영역 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'product')}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg mb-2">CSV 파일을 드래그하여 업로드하거나</p>
                <input
                  ref={productFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) parseProductFile(file);
                  }}
                  className="hidden"
                />
                <Button
                  onClick={() => productFileInputRef.current?.click()}
                  variant="outline"
                >
                  파일 선택
                </Button>
                <p className="text-sm text-gray-500 mt-2">CSV 파일만 지원됩니다</p>
              </div>

              {/* 미리보기 */}
              {showProductPreview && (
                <div className="mt-6 border rounded-lg">
                  <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-semibold">데이터 미리보기</h3>
                    <span className="text-sm text-gray-600">
                      총 {productData.length}건 |
                      정상 {productData.filter(d => d.status === 'valid').length}건 |
                      경고 {productData.filter(d => d.status === 'warning').length}건 |
                      오류 {productData.filter(d => d.status === 'error').length}건
                    </span>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b">
                          <th className="text-left p-3">상태</th>
                          <th className="text-left p-3">SKU</th>
                          <th className="text-left p-3">제품명</th>
                          <th className="text-left p-3">카테고리</th>
                          <th className="text-left p-3">제조사</th>
                          <th className="text-right p-3">안전재고</th>
                          <th className="text-right p-3">판매가격</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productData.map((row, idx) => (
                          <tr key={idx} className={`border-b ${
                            row.status === 'error' ? 'bg-red-50' :
                            row.status === 'warning' ? 'bg-yellow-50' : ''
                          }`}>
                            <td className="p-3">
                              {row.status === 'valid' && (
                                <CheckCircle2 size={16} className="text-green-500" />
                              )}
                              {row.status === 'warning' && (
                                <AlertTriangle size={16} className="text-yellow-500" />
                              )}
                              {row.status === 'error' && (
                                <XCircle size={16} className="text-red-500" />
                              )}
                            </td>
                            <td className="p-3">{row.productCode}</td>
                            <td className="p-3">{row.productName}</td>
                            <td className="p-3">{row.category || '-'}</td>
                            <td className="p-3">{row.manufacturer || '-'}</td>
                            <td className="text-right p-3">{row.safetyStock}개</td>
                            <td className="text-right p-3">
                              {row.salePrice.toLocaleString()} {row.saleCurrency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 border-t flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowProductPreview(false);
                        setProductData([]);
                        setDuplicateProducts({sku: [], name: []});
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      onClick={processProducts}
                      disabled={isProcessing || productData.some(d => d.status === 'error')}
                      icon={isProcessing ? undefined : CheckCircle2}
                    >
                      {isProcessing ? '처리 중...' : `${productData.filter(d => d.status !== 'error').length}개 제품 추가`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 재고 불일치 소명 모달 */}
      {showExplanationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold">재고 불일치 소명 입력</h2>
            </div>
            
            <Alert
              type="warning"
              message="재고 불일치가 발견되었습니다. 각 항목에 대한 원인을 상세히 입력해주세요. 소명 없이는 일일마감이 불가능합니다."
              className="mb-6"
            />
            
            <div className="space-y-4">
              {stockCountData.filter(d => d.discrepancy !== 0).map((row, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">
                        {row.productCode} - {row.productName}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span>시스템재고: <strong>{row.systemStock}개</strong></span>
                        <span>→</span>
                        <span>실사재고: <strong>{row.physicalStock}개</strong></span>
                        <span className={`font-bold ${row.discrepancy > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          (차이: {row.discrepancy > 0 ? '+' : ''}{row.discrepancy}개)
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <TextareaField
                    label="불일치 원인"
                    name={`explanation_${row.productCode}`}
                    value={explanations[row.productCode] || ''}
                    onChange={(e) => setExplanations({
                      ...explanations,
                      [row.productCode]: e.target.value
                    })}
                    placeholder="예: 파손 3개, 도난 추정 2개 등 구체적으로 입력 (최소 10자)"
                    rows={2}
                    hint={`${(explanations[row.productCode] || '').length}/10자`}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowExplanationModal(false)}
              >
                닫기
              </Button>
              <Button
                onClick={() => {
                  const allExplained = stockCountData
                    .filter(d => d.discrepancy !== 0)
                    .every(d => explanations[d.productCode]?.length >= 10);
                  
                  if (allExplained) {
                    setShowExplanationModal(false);
                    showSuccess('소명이 모두 입력되었습니다.');
                  } else {
                    showError('모든 불일치 항목에 대해 최소 10자 이상의 소명을 입력해주세요.');
                  }
                }}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 미처리 불일치 현황 */}
      {pendingDiscrepancies.length > 0 && (
        <Alert
          type="error"
          message={`처리되지 않은 재고 불일치가 ${pendingDiscrepancies.length}건 있습니다. 일일마감 전까지 반드시 처리해주세요.`}
          className="mt-6"
        />
      )}
    </div>
  );
}

export default BatchProcess;