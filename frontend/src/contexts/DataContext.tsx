import React, { createContext, useContext, useState, useEffect } from 'react';

// 타입 정의
export interface Product {
  id: string;
  productCode: string;
  productName: string;
  barcode: string;
  category: string;
  currentStock: number;
  bookStock: number; // 장부재고
  physicalStock: number; // 실재고
  minStock: number;
  maxStock: number;
  price: number;
  lastScanned?: Date;
  accuracyRate?: number; // 정확도
  discrepancy?: number; // 불일치
  lastAdjustmentDate?: Date; // 마지막 조정 날짜
  lastAdjustmentReason?: string; // 마지막 조정 사유
  bom?: BOMItem[]; // BOM 구성
  // 추가 필드
  reorderPoint?: number; // 자동 발주점
  safetyStock?: number; // 안전 재고량
  isAutoCalculated?: boolean; // 자동 계산 여부
  safetyStockLastCalculated?: Date; // 마지막 계산 시간
  leadTime?: number; // 리드타임 (일)
  supplier?: string; // 공급업체
  supplierContact?: string; // 공급업체 연락처
  supplierEmail?: string; // 공급업체 이메일
  moq?: number; // 최소 발주 수량
  purchasePrice?: number; // 구매가
  zoneId?: string; // 구역 ID
  orderEmailTemplate?: string; // 발주 메일 템플릿
}

export interface BOMItem {
  childProductId: string;
  childProductName: string;
  quantity: number;
}

export interface Transaction {
  id: string;
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  productId: string;
  productName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  date: Date;
  memo?: string;
  reason?: string; // 조정 사유
  uploadFileId?: string; // 엑셀 업로드 ID
  createdBy: string;
  createdAt: Date;
  isRollbackable: boolean; // 롤백 가능 여부
}

export interface ExcelUpload {
  id: string;
  fileName: string;
  uploadedAt: Date;
  uploadedBy: string;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  transactions: string[]; // Transaction IDs
}

export interface AdjustmentAnalysis {
  period: 'week' | 'month';
  totalAdjustments: number;
  totalLossAmount: number;
  topAdjustedProducts: Array<{
    productId: string;
    productName: string;
    adjustmentCount: number;
    totalQuantity: number;
  }>;
  reasonBreakdown: {
    [key: string]: number;
  };
  accuracyRate: number;
  accuracyTrend: Array<{
    date: string;
    rate: number;
  }>;
}

interface DataContextType {
  // 제품 관련
  products: Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  getProduct: (id: string) => Product | undefined;
  
  // 거래 관련
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  rollbackTransaction: (transactionId: string, reason: string) => void;
  
  // 엑셀 업로드 관련
  excelUploads: ExcelUpload[];
  uploadExcel: (file: File) => Promise<void>;
  rollbackExcelUpload: (uploadId: string, reason: string) => void;
  
  // 조정 분석
  getAdjustmentAnalysis: (period: 'week' | 'month') => AdjustmentAnalysis;
  
  // BOM 관련
  assembleSet: (productId: string, quantity: number) => void;
  disassembleSet: (productId: string, quantity: number) => void;
  
