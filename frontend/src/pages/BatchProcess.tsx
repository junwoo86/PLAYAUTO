import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSpreadsheet, Upload, Download, AlertTriangle, 
  CheckCircle, XCircle, Save, ArrowRightLeft,
  ClipboardCheck, Package, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { productAPI } from '../services/api/product';
import { transactionAPI } from '../services/api/transaction';
import { batchProcessAPI } from '../services/api/batchProcess';
import toast, { Toaster } from 'react-hot-toast';

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

function BatchProcess() {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchProducts();
  }, []);
  
  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      toast.error('제품 목록을 불러오는데 실패했습니다');
    }
  };
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'transaction' | 'stockcount'>('transaction');
  
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

  // 입출고 템플릿 다운로드
  const downloadTransactionTemplate = () => {
    const headers = ['카테고리', '제품코드', '제품명', '제조사', '입고수량', '출고수량', '날짜(YYYY-MM-DD)', '메모'];
    // 카테고리 → 제품명 순서로 정렬
    const sortedProducts = [...products].sort((a, b) => {
      // 1순위: 카테고리
      const categoryCompare = (a.category || '').localeCompare(b.category || '');
      if (categoryCompare !== 0) return categoryCompare;
      // 2순위: 제품명
      return a.productName.localeCompare(b.productName);
    });
    
    const sampleData = sortedProducts.map(p => [
      p.category || '',
      p.productCode,
      p.productName,
      p.manufacturer || '',
      '0',
      '0',
      new Date().toISOString().split('T')[0],
      ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `입출고_일괄처리_템플릿_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showInfo('템플릿 다운로드가 완료되었습니다. 입고/출고 수량을 입력해주세요.');
  };

  // 재고실사 템플릿 다운로드
  const downloadStockCountTemplate = () => {
    const headers = ['구역ID', '카테고리', '제품코드', '제품명', '제조사', '시스템재고', '실사재고'];
    // 구역ID → 제품명 순서로 정렬
    const sortedProducts = [...products].sort((a, b) => {
      // 1순위: 구역ID
      const zoneCompare = (a.zoneId || '').localeCompare(b.zoneId || '');
      if (zoneCompare !== 0) return zoneCompare;
      // 2순위: 제품명
      return a.productName.localeCompare(b.productName);
    });
    
    const sampleData = sortedProducts.map(p => [
      p.zoneId || '',
      p.category || '',
      p.productCode,
      p.productName,
      p.manufacturer || '',
      p.currentStock.toString(),
      p.currentStock.toString() // 기본값으로 현재 재고 표시
    ]);
    
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `재고실사_템플릿_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showInfo('템플릿 다운로드가 완료되었습니다. 실사재고 수량을 확인 후 수정해주세요.');
  };

  // 입출고 파일 파싱
  const parseTransactionFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const data: TransactionRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: TransactionRow = {
          category: values[0] || '',
          productCode: values[1] || '',
          productName: values[2] || '',
          manufacturer: values[3] || '',
          inbound: parseInt(values[4]) || 0,
          outbound: parseInt(values[5]) || 0,
          date: values[6] || new Date().toISOString().split('T')[0],
          memo: values[7] || '',
          status: 'valid'
        };
        
        // 검증
        const product = products.find(p => p.productCode === row.productCode);
        if (!product) {
          row.status = 'error';
          row.errorMessage = '존재하지 않는 제품코드';
        } else if (row.inbound === 0 && row.outbound === 0) {
          row.status = 'warning';
          row.errorMessage = '입고/출고 수량이 모두 0입니다';
        } else if (row.outbound > product.currentStock) {
          row.status = 'error';
          row.errorMessage = `재고 부족 (현재: ${product.currentStock}개)`;
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
        const values = lines[i].split(',').map(v => v.trim());
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
        const product = products.find(p => p.productCode === row.productCode);
        if (!product) {
          row.status = 'error';
          row.errorMessage = '존재하지 않는 제품코드';
        } else {
          row.systemStock = product.currentStock;
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

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'transaction' | 'stockcount') => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        if (type === 'transaction') {
          parseTransactionFile(file);
        } else {
          parseStockCountFile(file);
        }
      } else {
        showError('CSV 파일만 업로드 가능합니다.');
      }
    }
  };

  // 입출고 일괄 처리 실행
  const processTransactions = () => {
    setIsProcessing(true);
    
    transactionData.forEach(row => {
      if (row.status === 'error') return;
      
      const product = products.find(p => p.productCode === row.productCode);
      if (!product) return;
      
      // 입고 처리
      if (row.inbound > 0) {
        addTransaction({
          type: 'inbound',
          productId: product.id,
          productName: product.productName,
          quantity: row.inbound,
          previousStock: product.currentStock,
          newStock: product.currentStock + row.inbound,
          date: new Date(row.date),
          memo: row.memo || '일괄 입고 처리',
          createdBy: '관리자'
        });
      }
      
      // 출고 처리
      if (row.outbound > 0) {
        addTransaction({
          type: 'outbound',
          productId: product.id,
          productName: product.productName,
          quantity: row.outbound,
          previousStock: product.currentStock,
          newStock: product.currentStock - row.outbound,
          date: new Date(row.date),
          memo: row.memo || '일괄 출고 처리',
          createdBy: '관리자'
        });
      }
    });
    
    setIsProcessing(false);
    setShowTransactionPreview(false);
    setTransactionData([]);
    showSuccess('입출고 일괄 처리가 완료되었습니다.');
  };

  // 재고실사 일괄 처리 실행
  const processStockCount = () => {
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
    
    stockCountData.forEach(row => {
      if (row.status === 'error') return;
      
      const product = products.find(p => p.productCode === row.productCode);
      if (!product) return;
      
      // 불일치 조정 처리
      if (row.discrepancy !== 0) {
        addTransaction({
          type: 'adjustment',
          productId: product.id,
          productName: product.productName,
          quantity: row.discrepancy,
          previousStock: product.currentStock,
          newStock: row.physicalStock,
          date: new Date(),
          reason: '재고실사',
          memo: explanations[row.productCode],
          createdBy: '관리자'
        });
        
        // 불일치 해결 처리
        resolveDiscrepancy(product.id, explanations[row.productCode]);
      }
    });
    
    setIsProcessing(false);
    setShowStockCountPreview(false);
    setStockCountData([]);
    setExplanations({});
    showSuccess('재고실사 처리가 완료되었습니다.');
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