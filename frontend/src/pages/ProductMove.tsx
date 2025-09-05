import React, { useState, useEffect } from 'react';
import { ArrowRight, MapPin, Package, Search, RefreshCw } from 'lucide-react';
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

// 미리 정의된 위치 목록
const PREDEFINED_LOCATIONS = [
  '창고 A-1',
  '창고 A-2',
  '창고 A-3',
  '창고 B-1',
  '창고 B-2',
  '창고 B-3',
  '물류센터 1',
  '물류센터 2',
  '매장',
  '반품센터'
];

const ProductMove: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [moveQuantity, setMoveQuantity] = useState<number>(1);
  const [newLocation, setNewLocation] = useState('');
  const [moveReason, setMoveReason] = useState('');
  const [moveMemo, setMoveMemo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

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
        setProducts(filtered.slice(0, 10));
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
    setMoveQuantity(product.current_stock); // 기본값으로 전체 재고 설정
  };

  // 위치 선택
  const selectLocation = (location: string) => {
    setNewLocation(location);
    setShowLocationDropdown(false);
  };

  // 위치 이동 처리
  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error('제품을 선택해주세요');
      return;
    }

    if (!newLocation.trim()) {
      toast.error('이동할 위치를 입력해주세요');
      return;
    }

    if (newLocation === selectedProduct.location) {
      toast.error('현재 위치와 동일한 위치로는 이동할 수 없습니다');
      return;
    }

    if (moveQuantity <= 0 || moveQuantity > selectedProduct.current_stock) {
      toast.error(`이동 수량은 1 ~ ${selectedProduct.current_stock} 사이여야 합니다`);
      return;
    }

    setIsLoading(true);
    try {
      // 1. transfer 트랜잭션 생성
      await transactionAPI.create({
        product_id: selectedProduct.id,
        transaction_type: 'transfer',
        quantity: moveQuantity,
        reason: moveReason || `${selectedProduct.location} → ${newLocation}`,
        memo: moveMemo || `위치 이동: ${selectedProduct.location} → ${newLocation}`,
        location: newLocation,
        date: new Date().toISOString().split('T')[0]
      });

      // 2. 전체 수량 이동인 경우 제품 위치 업데이트
      if (moveQuantity === selectedProduct.current_stock) {
        await productAPI.update(selectedProduct.id, {
          location: newLocation
        });
      }

      toast.success(
        `${selectedProduct.product_name} ${moveQuantity}${selectedProduct.unit}를 ${newLocation}(으)로 이동했습니다`
      );

      // 폼 초기화
      setSelectedProduct(null);
      setSearchTerm('');
      setMoveQuantity(1);
      setNewLocation('');
      setMoveReason('');
      setMoveMemo('');
    } catch (error) {
      console.error('위치 이동 실패:', error);
      toast.error('위치 이동 처리 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 폼 리셋
  const handleReset = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setMoveQuantity(1);
    setNewLocation('');
    setMoveReason('');
    setMoveMemo('');
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">제품 위치 이동</h1>
        <p className="mt-2 text-gray-600">창고 간 또는 창고 내 제품 위치를 이동합니다</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleMove} className="space-y-6">
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
                        <p className="text-xs text-gray-500">
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {product.location}
                        </p>
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
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">제품코드:</span>
                      <span className="ml-2 font-medium">{selectedProduct.product_code}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">현재 재고:</span>
                      <span className="ml-2 font-medium">
                        {selectedProduct.current_stock}{selectedProduct.unit}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">현재 위치:</span>
                      <span className="ml-2 font-medium text-blue-700">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        {selectedProduct.location}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 위치 이동 정보 */}
          {selectedProduct && (
            <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex items-center justify-center mb-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">현재 위치</p>
                  <p className="font-semibold text-lg text-gray-900">{selectedProduct.location}</p>
                </div>
                <ArrowRight className="h-8 w-8 text-blue-600 mx-8" />
                <div className="text-center">
                  <p className="text-sm text-gray-600">이동할 위치</p>
                  <p className="font-semibold text-lg text-blue-600">
                    {newLocation || '선택하세요'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 이동 수량 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이동 수량
            </label>
            <input
              type="number"
              value={moveQuantity}
              onChange={(e) => setMoveQuantity(parseInt(e.target.value) || 0)}
              min="1"
              max={selectedProduct?.current_stock || 1}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedProduct}
            />
            {selectedProduct && (
              <p className="text-xs text-gray-500 mt-1">
                최대 {selectedProduct.current_stock}{selectedProduct.unit}까지 이동 가능
              </p>
            )}
          </div>

          {/* 이동할 위치 선택 */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이동할 위치
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onFocus={() => setShowLocationDropdown(true)}
                placeholder="위치를 입력하거나 선택하세요"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!selectedProduct}
              />
              <button
                type="button"
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                disabled={!selectedProduct}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:bg-gray-100"
              >
                <MapPin className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* 위치 드롭다운 */}
            {showLocationDropdown && selectedProduct && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                {PREDEFINED_LOCATIONS.filter(loc => loc !== selectedProduct.location).map((location) => (
                  <div
                    key={location}
                    onClick={() => selectLocation(location)}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <MapPin className="inline h-4 w-4 mr-2 text-gray-400" />
                    {location}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 이동 사유 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이동 사유
            </label>
            <input
              type="text"
              value={moveReason}
              onChange={(e) => setMoveReason(e.target.value)}
              placeholder="재고 정리, 공간 확보 등"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모
            </label>
            <textarea
              value={moveMemo}
              onChange={(e) => setMoveMemo(e.target.value)}
              placeholder="추가 메모를 입력하세요"
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !selectedProduct || !newLocation}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                isLoading || !selectedProduct || !newLocation
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="inline-block h-5 w-5 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  <ArrowRight className="inline-block h-5 w-5 mr-2" />
                  위치 이동
                </>
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

export default ProductMove;