  // 불일치 처리
  pendingDiscrepancies: Array<{
    productId: string;
    systemStock: number;
    excelStock: number;
    difference: number;
    requiresExplanation: boolean;
  }>;
  resolveDiscrepancy: (productId: string, explanation: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 가라데이터 초기화
  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      productCode: 'SKU001',
      productName: '바이오밸런스',
      barcode: '8809123456789',
      category: '영양제',
      currentStock: 2005,
      bookStock: 2005,
      physicalStock: 2005,
      minStock: 100,
      maxStock: 5000,
      price: 35000,
      accuracyRate: 100,
      discrepancy: 0,
      lastAdjustmentDate: new Date('2025-01-15'),
      lastAdjustmentReason: '월말 재고 실사',
      bom: [
        { childProductId: '2', childProductName: '비타민C', quantity: 2 },
        { childProductId: '3', childProductName: '오메가3', quantity: 1 }
      ],
      reorderPoint: 150,
      safetyStock: 150,
      isAutoCalculated: false,
      leadTime: 7,
      supplier: 'NPK',
      supplierContact: '02-1234-5678',
      moq: 50,
      purchasePrice: 28000
    },
    {
      id: '2',
      productCode: 'SKU002',
      productName: '비타민C',
      barcode: '8809123456790',
      category: '영양제',
      currentStock: 500,
      bookStock: 500,
      physicalStock: 498,
      minStock: 50,
      maxStock: 1000,
      price: 15000,
      accuracyRate: 99.6,
      discrepancy: -2,
      lastAdjustmentDate: new Date('2025-01-02'),
      lastAdjustmentReason: '실사 차이',
      reorderPoint: 80,
      safetyStock: 80,
      isAutoCalculated: false,
      leadTime: 5,
      supplier: '한국팜',
      supplierContact: '02-2345-6789',
      moq: 100,
      purchasePrice: 12000
    },
    {
      id: '3',
      productCode: 'SKU003',
      productName: '오메가3',
      barcode: '8809123456791',
      category: '영양제',
      currentStock: 300,
      bookStock: 300,
      physicalStock: 295,
      minStock: 30,
      maxStock: 800,
      price: 25000,
      accuracyRate: 98.3,
      discrepancy: -5,
      lastAdjustmentDate: new Date('2025-01-10'),
      lastAdjustmentReason: '월간 재고 조사',
      reorderPoint: 50,
      safetyStock: 50,
      isAutoCalculated: false,
      leadTime: 10,
      supplier: 'NPK',
      supplierContact: '02-1234-5678',
      moq: 100,
      purchasePrice: 20000
    },
    {
      id: '4',
      productCode: 'SKU004',
      productName: '프로바이오틱스',
      barcode: '8809123456792',
      category: '영양제',
      currentStock: 150,
      bookStock: 150,
      physicalStock: 152,
      minStock: 20,
      maxStock: 500,
      price: 40000,
      accuracyRate: 98.7,
      discrepancy: 2,
      reorderPoint: 30,
      safetyStock: 30,
      isAutoCalculated: false,
      leadTime: 14,
      supplier: '바이오텍',
      supplierContact: '02-3456-7890',
      moq: 200,
      purchasePrice: 32000
    }
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 't1',
      type: 'inbound',
      productId: '1',
      productName: '바이오밸런스',
      quantity: 100,
      previousStock: 1905,
      newStock: 2005,
      date: new Date('2025-01-01'),
      memo: '정기 입고',
      createdBy: '관리자',
      createdAt: new Date('2025-01-01'),
      isRollbackable: true
    },
    {
      id: 't2',
      type: 'adjustment',
      productId: '2',
      productName: '비타민C',
      quantity: -2,
      previousStock: 500,
      newStock: 498,
      date: new Date('2025-01-02'),
      reason: '실사 차이',
      memo: '월말 재고 실사 중 발견된 차이',
      createdBy: '관리자',
      createdAt: new Date('2025-01-02'),
      isRollbackable: false
    }
  ]);

  const [excelUploads, setExcelUploads] = useState<ExcelUpload[]>([]);
  const [pendingDiscrepancies, setPendingDiscrepancies] = useState<any[]>([]);

  // 안전 재고량 자동 계산 함수
  const calculateSafetyStockForProduct = (productId: string, currentProducts: Product[], currentTransactions: Transaction[]): number | null => {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return null;

    // 해당 제품의 출고 이력만 필터링
    const outboundTransactions = currentTransactions.filter(
      t => t.productId === productId && (t.type === 'outbound' || t.type === 'dispatch')
    );

    // 1개월 이상의 데이터가 있는지 확인
    if (outboundTransactions.length === 0) return null;

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    // 1개월 이상의 데이터 확인
    const recentTransactions = outboundTransactions.filter(
      t => new Date(t.date) >= oneMonthAgo
    );

    if (recentTransactions.length === 0) return null;

    // 최근 3개월 데이터로 일평균 출고량 계산
    const threeMonthTransactions = outboundTransactions.filter(
      t => new Date(t.date) >= threeMonthsAgo
    );

    // 일별 출고량 계산
    const dailyOutbound: { [key: string]: number } = {};
    threeMonthTransactions.forEach(t => {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      dailyOutbound[dateKey] = (dailyOutbound[dateKey] || 0) + Math.abs(t.quantity);
    });

    // 일평균 출고량 계산
    const days = Object.keys(dailyOutbound).length || 1;
    const totalOutbound = Object.values(dailyOutbound).reduce((sum, qty) => sum + qty, 0);
    const avgDailyOutbound = totalOutbound / days;

    // 리드타임 + 버퍼(7일)
    const leadTime = product.leadTime || 7; // 기본 리드타임 7일
    const bufferDays = 7;
    const totalDays = leadTime + bufferDays;

    // 안전 재고량 = 일평균 출고량 × (리드타임 + 버퍼)
    const safetyStock = Math.ceil(avgDailyOutbound * totalDays);

    return safetyStock;
  };

  // 제품 관련 함수
  const addProduct = (product: Product) => {
    setProducts([...products, product]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(products.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const getProduct = (id: string) => {
    return products.find(p => p.id === id);
  };

  // 거래 관련 함수
  const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `t${Date.now()}`,
      createdAt: new Date(),
      isRollbackable: transaction.type !== 'adjustment'
    };
    
    setTransactions([...transactions, newTransaction]);
    
    // 재고 업데이트
    const product = products.find(p => p.id === transaction.productId);
    if (product) {
      const newStock = product.currentStock + (transaction.type === 'outbound' ? -transaction.quantity : transaction.quantity);
      
      // 조정 작업인 경우 불일치 정보 업데이트
      if (transaction.type === 'adjustment') {
        // 조정 시 실재고와 장부재고의 차이를 기록
        const discrepancy = transaction.quantity; // 조정 수량이 곧 불일치 수량
        updateProduct(transaction.productId, {
          currentStock: newStock,
          bookStock: newStock,
          physicalStock: newStock,
          discrepancy: discrepancy,
          lastAdjustmentDate: new Date(),
          lastAdjustmentReason: transaction.reason || '재고 조정',
          accuracyRate: Math.max(0, 100 - Math.abs(discrepancy / product.currentStock * 100))
        });
      } else {
        // 일반 거래는 현재 재고만 업데이트
        updateProduct(transaction.productId, {
          currentStock: newStock,
          bookStock: newStock
        });
      }
      
      // 출고 거래인 경우 안전 재고량 자동 재계산
      if (transaction.type === 'outbound' || transaction.type === 'dispatch') {
        setTimeout(() => {
          const calculatedStock = calculateSafetyStockForProduct(transaction.productId, products, [...transactions, newTransaction]);
          if (calculatedStock !== null) {
            const currentProduct = products.find(p => p.id === transaction.productId);
            // 수동으로 설정한 값이 아니면 자동 업데이트
            if (currentProduct && currentProduct.isAutoCalculated !== false) {
              updateProduct(transaction.productId, {
                safetyStock: calculatedStock,
                isAutoCalculated: true,
                safetyStockLastCalculated: new Date()
              });
            }
          }
        }, 100); // 상태 업데이트 후 실행
      }
    }
  };

  const rollbackTransaction = (transactionId: string, reason: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (transaction && transaction.isRollbackable) {
      // 역방향 거래 생성
      addTransaction({
        type: transaction.type === 'inbound' ? 'outbound' : 'inbound',
        productId: transaction.productId,
        productName: transaction.productName,
        quantity: transaction.quantity,
        previousStock: transaction.newStock,
        newStock: transaction.previousStock,
        date: new Date(),
        memo: `롤백: ${reason}`,
        createdBy: '관리자'
      });
    }
  };

  // 엑셀 업로드 함수
  const uploadExcel = async (file: File) => {
    // 가상의 엑셀 처리
    const upload: ExcelUpload = {
      id: `upload${Date.now()}`,
      fileName: file.name,
      uploadedAt: new Date(),
      uploadedBy: '관리자',
      totalRows: 10,
      processedRows: 8,
      errorRows: 2,
      status: 'completed',
      transactions: []
    };
    
    setExcelUploads([...excelUploads, upload]);
    
    // 가상의 불일치 생성
    setPendingDiscrepancies([
      {
        productId: '1',
        systemStock: 2005,
        excelStock: 2000,
        difference: -5,
        requiresExplanation: true
      }
    ]);
  };

  const rollbackExcelUpload = (uploadId: string, reason: string) => {
    const upload = excelUploads.find(u => u.id === uploadId);
    if (upload) {
      upload.transactions.forEach(tId => {
        rollbackTransaction(tId, reason);
      });
    }
  };

  // 조정 분석 함수
  const getAdjustmentAnalysis = (period: 'week' | 'month'): AdjustmentAnalysis => {
    const adjustments = transactions.filter(t => t.type === 'adjustment');
    
    return {
      period,
      totalAdjustments: adjustments.length,
      totalLossAmount: adjustments.reduce((sum, t) => sum + (t.quantity < 0 ? Math.abs(t.quantity) * 35000 : 0), 0),
      topAdjustedProducts: [
        { productId: '2', productName: '비타민C', adjustmentCount: 3, totalQuantity: -5 },
        { productId: '3', productName: '오메가3', adjustmentCount: 2, totalQuantity: -3 }
      ],
      reasonBreakdown: {
        '실사 차이': 45,
        '파손/폐기': 25,
        '도난/분실': 15,
        '시스템 오류': 10,
        '기타': 5
      },
      accuracyRate: 97.5,
      accuracyTrend: [
        { date: '2025-W01', rate: 96.5 },
        { date: '2025-W02', rate: 97.0 },
        { date: '2025-W03', rate: 97.5 },
        { date: '2025-W04', rate: 97.5 }
      ]
    };
  };

  // BOM 관련 함수
  const assembleSet = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (product && product.bom) {
      // 부품 차감
      product.bom.forEach(item => {
        const childProduct = products.find(p => p.id === item.childProductId);
        if (childProduct) {
          updateProduct(item.childProductId, {
            currentStock: childProduct.currentStock - (item.quantity * quantity)
          });
        }
      });
      
      // 세트 증가
      updateProduct(productId, {
        currentStock: product.currentStock + quantity
      });
      
      // 거래 기록
      addTransaction({
        type: 'adjustment',
        productId,
        productName: product.productName,
        quantity,
        previousStock: product.currentStock,
        newStock: product.currentStock + quantity,
        date: new Date(),
        reason: '세트 조립',
        memo: `${quantity}개 세트 조립`,
        createdBy: '관리자'
      });
    }
  };

  const disassembleSet = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (product && product.bom) {
      // 세트 차감
      updateProduct(productId, {
        currentStock: product.currentStock - quantity
      });
      
      // 부품 증가
      product.bom.forEach(item => {
        const childProduct = products.find(p => p.id === item.childProductId);
        if (childProduct) {
          updateProduct(item.childProductId, {
            currentStock: childProduct.currentStock + (item.quantity * quantity)
          });
        }
      });
      
      // 거래 기록
      addTransaction({
        type: 'adjustment',
        productId,
        productName: product.productName,
        quantity: -quantity,
        previousStock: product.currentStock,
        newStock: product.currentStock - quantity,
        date: new Date(),
        reason: '세트 해체',
        memo: `${quantity}개 세트 해체`,
        createdBy: '관리자'
      });
    }
  };

  // 불일치 처리 함수
  const resolveDiscrepancy = (productId: string, explanation: string) => {
    const discrepancy = pendingDiscrepancies.find(d => d.productId === productId);
    if (discrepancy) {
      // 조정 거래 생성
      addTransaction({
        type: 'adjustment',
        productId,
        productName: products.find(p => p.id === productId)?.productName || '',
        quantity: discrepancy.difference,
        previousStock: discrepancy.systemStock,
        newStock: discrepancy.excelStock,
        date: new Date(),
        reason: '엑셀 업로드 불일치',
        memo: explanation,
        createdBy: '관리자'
      });
      
      // 불일치 제거
      setPendingDiscrepancies(pendingDiscrepancies.filter(d => d.productId !== productId));
    }
  };

  const value = {
    products,
    addProduct,
    updateProduct,
    getProduct,
    transactions,
    addTransaction,
    rollbackTransaction,
    excelUploads,
    uploadExcel,
    rollbackExcelUpload,
    getAdjustmentAnalysis,
    assembleSet,
    disassembleSet,
    pendingDiscrepancies,
    resolveDiscrepancy
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};