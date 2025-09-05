import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Plus, Search, FileSpreadsheet, Barcode,
  Calendar, Save, FileText, ArrowLeft, Check, Clock,
  Package, AlertCircle, Trash2, Edit, X
} from 'lucide-react';
import {
  Button,
  PageHeader,
  TextField,
  SelectField,
  TextareaField,
  SearchBar,
  DataTable,
  Alert,
  CheckboxField
} from '../components';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

// 발주서 상태 타입
type PurchaseOrderStatus = 'draft' | 'pending' | 'partial' | 'completed' | 'cancelled';

// 발주서 타입
interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: Date;
  expectedDate?: Date;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  memo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// 발주 상품 타입
interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  manufacturer?: string;
  leadTime?: number;
  moq?: number;
  expectedDate?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  amount: number;
  receivedQuantity: number;
}

// 발주서 목록 화면
function PurchaseOrderList({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { transactions } = useData();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // 더미 데이터 (실제로는 Context나 API에서 가져옴)
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  
  // 샘플 데이터 추가 (개발용)
  useEffect(() => {
    // 초기 샘플 데이터
    const sampleOrder: PurchaseOrder = {
      id: '1',
      orderNumber: 'PO-000001',
      supplier: 'NPK',
      orderDate: new Date(2024, 8, 2, 12, 48), // 2024년 9월 2일 (월은 0부터 시작)
      expectedDate: new Date(2024, 8, 5), // 2024년 9월 5일
      status: 'pending',
      items: [
        {
          id: '1',
          productId: '1',
          productName: '비타민C',
          productCode: 'VIT-C-001',
          quantity: 300,
          unitPrice: 28000,
          discount: 0,
          tax: 0,
          amount: 8400000,
          receivedQuantity: 0
        }
      ],
      subtotal: 8400000,
      tax: 0,
      discount: 0,
      total: 8400000,
      memo: 'test',
      createdBy: 'junwoo',
      createdAt: new Date(2024, 8, 2, 12, 48),
      updatedAt: new Date(2024, 8, 2, 12, 48)
    };
    setOrders([sampleOrder]);
  }, []);

  // 상태별 개수 계산
  const statusCounts = {
    all: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    pending: orders.filter(o => o.status === 'pending').length,
    partial: orders.filter(o => o.status === 'partial').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  // 필터링된 발주서 목록
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchValue === '' || 
      order.orderNumber.toLowerCase().includes(searchValue.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchValue.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 상태 레이블 가져오기
  const getStatusLabel = (status: PurchaseOrderStatus) => {
    const labels = {
      draft: '임시 저장',
      pending: '입고 대기',
      partial: '부분 입고',
      completed: '입고 완료',
      cancelled: '취소됨'
    };
    return labels[status];
  };

  // 상태 색상 가져오기
  const getStatusColor = (status: PurchaseOrderStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  // 입고 진행률 계산
  const getReceivingProgress = (order: PurchaseOrder) => {
    if (!order?.items || order.items.length === 0) return '0/0';
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const receivedQuantity = order.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
    return `${receivedQuantity}/${totalQuantity}`;
  };

  const columns = [
    {
      key: 'status',
      header: '상태',
      render: (order: PurchaseOrder) => {
        if (!order) return null;
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        );
      }
    },
    {
      key: 'orderDate',
      header: '발주일',
      render: (order: PurchaseOrder) => {
        const date = order.orderDate instanceof Date ? order.orderDate : new Date(order.orderDate);
        return (
          <div>
            <p className="font-medium">{date.toLocaleDateString('ko-KR')}</p>
            <p className="text-xs text-gray-500">{date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        );
      }
    },
    {
      key: 'orderNumber',
      header: '주문 번호',
      render: (order: PurchaseOrder) => {
        if (!order) return null;
        return (
          <span className="font-mono text-blue-600 hover:underline cursor-pointer">
            {order.orderNumber}
          </span>
        );
      }
    },
    {
      key: 'supplier',
      header: '공급자',
      render: (order: PurchaseOrder) => order?.supplier || '-'
    },
    {
      key: 'itemCount',
      header: '품목 수',
      render: (order: PurchaseOrder) => `${order?.items?.length || 0}개 품목`
    },
    {
      key: 'progress',
      header: '입고 현황',
      render: (order: PurchaseOrder) => {
        if (!order) return null;
        return (
          <div>
            <p className="font-medium">{getReceivingProgress(order)}</p>
            {order.status === 'partial' && (
              <div className="w-20 h-1 bg-gray-200 rounded mt-1">
                <div className="h-1 bg-blue-500 rounded" style={{ width: '30%' }}></div>
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'total',
      header: '총액',
      render: (order: PurchaseOrder) => {
        if (!order?.total) return <span>₩0</span>;
        return (
          <span className="font-medium">₩{order.total.toLocaleString()}</span>
        );
      }
    },
    {
      key: 'memo',
      header: '메모',
      render: (order: PurchaseOrder) => (
        <span className="text-sm text-gray-600">{order?.memo || '-'}</span>
      )
    },
    {
      key: 'createdBy',
      header: '작성자',
      render: (order: PurchaseOrder) => order?.createdBy || '-'
    }
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="발주서 목록"
        icon={ShoppingCart}
        actions={
          <Button
            icon={Plus}
            onClick={() => onNavigate('new')}
          >
            발주서 작성
          </Button>
        }
      />

      {/* 상태 필터 탭 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <div className="flex">
            {[
              { key: 'all', label: '주문 전체' },
              { key: 'draft', label: '임시 저장' },
              { key: 'pending', label: '입고 대기' },
              { key: 'partial', label: '부분 입고' },
              { key: 'completed', label: '입고 완료' }
            ].map(tab => (
              <button
                key={tab.key}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  statusFilter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                  {statusCounts[tab.key as keyof typeof statusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="p-4">
          <div className="flex gap-3">
            <SearchBar
              placeholder="주문 번호, 공급자로 검색"
              value={searchValue}
              onChange={setSearchValue}
              className="flex-1"
            />
            <SelectField
              name="dateFilter"
              label=""
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={[
                { value: 'all', label: '전체 기간' },
                { value: 'today', label: '오늘' },
                { value: 'week', label: '이번 주' },
                { value: 'month', label: '이번 달' },
                { value: 'custom', label: '기간 선택' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* 발주서 목록 테이블 */}
      <div className="bg-white rounded-lg shadow">
        {filteredOrders.length > 0 ? (
          <DataTable
            data={filteredOrders}
            columns={columns}
            onRowClick={(order) => onNavigate(`edit/${order.id}`)}
          />
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p>검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 발주서 작성/수정 화면
function PurchaseOrderForm({ onNavigate, id }: { onNavigate: (page: string) => void; id?: string }) {
  const { products, addTransaction } = useData();
  const { showError, showSuccess, showWarning } = useToast();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    supplier: '',
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    memo: '',
    processImmediately: false,
    // 제품 정보
    productId: '',
    productName: '',
    productCode: '',
    manufacturer: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    tax: 0,
    moq: 0,
    leadTime: 0
  });

  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // 제품 검색 결과 - 검색어가 없으면 전체 목록, 있으면 필터링
  const filteredProducts = searchProduct.trim() === '' 
    ? products 
    : products.filter(p =>
        p.productName.toLowerCase().includes(searchProduct.toLowerCase()) ||
        p.productCode.toLowerCase().includes(searchProduct.toLowerCase())
      );

  // 제품 선택
  const selectProduct = (product: any) => {
    // 발주일기준으로 리드타임 계산하여 예상 입고일 설정
    const leadTime = product.leadTime || 0;
    const orderDate = new Date(formData.orderDate);
    const expectedDate = new Date(orderDate);
    expectedDate.setDate(expectedDate.getDate() + leadTime);
    
    // MOQ를 기본 수량으로 설정 (MOQ가 없으면 1)
    const initialQuantity = product.moq && product.moq > 0 ? product.moq : 1;
    
    setFormData({
      ...formData,
      productId: product.id,
      productName: product.productName,
      productCode: product.productCode,
      manufacturer: product.manufacturer || '',
      quantity: initialQuantity,
      unitPrice: product.purchasePrice || 0,
      moq: product.moq || 0,
      leadTime: leadTime,
      expectedDate: expectedDate.toISOString().split('T')[0]
    });
    
    setSearchProduct('');
    setShowProductSearch(false);
  };

  // 합계 계산
  const calculateTotals = () => {
    const subtotal = formData.quantity * formData.unitPrice;
    const discountAmount = subtotal * (formData.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (formData.tax / 100);
    const total = afterDiscount + taxAmount;
    
    return { subtotal, discount: discountAmount, tax: taxAmount, total };
  };

  const totals = calculateTotals();

  // 저장 처리
  const handleSave = (status: 'draft' | 'pending') => {
    if (!formData.supplier || !formData.productId) {
      showError('공급자와 제품을 선택해주세요.');
      return;
    }

    // MOQ 검증
    if (formData.moq && formData.quantity < formData.moq && status === 'pending') {
      if (!confirm(`주문수량(${formData.quantity})이 MOQ(${formData.moq})보다 적습니다.\n\n그래도 계속하시겠습니까?`)) {
        return;
      }
    }

    // 발주서 저장 로직
    const orderNumber = formData.orderNumber || `PO-${Date.now().toString().slice(-6)}`;
    
    // 즉시 입고 처리
    if (formData.processImmediately && status === 'pending') {
      const product = products.find(p => p.id === formData.productId);
      if (product) {
        addTransaction({
          type: 'inbound',
          productId: formData.productId,
          productName: formData.productName,
          quantity: formData.quantity,
          previousStock: product.currentStock,
          newStock: product.currentStock + formData.quantity,
          date: new Date(),
          reason: `발주 입고 - ${orderNumber}`,
          memo: `공급자: ${formData.supplier}`,
          createdBy: '관리자'
        });
      }
      showSuccess('발주서가 저장되고 입고 처리되었습니다.');
    } else {
      showSuccess(`발주서가 ${status === 'draft' ? '임시 저장' : '저장'}되었습니다.`);
    }
    
    onNavigate('list');
  };

  return (
    <div className="p-8">
      <PageHeader
        title={isEdit ? '발주서 수정' : '발주서 작성'}
        icon={FileText}
      />

      <div className="max-w-4xl mx-auto">
        {/* 발주 정보 - 공급자와 제품 정보 통합 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">발주 정보</h3>
          <p className="text-sm text-gray-600 mb-4">하나의 발주서에는 하나의 제품만 등록할 수 있습니다.</p>
          
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <TextField
              label="공급자 (거래처)"
              name="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="예: NPK, 한국팜 등 거래처명"
              required
            />
            <TextField
              label="주문 번호"
              name="orderNumber"
              value={formData.orderNumber}
              onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
              placeholder="비워두면 자동으로 생성됩니다"
            />
          </div>

          {/* 제품 선택 */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium mb-3">제품 정보</h4>
            
            {/* 제품 검색 */}
            <div className="relative mb-4">
              <TextField
                label="제품 검색"
                name="productSearch"
                placeholder="제품 검색... (클릭하여 전체 목록 보기)"
                value={searchProduct}
                onChange={(e) => {
                  setSearchProduct(e.target.value);
                  setShowProductSearch(true);
                }}
                onFocus={() => setShowProductSearch(true)}
                onBlur={() => {
                  setTimeout(() => setShowProductSearch(false), 200);
                }}
              />
              {showProductSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                  {filteredProducts.length > 0 ? (
                    <>
                      <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs text-gray-600 border-b">
                        {searchProduct ? `${filteredProducts.length}개 제품 검색됨` : `전체 ${filteredProducts.length}개 제품`}
                      </div>
                      {filteredProducts.map(product => (
                        <div
                          key={product.id}
                          className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          onClick={() => selectProduct(product)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{product.productName}</p>
                              <p className="text-sm text-gray-500">{product.productCode}</p>
                              {product.manufacturer && (
                                <p className="text-xs text-gray-400">제조사: {product.manufacturer}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">₩{product.purchasePrice?.toLocaleString() || 0}</p>
                              <p className="text-xs text-gray-500">재고: {product.currentStock}개</p>
                              {product.moq > 0 && (
                                <p className="text-xs text-orange-600">MOQ: {product.moq}개</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <Package size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">검색 결과가 없습니다.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 선택된 제품 정보 */}
            {formData.productId && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-lg">{formData.productName}</p>
                    <p className="text-sm text-gray-500">{formData.productCode}</p>
                    {formData.manufacturer && (
                      <p className="text-sm text-gray-500">제조사: {formData.manufacturer}</p>
                    )}
                  </div>
                  {formData.moq > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                      MOQ: {formData.moq}개
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 수량 및 가격 정보 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <TextField
                  label="수량"
                  name="quantity"
                  type="number"
                  className={formData.moq && formData.quantity < formData.moq ? 'border-red-500 bg-red-50' : ''}
                  value={formData.quantity.toString()}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  min="1"
                  error={formData.moq > 0 && formData.quantity < formData.moq ? `MOQ(${formData.moq}개) 미달` : undefined}
                />
              </div>
              <div>
                <TextField
                  label="단가"
                  name="unitPrice"
                  type="number"
                  value={formData.unitPrice.toString()}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>

            {/* 할인 및 세금 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <TextField
                  label="할인율 (%)"
                  name="discount"
                  type="number"
                  value={formData.discount.toString()}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <TextField
                  label="세금 (%)"
                  name="tax"
                  type="number"
                  value={formData.tax.toString()}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>

            {/* 날짜 정보 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <TextField
                label="발주일"
                name="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={(e) => {
                  const newOrderDate = e.target.value;
                  setFormData({ ...formData, orderDate: newOrderDate });
                  // 리드타임 기반 예상 입고일 재계산
                  if (formData.leadTime) {
                    const orderDate = new Date(newOrderDate);
                    const expectedDate = new Date(orderDate);
                    expectedDate.setDate(expectedDate.getDate() + formData.leadTime);
                    setFormData(prev => ({ 
                      ...prev, 
                      expectedDate: expectedDate.toISOString().split('T')[0]
                    }));
                  }
                }}
                required
              />
              <div>
                <TextField
                  label={`예상 입고일 ${formData.leadTime > 0 ? `(리드타임: ${formData.leadTime}일)` : ''}`}
                  name="expectedDate"
                  type="date"
                  value={formData.expectedDate}
                  onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })}
                  min={formData.orderDate}
                />
              </div>
            </div>

            {/* 합계 정보 */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">소계</span>
                <span className="text-sm">₩{totals.subtotal.toLocaleString()}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">할인</span>
                  <span className="text-sm text-red-600">-₩{totals.discount.toLocaleString()}</span>
                </div>
              )}
              {totals.tax > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">세금</span>
                  <span className="text-sm">₩{totals.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">총액</span>
                <span className="text-lg font-bold text-blue-600">₩{totals.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 메모 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <TextareaField
            label="메모"
            name="memo"
            value={formData.memo}
            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
            placeholder="메모 입력&#10;TIP) #태그 입력 시 목록에서 '태그'로 검색할 수 있습니다."
            rows={4}
          />
        </div>

        {/* 옵션 및 저장 버튼 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <CheckboxField
              label="발주 내역을 저장하고 즉시 입고 처리합니다."
              name="processImmediately"
              checked={formData.processImmediately}
              onChange={(e) => setFormData({ ...formData, processImmediately: e.target.checked })}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onNavigate('list')}
            >
              돌아가기
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
            >
              임시 저장
            </Button>
            <Button
              onClick={() => handleSave('pending')}
              disabled={!formData.supplier || !formData.productId}
              icon={Save}
            >
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 메인 컴포넌트 - 라우팅 처리
function PurchaseOrder({ resetKey }: { resetKey?: number }) {
  const [currentPage, setCurrentPage] = useState<'list' | 'new' | 'edit'>('list');
  const [editId, setEditId] = useState<string | undefined>(undefined);
  
  // resetKey가 변경되면 기본 페이지로 돌아감
  React.useEffect(() => {
    if (resetKey) {
      setCurrentPage('list');
      setEditId(undefined);
    }
  }, [resetKey]);
  
  const handleNavigate = (page: string) => {
    if (page === 'list') {
      setCurrentPage('list');
      setEditId(undefined);
    } else if (page === 'new') {
      setCurrentPage('new');
      setEditId(undefined);
    } else if (page.startsWith('edit/')) {
      setCurrentPage('edit');
      setEditId(page.replace('edit/', ''));
    }
  };
  
  if (currentPage === 'new' || currentPage === 'edit') {
    return <PurchaseOrderForm onNavigate={handleNavigate} id={editId} />;
  }
  
  return <PurchaseOrderList onNavigate={handleNavigate} />;
}

export default PurchaseOrder;