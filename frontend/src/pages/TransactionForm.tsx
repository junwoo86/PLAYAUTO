import React, { useState, useMemo, useCallback, useEffect } from 'react';
import debounce from 'lodash.debounce';
import { 
  AlertCircle, Calendar, Plus, FileSpreadsheet, ScanBarcode,
  Download, Upload, Settings, ArrowRightLeft, Save, X, AlertTriangle, Search
} from 'lucide-react';
import {
  Button,
  EmptyState,
  PageHeader,
  SelectField,
  TextField,
  TextareaField,
  Alert
} from '../components';
import { productAPI } from '../services/api/product';
import { transactionAPI } from '../services/api/transaction';
import toast, { Toaster } from 'react-hot-toast';

interface TransactionFormProps {
  type: 'receive' | 'dispatch' | 'adjustment' | 'transfer';
}

function TransactionForm({ type }: TransactionFormProps) {
  const [products, setProducts] = useState<any[]>([]);
  
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
  const titles = {
    receive: '입고',
    dispatch: '출고',
    adjustment: '조정',
    transfer: '이동'
  };
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('main');
  const [memo, setMemo] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentDetail, setAdjustmentDetail] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [productList, setProductList] = useState<any[]>([]);
  const [showProductList, setShowProductList] = useState(false);
  
  // 검색 디바운싱 적용
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchValue(value);
    }, 300),
    []
  );
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const icons = {
    receive: Download,
    dispatch: Upload,
    adjustment: Settings,
    transfer: ArrowRightLeft
  };
  const Icon = icons[type];

  // 제품 필터링 - 메모이제이션 적용
  const filteredProducts = useMemo(() => {
    if (!debouncedSearchValue) return products;
    
    const searchLower = debouncedSearchValue.toLowerCase();
    return products.filter(p => 
      p.productName.toLowerCase().includes(searchLower) ||
      p.productCode.toLowerCase().includes(searchLower)
    );
  }, [products, debouncedSearchValue]);

  // 제품 추가 함수 - useCallback으로 최적화
  const addProductToList = useCallback(() => {
    if (!selectedProduct || !quantity) {
      showError('제품과 수량을 입력해주세요.');
      return;
    }

    // 조정의 경우 소명 확인
    if (type === 'adjustment') {
      if (!adjustmentReason || adjustmentDetail.length < 10) {
        setShowReasonModal(true);
        return;
      }
    }

    const newItem = {
      id: Date.now().toString(),
      product: selectedProduct,
      quantity: parseInt(quantity),
      reason: adjustmentReason,
      detail: adjustmentDetail
    };

    setProductList([...productList, newItem]);
    setSelectedProduct(null);
    setQuantity('');
    setSearchValue('');
    setDebouncedSearchValue('');
    setAdjustmentReason('');
    setAdjustmentDetail('');
  }, [selectedProduct, quantity, type, adjustmentReason, adjustmentDetail, productList]);

  const removeProductFromList = useCallback((id: string) => {
    setProductList(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleSubmit = () => {
    if (productList.length === 0) {
      showError('처리할 제품을 추가해주세요.');
      return;
    }

    productList.forEach(item => {
      const transactionType = type === 'receive' ? 'inbound' : 
                             type === 'dispatch' ? 'outbound' : 
                             'adjustment';

      // 날짜와 현재 시각을 조합
      const transactionDate = new Date(date);
      const now = new Date();
      transactionDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      if (type === 'adjustment') {
        // 조정인 경우 불일치 계산
        const discrepancy = item.quantity - item.product.currentStock;
        addTransaction({
          type: transactionType,
          productId: item.product.id,
          productName: item.product.productName,
          quantity: discrepancy, // 차이값 기록
          previousStock: item.product.currentStock,
          newStock: item.quantity, // 실제 재고량
          date: transactionDate,
          reason: item.reason,
          memo: item.detail || memo || `실사: ${item.quantity}개 (불일치: ${discrepancy > 0 ? '+' : ''}${discrepancy}개)`,
          createdBy: '관리자'
        });
      } else {
        addTransaction({
          type: transactionType,
          productId: item.product.id,
          productName: item.product.productName,
          quantity: type === 'dispatch' ? -item.quantity : item.quantity,
          previousStock: item.product.currentStock,
          newStock: type === 'dispatch' ? 
            item.product.currentStock - item.quantity : 
            item.product.currentStock + item.quantity,
          date: transactionDate,
          reason: item.reason,
          memo: item.detail || memo,
          createdBy: '관리자'
        });
      }
    });

    // 초기화
    setProductList([]);
    setMemo('');
    showSuccess(`${titles[type]} 처리가 완료되었습니다.`);
  };

  return (
    <div className="p-8">
      <PageHeader
        title={titles[type]}
        icon={Icon}
        actions={
          <button 
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={() => {
              setProductList([]);
              setSelectedProduct(null);
              setQuantity('');
              setMemo('');
              setSearchValue('');
            }}
          >
            초기화
          </button>
        }
      />
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="위치"
              name="location"
              required
              options={[
                { value: 'main', label: '본사 창고' },
                { value: 'sub1', label: '지점 창고' }
              ]}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <TextField
              label="날짜"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              icon={Calendar}
            />
          </div>
          
          {/* 제품 추가 섹션 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-4">제품 추가</h3>
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="제품명 또는 제품코드로 검색 (클릭하여 전체 목록 보기)"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setShowProductList(true)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchValue && (
                  <button
                    onClick={() => {
                      setSearchValue('');
                      setShowProductList(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <X size={20} className="text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              
              {showProductList && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
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

              {selectedProduct && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
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
                        <X size={16} />
                      </Button>
                    </div>
                  </div>

                  {type === 'adjustment' ? (
                    <>
                      <div>
                        <TextField
                          label="실제 재고 수량"
                          name="quantity"
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="실사 확인된 실제 재고를 입력하세요"
                          min="0"
                        />
                        {quantity && parseInt(quantity) !== selectedProduct.currentStock && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p className={`text-sm font-medium ${
                              parseInt(quantity) > selectedProduct.currentStock ? 'text-green-600' : 'text-red-600'
                            }`}>
                              불일치: {parseInt(quantity) > selectedProduct.currentStock ? '+' : ''}{parseInt(quantity) - selectedProduct.currentStock}개
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              현재({selectedProduct.currentStock}개) → 실제({quantity}개)
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <TextField
                      label="수량"
                      name="quantity"
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder={`${titles[type]} 수량을 입력하세요`}
                      min="1"
                    />
                  )}

                  {/* 조정 사유 (조정일 때만) */}
                  {type === 'adjustment' && (
                    <>
                      <SelectField
                        label="조정 사유"
                        name="reason"
                        value={adjustmentReason}
                        onChange={(e) => setAdjustmentReason(e.target.value)}
                        options={[
                          { value: '실사 차이', label: '실사 차이' },
                          { value: '파손/폐기', label: '파손/폐기' },
                          { value: '도난/분실', label: '도난/분실' },
                          { value: '시스템 오류', label: '시스템 오류' },
                          { value: '기타', label: '기타' }
                        ]}
                        placeholder="사유 선택"
                        required
                      />
                      <TextareaField
                        label="상세 설명"
                        name="detail"
                        value={adjustmentDetail}
                        onChange={(e) => setAdjustmentDetail(e.target.value)}
                        placeholder="조정 사유를 상세히 입력하세요 (최소 10자)"
                        rows={2}
                        required
                      />
                      <p className="text-sm text-gray-500">
                        {adjustmentDetail.length}/10자 (최소 10자 필수)
                      </p>
                    </>
                  )}

                  <Button
                    onClick={addProductToList}
                    disabled={
                      !selectedProduct || 
                      !quantity ||
                      (type === 'adjustment' && (!adjustmentReason || adjustmentDetail.length < 10))
                    }
                    icon={Plus}
                  >
                    목록에 추가
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {/* 추가된 제품 목록 */}
          <div>
            <h3 className="font-medium mb-4">처리할 제품 목록</h3>
            {productList.length > 0 ? (
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">제품</th>
                      <th className="text-center p-3">수량</th>
                      {type === 'adjustment' && <th className="text-left p-3">사유</th>}
                      <th className="text-center p-3">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productList.map(item => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <p className="font-medium">{item.product.productName}</p>
                          <p className="text-sm text-gray-500">{item.product.productCode}</p>
                        </td>
                        <td className="text-center p-3">
                          <span className="font-bold">{item.quantity}개</span>
                        </td>
                        {type === 'adjustment' && (
                          <td className="p-3">
                            <p className="text-sm">{item.reason}</p>
                            <p className="text-xs text-gray-500">{item.detail}</p>
                          </td>
                        )}
                        <td className="text-center p-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeProductFromList(item.id)}
                          >
                            <X size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="제품을 추가하세요"
                description="위에서 제품을 검색하고 추가해주세요"
                size="sm"
              />
            )}
          </div>
          
          {/* 메모 */}
          {type !== 'adjustment' && (
            <TextareaField
              label="메모 입력"
              name="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="추가 메모사항을 입력하세요 (선택)"
              rows={3}
            />
          )}
        </div>
        
        {/* 버튼 */}
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={() => setProductList([])}>취소</Button>
          <Button 
            onClick={handleSubmit}
            disabled={productList.length === 0}
            icon={Save}
          >
            {titles[type]} 완료
          </Button>
        </div>
      </div>

      {/* 조정 소명 필수 모달 */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-yellow-500" size={24} />
              <h2 className="text-xl font-bold">조정 소명 필수</h2>
            </div>
            <p className="text-gray-700 mb-6">
              재고 조정을 처리하려면 반드시 조정 사유와 상세 설명(최소 10자)을 입력해야 합니다.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowReasonModal(false)}>확인</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionForm;