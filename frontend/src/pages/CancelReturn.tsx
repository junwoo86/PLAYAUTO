import React, { useState, useEffect } from 'react';
import { Package, RotateCcw, XCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { showSuccess, showError, showWarning } from '../utils/toast';

interface Product {
  product_code: string;
  product_name: string;
  current_stock: number;
  category: string;
  unit: string;
}

interface ProcessLog {
  id: string;
  product_name: string;
  process_type: string;
  status: string;
  quantity: number;
  reason: string;
  created_at: string;
}

const CancelReturn: React.FC = () => {
  // 상태 관리
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [processType, setProcessType] = useState<'cancel' | 'return-good' | 'return-damaged'>('cancel');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');

  const [recentLogs, setRecentLogs] = useState<ProcessLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 제품 목록 가져오기
  useEffect(() => {
    fetchProducts();
    fetchRecentLogs();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products', {
        params: {
          limit: 500  // 모든 제품을 가져오기 위해 limit 증가
        }
      });
      const data = response.data.items || response.data.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('제품 목록 조회 실패:', error);
      showError('제품 목록을 불러올 수 없습니다');
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const response = await api.get('/transactions', {
        params: {
          limit: 20
        }
      });

      const logs = (response.data.data || [])
        .filter((trans: any) => {
          // 취소/반품 관련 트랜잭션만 필터링
          return trans.memo?.includes('[취소') ||
                 trans.memo?.includes('[반품') ||
                 trans.reason?.includes('cancel') ||
                 trans.reason?.includes('return');
        })
        .slice(0, 10)
        .map((trans: any) => {
          let processType = '기타';
          let status = '처리완료';

          if (trans.memo?.includes('[취소')) {
            processType = '취소';
            status = '재입고';
          } else if (trans.memo?.includes('[반품(양호')) {
            processType = '반품';
            status = '재입고';
          } else if (trans.memo?.includes('[반품(파손')) {
            processType = '반품';
            status = '폐기';
          }

          // memo에서 실제 사유 추출 (prefix 제거)
          let reason = trans.memo || trans.reason || '';
          reason = reason.replace(/^\[.*?\]_/, '');

          return {
            id: trans.id,
            product_name: trans.product_name || trans.product_code,
            process_type: processType,
            status: status,
            quantity: trans.quantity,
            reason: reason,
            created_at: trans.created_at
          };
        });

      setRecentLogs(logs);
    } catch (error) {
      console.error('최근 처리 내역 조회 실패:', error);
    }
  };

  // 제품 검색 필터링
  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 제품 선택 처리
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.product_name);
    setShowDropdown(false);
    setQuantity(1);
  };

  // 처리 실행
  const handleProcess = async () => {
    if (!selectedProduct) {
      showError('제품을 선택해주세요');
      return;
    }

    if (!quantity || quantity <= 0) {
      showError('올바른 수량을 입력해주세요');
      return;
    }

    if (!reason.trim()) {
      showError('처리 사유를 입력해주세요');
      return;
    }

    setIsProcessing(true);

    try {
      // 처리 유형에 따른 prefix 생성
      let processPrefix = '';
      if (processType === 'cancel') {
        processPrefix = '[취소(재입고)]_';
      } else if (processType === 'return-good') {
        processPrefix = '[반품(양호-재입고)]_';
      } else if (processType === 'return-damaged') {
        processPrefix = '[반품(파손-폐기)]_';
      }

      // 처리 유형과 상태에 따른 트랜잭션 데이터 구성
      let transactionData: any = {
        product_code: selectedProduct.product_code,
        quantity: quantity,
        memo: processPrefix + reason
      };

      if (processType === 'cancel') {
        // 취소: 재입고 처리 (IN으로 처리)
        transactionData.transaction_type = 'IN';
        transactionData.reason = 'cancel_return';
      } else if (processType === 'return-good') {
        // 반품(양호): 재입고 처리 (IN으로 처리)
        transactionData.transaction_type = 'IN';
        transactionData.reason = 'return_restock';
      } else if (processType === 'return-damaged') {
        // 반품(파손): 폐기 처리 (DISPOSAL로 처리)
        transactionData.transaction_type = 'DISPOSAL';
        transactionData.quantity = quantity; // 실제 폐기 수량
        transactionData.reason = 'return_damaged';
      }

      console.log('전송할 데이터:', transactionData);
      await api.post('/transactions', transactionData);

      // 성공 메시지
      let actionText = '';
      let toastMessage = '';
      if (processType === 'cancel') {
        actionText = '취소(재입고)';
        toastMessage = `${selectedProduct.product_name} ${quantity}${selectedProduct.unit} 취소 처리가 완료되었습니다. (재고에 반영됨)`;
      } else if (processType === 'return-good') {
        actionText = '반품(양호-재입고)';
        toastMessage = `${selectedProduct.product_name} ${quantity}${selectedProduct.unit} 반품(양호) 처리가 완료되었습니다. (재고에 반영됨)`;
      } else if (processType === 'return-damaged') {
        actionText = '반품(파손-폐기)';
        toastMessage = `${selectedProduct.product_name} ${quantity}${selectedProduct.unit} 반품(파손) 처리가 완료되었습니다. (재고에 영향 없이 폐기 기록됨)`;
      }

      if (processType === 'return-damaged') {
        showWarning(toastMessage);
      } else {
        showSuccess(toastMessage);
      }

      // 폼 초기화
      setSelectedProduct(null);
      setSearchTerm('');
      setQuantity(1);
      setReason('');
      setProcessType('cancel');

      // 목록 새로고침
      await fetchRecentLogs();
      await fetchProducts();

    } catch (error) {
      console.error('처리 실패:', error);
      showError('처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RotateCcw className="h-8 w-8 text-blue-600" />
          취소 및 반품
        </h1>
        <p className="text-gray-600 mt-2">제품 취소 및 반품 처리를 수행합니다</p>
        <p className="text-sm text-gray-500 mt-1">부분 재입고 부분 폐기의 경우, 나누어 각각 처리 바랍니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: 처리 폼 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">처리 정보 입력</h2>

            {/* 제품 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품 선택
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) setSelectedProduct(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="제품명 또는 제품코드로 검색"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />

                {showDropdown && searchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <div
                          key={product.product_code}
                          onClick={() => handleProductSelect(product)}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="font-medium">{product.product_name}</div>
                          <div className="text-sm text-gray-500">
                            {product.product_code} | 재고: {product.current_stock}{product.unit}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500">검색 결과가 없습니다</div>
                    )}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-900">{selectedProduct.product_name}</div>
                  <div className="text-sm text-blue-700">
                    현재 재고: {selectedProduct.current_stock}{selectedProduct.unit}
                  </div>
                </div>
              )}
            </div>

            {/* 처리 유형 선택 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                처리 유형
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* 좌측: 취소 */}
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-medium text-gray-900 mb-2">취소</div>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="cancel"
                      checked={processType === 'cancel'}
                      onChange={(e) => setProcessType(e.target.value as 'cancel' | 'return-good' | 'return-damaged')}
                      className="mr-2"
                    />
                    <span className="text-sm">취소 (재입고)</span>
                  </label>
                </div>

                {/* 우측: 반품 */}
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-medium text-gray-900 mb-2">반품</div>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="return-good"
                        checked={processType === 'return-good'}
                        onChange={(e) => setProcessType(e.target.value as 'cancel' | 'return-good' | 'return-damaged')}
                        className="mr-2"
                      />
                      <span className="text-sm">양호 - 재입고</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="return-damaged"
                        checked={processType === 'return-damaged'}
                        onChange={(e) => setProcessType(e.target.value as 'cancel' | 'return-good' | 'return-damaged')}
                        className="mr-2"
                      />
                      <span className="text-sm">파손 - 폐기</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 수량 입력 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="1"
                max={selectedProduct?.current_stock || 9999}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 처리 사유 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                처리 사유
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="처리 사유를 입력하세요"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 처리 버튼 */}
            <button
              onClick={handleProcess}
              disabled={isProcessing || !selectedProduct || !reason}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isProcessing || !selectedProduct || !reason
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isProcessing ? '처리 중...' : '처리하기'}
            </button>
          </div>
        </div>

        {/* 오른쪽: 최근 처리 내역 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">최근 처리 내역</h2>

            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.product_name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        log.process_type === '취소'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {log.process_type}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      수량: {log.quantity} | 상태: {log.status}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(log.created_at).toLocaleString('ko-KR')}
                    </div>
                    {log.reason && (
                      <div className="text-xs text-gray-600 mt-1 italic">
                        "{log.reason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                최근 처리 내역이 없습니다
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelReturn;