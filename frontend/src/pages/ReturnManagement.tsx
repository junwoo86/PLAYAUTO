import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw, Package, AlertTriangle, CheckCircle, 
  XCircle, Archive, Save, Trash2
} from 'lucide-react';
import {
  Button,
  PageHeader,
  SelectField,
  TextField,
  TextareaField,
  SearchBar,
  Alert,
  RadioGroup
} from '../components';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { transactionAPI } from '../services/api';

function ReturnManagement() {
  const { products, addTransaction } = useData();
  const { showError, showSuccess } = useToast();
  const [returnType, setReturnType] = useState<'cancel' | 'return'>('return');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [productStatus, setProductStatus] = useState('');
  const [finalDisposition, setFinalDisposition] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [showProductList, setShowProductList] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 제품 목록 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowProductList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredProducts = products.filter(p => 
    p.productName.toLowerCase().includes(searchValue.toLowerCase()) ||
    p.productCode.toLowerCase().includes(searchValue.toLowerCase())
  );

  // 제품 상태에 따른 자동 처리 제안
  const getSuggestedDisposition = (status: string) => {
    switch(status) {
      case 'good':
        return 'restock';
      case 'damaged':
      case 'defective':
        return 'dispose';
      default:
        return '';
    }
  };

  // 상태 변경 시 자동 제안
  const handleStatusChange = (status: string) => {
    setProductStatus(status);
    setFinalDisposition(getSuggestedDisposition(status));
  };

  const handleSubmit = () => {
    if (!selectedProduct || !quantity || !returnReason) {
      showError('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (returnType === 'return' && (!productStatus || !finalDisposition)) {
      showError('반품 제품의 상태와 처리 방법을 선택해주세요.');
      return;
    }

    setShowConfirmModal(true);
  };

  const processReturn = async () => {
    const qty = parseInt(quantity);
    
    try {
      let transactionData: any = {
        product_code: selectedProduct.productCode,
        quantity: qty,
        created_by: '관리자'
      };

      if (returnType === 'cancel' || finalDisposition === 'restock') {
        // 재입고 처리
        transactionData = {
          ...transactionData,
          transaction_type: 'IN',
          reason: returnType === 'cancel' ? '주문 취소' : '반품 재입고',
          memo: `${returnReason} - ${inspectionNotes}`
        };
      } else if (finalDisposition === 'dispose') {
        // 폐기 처리 (조정으로 기록)
        transactionData = {
          ...transactionData,
          transaction_type: 'ADJUST',
          quantity: selectedProduct.currentStock, // ADJUST는 최종 재고값
          reason: '반품 폐기',
          memo: `${returnReason} - 제품 상태: ${productStatus} - ${inspectionNotes}`
        };
      } else if (finalDisposition === 'hold') {
        // 보류 처리
        transactionData = {
          ...transactionData,
          transaction_type: 'ADJUST',
          quantity: selectedProduct.currentStock, // 재고 변동 없음
          reason: '반품 보류',
          memo: `검토 필요 - ${returnReason} - ${inspectionNotes}`
        };
      }

      // API 호출
      await transactionAPI.create(transactionData);
      
      // DataContext의 addTransaction도 호출 (로컬 상태 업데이트)
      if (returnType === 'cancel' || finalDisposition === 'restock') {
        addTransaction({
          type: 'inbound',
          productId: selectedProduct.id,
          productName: selectedProduct.productName,
          quantity: qty,
          previousStock: selectedProduct.currentStock,
          newStock: selectedProduct.currentStock + qty,
          date: new Date(),
          reason: transactionData.reason,
          memo: transactionData.memo,
          createdBy: '관리자'
        });
      }

      // 초기화
      setSelectedProduct(null);
      setQuantity('');
      setProductStatus('');
      setFinalDisposition('');
      setReturnReason('');
      setInspectionNotes('');
      setSearchValue('');
      setShowProductList(false);
      setShowConfirmModal(false);
      
      showSuccess(`${returnType === 'cancel' ? '취소' : '반품'} 처리가 완료되었습니다.`);
    } catch (error) {
      console.error('Return processing error:', error);
      showError('처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="취소 및 반품"
        icon={RotateCcw}
      />

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          {/* 반품 유형 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              처리 유형
            </label>
            <div className="flex gap-4">
              <button
                className={`flex-1 p-4 border rounded-lg transition-colors ${
                  returnType === 'cancel' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setReturnType('cancel')}
              >
                <XCircle className={`mx-auto mb-2 ${
                  returnType === 'cancel' ? 'text-blue-500' : 'text-gray-400'
                }`} size={24} />
                <p className="font-medium">주문 취소</p>
                <p className="text-sm text-gray-500">배송 전 취소</p>
              </button>
              <button
                className={`flex-1 p-4 border rounded-lg transition-colors ${
                  returnType === 'return' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={() => setReturnType('return')}
              >
                <RotateCcw className={`mx-auto mb-2 ${
                  returnType === 'return' ? 'text-blue-500' : 'text-gray-400'
                }`} size={24} />
                <p className="font-medium">반품 처리</p>
                <p className="text-sm text-gray-500">배송 후 반품</p>
              </button>
            </div>
          </div>

          {/* 제품 선택 및 반품 수량 */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* 제품 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품 선택
              </label>
              <div className="relative" ref={searchRef}>
                <SearchBar
                  placeholder="제품명 또는 제품코드로 검색"
                  value={searchValue}
                  onChange={setSearchValue}
                  onFocus={() => setShowProductList(true)}
                  className="mb-3"
                />
                
                {showProductList && (
                  <div className="absolute top-full left-0 right-0 z-10 border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <div
                          key={product.id}
                          className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                            selectedProduct?.id === product.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => {
                            setSelectedProduct(product);
                            setSearchValue('');
                            setShowProductList(false);
                          }}
                        >
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-gray-500">{product.productCode}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{product.currentStock}개</p>
                              <p className="text-sm text-gray-500">현재 재고</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        검색 결과가 없습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>

            {selectedProduct && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{selectedProduct.productName}</p>
                    <p className="text-sm text-gray-600">
                      {selectedProduct.productCode} | 현재 재고: {selectedProduct.currentStock}개
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProduct(null)}
                  >
                    <XCircle size={16} />
                  </Button>
                </div>
              </div>
            )}
            </div>

            {/* 수량 입력 */}
            <div>
              <TextField
                label="반품 수량"
                name="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="반품할 수량을 입력하세요"
                min="1"
                required
              />
            </div>
          </div>

          {/* 반품인 경우 제품 상태 평가 및 처리 방법 */}
          {returnType === 'return' && (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* 제품 상태 평가 */}
              <div>
                <RadioGroup
                  label="제품 상태 평가"
                  name="productStatus"
                  value={productStatus}
                  onChange={handleStatusChange}
                  options={[
                    { value: 'good', label: '양호', description: '재판매 가능한 상태' },
                    { value: 'damaged', label: '파손', description: '물리적 손상이 있는 상태' },
                    { value: 'defective', label: '불량', description: '기능상 문제가 있는 상태' }
                  ]}
                  required
                />
              </div>

              {/* 처리 방법 */}
              <div>
                <RadioGroup
                  label="처리 방법"
                  name="finalDisposition"
                  value={finalDisposition}
                  onChange={setFinalDisposition}
                  options={[
                    { value: 'restock', label: '재입고', description: '판매 가능 재고로 추가' },
                    { value: 'dispose', label: '폐기', description: '재고에서 완전 제거' },
                    { value: 'hold', label: '보류', description: '추가 검토 필요' }
                  ]}
                  required
                />
                {/* 권장 표시를 위한 추가 정보 */}
                {productStatus && getSuggestedDisposition(productStatus) && (
                  <div className="mt-2 text-xs text-green-600">
                    권장: {getSuggestedDisposition(productStatus) === 'restock' ? '재입고' :
                          getSuggestedDisposition(productStatus) === 'dispose' ? '폐기' : '보류'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 반품 사유 */}
          <div className="mb-6">
            <SelectField
              label={`${returnType === 'cancel' ? '취소' : '반품'} 사유`}
              name="returnReason"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              options={[
                { value: '', label: '사유 선택' },
                { value: '고객 변심', label: '고객 변심' },
                { value: '제품 하자', label: '제품 하자' },
                { value: '오배송', label: '오배송' },
                { value: '배송 지연', label: '배송 지연' },
                { value: '기타', label: '기타' }
              ]}
              required
            />
          </div>

          {/* 검사 메모 */}
          <div className="mb-6">
            <TextareaField
              label="상세 메모"
              name="inspectionNotes"
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder={returnType === 'return' ? '제품 검사 결과 및 특이사항을 입력하세요' : '취소 관련 상세 내용을 입력하세요'}
              rows={3}
            />
          </div>

          {/* 처리 요약 */}
          {selectedProduct && quantity && (returnType === 'cancel' || (productStatus && finalDisposition)) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">처리 요약</h4>
              <div className="space-y-1 text-sm">
                <p>• 제품: {selectedProduct.productName} ({quantity}개)</p>
                <p>• 처리 유형: {returnType === 'cancel' ? '주문 취소' : '반품'}</p>
                {returnType === 'return' && (
                  <>
                    <p>• 제품 상태: {
                      productStatus === 'good' ? '양호' :
                      productStatus === 'damaged' ? '파손' : '불량'
                    }</p>
                    <p>• 처리 방법: {
                      finalDisposition === 'restock' ? '재입고' :
                      finalDisposition === 'dispose' ? '폐기' : '보류'
                    }</p>
                  </>
                )}
                <p>• 예상 재고: {
                  returnType === 'cancel' || finalDisposition === 'restock' 
                    ? selectedProduct.currentStock + parseInt(quantity || '0')
                    : selectedProduct.currentStock
                }개</p>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedProduct(null);
                setQuantity('');
                setProductStatus('');
                setFinalDisposition('');
                setReturnReason('');
                setInspectionNotes('');
                setSearchValue('');
                setShowProductList(false);
              }}
            >
              초기화
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedProduct || 
                !quantity || 
                !returnReason ||
                (returnType === 'return' && (!productStatus || !finalDisposition))
              }
              icon={Save}
            >
              처리 완료
            </Button>
          </div>
        </div>
      </div>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">처리 확인</h2>
            <p className="text-gray-700 mb-6">
              {selectedProduct?.productName} {quantity}개를 {
                returnType === 'cancel' ? '취소' :
                finalDisposition === 'restock' ? '재입고' :
                finalDisposition === 'dispose' ? '폐기' : '보류'
              } 처리하시겠습니까?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
              >
                취소
              </Button>
              <Button onClick={processReturn}>
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReturnManagement;