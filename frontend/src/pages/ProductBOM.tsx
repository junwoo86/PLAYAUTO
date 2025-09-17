import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Save,
  X
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../contexts/ToastContext';

interface Product {
  product_code: string;
  product_name: string;
  current_stock: number;
  category: string;
}

interface BOMItem {
  id: string;
  parent_product_code: string;
  parent_product_name: string;
  child_product_code: string;
  child_product_name: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

interface ComponentStock {
  product_code: string;
  product_name: string;
  required_quantity: number;
  current_stock: number;
  possible_sets: number;
}

interface SetProductStock {
  parent_product_code: string;
  possible_sets: number;
  components: ComponentStock[];
}

const ProductBOM: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedSetStock, setSelectedSetStock] = useState<SetProductStock | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // BOM 생성 폼 상태
  const [bomForm, setBomForm] = useState({
    parent_product_code: '',
    components: [{ child_product_code: '', quantity: 1 }]
  });

  useEffect(() => {
    fetchProducts();
    fetchBOMItems();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/products');
      setProducts(response.data.items || []);
    } catch (error) {
      console.error('제품 목록 조회 실패:', error);
      showToast('제품 목록을 불러오는데 실패했습니다', 'error');
    }
  };

  const fetchBOMItems = async (parentCode?: string) => {
    try {
      const params = parentCode ? { parent_product_code: parentCode } : {};
      const response = await axios.get('http://localhost:8000/api/v1/product-bom', { params });
      setBomItems(response.data.items || []);
    } catch (error) {
      console.error('BOM 조회 실패:', error);
      showToast('BOM 정보를 불러오는데 실패했습니다', 'error');
    }
  };

  const handleCreateBOM = async () => {
    try {
      setLoading(true);

      // 각 구성품별로 BOM 생성
      const promises = bomForm.components
        .filter(comp => comp.child_product_code && comp.quantity > 0)
        .map(comp =>
          axios.post('http://localhost:8000/api/v1/product-bom', {
            parent_product_code: bomForm.parent_product_code,
            child_product_code: comp.child_product_code,
            quantity: comp.quantity
          })
        );

      await Promise.all(promises);

      showToast('BOM이 성공적으로 생성되었습니다', 'success');
      setShowCreateModal(false);
      setBomForm({
        parent_product_code: '',
        components: [{ child_product_code: '', quantity: 1 }]
      });
      fetchBOMItems();
    } catch (error: any) {
      console.error('BOM 생성 실패:', error);
      showToast(error.response?.data?.detail || 'BOM 생성에 실패했습니다', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBOM = async (id: string) => {
    if (!confirm('정말 이 BOM 구성을 삭제하시겠습니까?')) return;

    try {
      await axios.delete(`http://localhost:8000/api/v1/product-bom/${id}`);
      showToast('BOM이 삭제되었습니다', 'success');
      fetchBOMItems();
    } catch (error) {
      console.error('BOM 삭제 실패:', error);
      showToast('BOM 삭제에 실패했습니다', 'error');
    }
  };

  const checkSetProductStock = async (productCode: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8000/api/v1/product-bom/set-product-stock/${productCode}`
      );
      setSelectedSetStock(response.data);
      setShowStockModal(true);
    } catch (error: any) {
      console.error('세트 재고 확인 실패:', error);
      if (error.response?.status === 404) {
        showToast('세트 상품 구성이 없습니다', 'warning');
      } else {
        showToast('세트 재고 확인에 실패했습니다', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleProductExpansion = (productCode: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productCode)) {
      newExpanded.delete(productCode);
    } else {
      newExpanded.add(productCode);
      fetchBOMItems(productCode);
    }
    setExpandedProducts(newExpanded);
  };

  const addComponent = () => {
    setBomForm({
      ...bomForm,
      components: [...bomForm.components, { child_product_code: '', quantity: 1 }]
    });
  };

  const removeComponent = (index: number) => {
    setBomForm({
      ...bomForm,
      components: bomForm.components.filter((_, i) => i !== index)
    });
  };

  const updateComponent = (index: number, field: string, value: string | number) => {
    const newComponents = [...bomForm.components];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setBomForm({ ...bomForm, components: newComponents });
  };

  // BOM이 있는 제품만 필터링
  const productsWithBOM = products.filter(product =>
    bomItems.some(bom => bom.parent_product_code === product.product_code)
  );

  // 제품별로 BOM 그룹화
  const bomByProduct = bomItems.reduce((acc, bom) => {
    if (!acc[bom.parent_product_code]) {
      acc[bom.parent_product_code] = [];
    }
    acc[bom.parent_product_code].push(bom);
    return acc;
  }, {} as Record<string, BOMItem[]>);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">제품 BOM 관리</h1>
        <p className="text-gray-600">세트 상품의 구성 요소를 관리합니다</p>
      </div>

      {/* 액션 버튼 */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          BOM 생성
        </button>
      </div>

      {/* BOM 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">BOM 구성 목록</h2>
        </div>

        <div className="divide-y">
          {productsWithBOM.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 BOM이 없습니다</p>
              <p className="text-sm mt-2">새로운 BOM을 생성해주세요</p>
            </div>
          ) : (
            productsWithBOM.map(product => (
              <div key={product.product_code} className="p-4">
                <div
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded"
                  onClick={() => toggleProductExpansion(product.product_code)}
                >
                  <div className="flex items-center gap-3">
                    {expandedProducts.has(product.product_code) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <Package className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">{product.product_name}</div>
                      <div className="text-sm text-gray-500">{product.product_code}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      checkSetProductStock(product.product_code);
                    }}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    재고 확인
                  </button>
                </div>

                {expandedProducts.has(product.product_code) && (
                  <div className="mt-4 ml-8 space-y-2">
                    {bomByProduct[product.product_code]?.map(bom => (
                      <div
                        key={bom.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <div className="font-medium">{bom.child_product_name}</div>
                            <div className="text-gray-500">{bom.child_product_code}</div>
                          </div>
                          <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            수량: {bom.quantity}개
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteBOM(bom.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* BOM 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">새 BOM 생성</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  세트 상품
                </label>
                <select
                  value={bomForm.parent_product_code}
                  onChange={(e) => setBomForm({ ...bomForm, parent_product_code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택하세요</option>
                  {products.map(product => (
                    <option key={product.product_code} value={product.product_code}>
                      {product.product_name} ({product.product_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    구성품
                  </label>
                  <button
                    onClick={addComponent}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + 구성품 추가
                  </button>
                </div>

                <div className="space-y-2">
                  {bomForm.components.map((component, index) => (
                    <div key={index} className="flex gap-2">
                      <select
                        value={component.child_product_code}
                        onChange={(e) => updateComponent(index, 'child_product_code', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">구성품 선택</option>
                        {products
                          .filter(p => p.product_code !== bomForm.parent_product_code)
                          .map(product => (
                            <option key={product.product_code} value={product.product_code}>
                              {product.product_name} ({product.product_code})
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={component.quantity}
                        onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="수량"
                      />
                      {bomForm.components.length > 1 && (
                        <button
                          onClick={() => removeComponent(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleCreateBOM}
                disabled={loading || !bomForm.parent_product_code || bomForm.components.every(c => !c.child_product_code)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 세트 재고 확인 모달 */}
      {showStockModal && selectedSetStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">세트 상품 재고 현황</h3>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700 mb-1">생산 가능한 세트 수량</div>
              <div className="text-2xl font-bold text-blue-900">
                {selectedSetStock.possible_sets}개
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">구성품 재고 현황</h4>
              {selectedSetStock.components.map(component => (
                <div
                  key={component.product_code}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{component.product_name}</div>
                    <div className="text-sm text-gray-500">
                      필요 수량: {component.required_quantity}개
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      현재 재고: {component.current_stock}개
                    </div>
                    <div className="text-sm text-gray-500">
                      생산 가능: {component.possible_sets}세트
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowStockModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductBOM;