import React, { useState, useEffect } from 'react';
import { Plus, Minus, RefreshCw, Package, Search } from 'lucide-react';
import { productAPI } from '../services/api/product';
import { transactionAPI } from '../services/api/transaction';
import toast, { Toaster } from 'react-hot-toast';

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  current_stock: number;
  location: string;
  unit: string;
  barcode?: string;
}

interface TransactionRequest {
  product_id: string;
  transaction_type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  reason?: string;
  memo?: string;
  location?: string;
  date: string;
}

const IndividualProcess: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // 제품 검색
  useEffect(() => {
    const searchProducts = async () => {
      if (searchTerm.length < 2) {
        setProducts([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await productAPI.getAll();
        const filtered = response.data.filter(
          (product: Product) =>
            product.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.barcode && product.barcode.includes(searchTerm))
        );
        setProducts(filtered.slice(0, 10)); // 최대 10개만 표시
        setShowDropdown(true);
      } catch (error) {
        console.error('제품 검색 실패:', error);
        toast.error('제품 검색에 실패했습니다');
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  // 제품 선택
  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(`${product.product_code} - ${product.product_name}`);
    setShowDropdown(false);
  };

  // 트랜잭션 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error('제품을 선택해주세요');
      return;
    }

    if (quantity <= 0) {
      toast.error('수량은 0보다 커야 합니다');
      return;
    }

    // 출고 시 재고 확인
    if (transactionType === 'OUT' && quantity > selectedProduct.current_stock) {
      toast.error(`재고가 부족합니다 (현재 재고: ${selectedProduct.current_stock})`);
      return;
    }

    setIsLoading(true);
    try {
      const transactionData: TransactionRequest = {
        product_id: selectedProduct.id,
        transaction_type: transactionType,
        quantity: quantity,
        reason: reason || undefined,
        memo: memo || undefined,
        location: selectedProduct.location,
        date: date
      };

      await transactionAPI.create(transactionData);
      
      // 성공 메시지
      const message = transactionType === 'IN' 
        ? `${selectedProduct.product_name} ${quantity}${selectedProduct.unit} 입고 완료`
        : `${selectedProduct.product_name} ${quantity}${selectedProduct.unit} 출고 완료`;
      toast.success(message);

      // 폼 초기화
      setSelectedProduct(null);
      setSearchTerm('');
      setQuantity(1);
      setReason('');
      setMemo('');
      setDate(new Date().toISOString().split('T')[0]);

      // 선택된 제품의 재고 업데이트
      if (selectedProduct) {
        const updatedProduct = await productAPI.getById(selectedProduct.id);
        setSelectedProduct(updatedProduct.data);
      }
    } catch (error) {
      console.error('트랜잭션 처리 실패:', error);
      toast.error('처리 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 폼 리셋
  const handleReset = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity(1);
    setReason('');
    setMemo('');
    setDate(new Date().toISOString().split('T')[0]);
    setTransactionType('IN');
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">개별 처리</h1>
        <p className="mt-2 text-gray-600">개별 제품의 입출고를 처리합니다</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제품 검색 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제품 검색
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="제품코드, 제품명, 바코드로 검색"
                className="w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              
              {isSearching && (
                <RefreshCw className="absolute right-10 top-2.5 h-5 w-5 text-blue-500 animate-spin" />
              )}
            </div>

            {/* 검색 결과 드롭다운 */}
            {showDropdown && products.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => selectProduct(product)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{product.product_code}</p>
                        <p className="text-sm text-gray-600">{product.product_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          재고: {product.current_stock}{product.unit}
                        </p>
                        <p className="text-xs text-gray-500">{product.location}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 선택된 제품 정보 */}
          {selectedProduct && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Package className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{selectedProduct.product_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    제품코드: {selectedProduct.product_code} | 
                    현재 재고: {selectedProduct.current_stock}{selectedProduct.unit} | 
                    위치: {selectedProduct.location}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 처리 유형 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              처리 유형
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTransactionType('IN')}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                  transactionType === 'IN'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Plus className="h-5 w-5 mr-2" />
                입고
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('OUT')}
                className={`flex items-center justify-center px-4 py-3 rounded-lg border-2 transition-colors ${
                  transactionType === 'OUT'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Minus className="h-5 w-5 mr-2" />
                출고
              </button>
            </div>
          </div>

          {/* 수량 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수량
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 날짜 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              처리 날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 사유 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사유 (선택사항)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="입출고 사유를 입력하세요"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 메모 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모 (선택사항)
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="추가 메모를 입력하세요"
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !selectedProduct}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                isLoading || !selectedProduct
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : transactionType === 'IN'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="inline-block h-5 w-5 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                `${transactionType === 'IN' ? '입고' : '출고'} 처리`
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              초기화
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IndividualProcess;