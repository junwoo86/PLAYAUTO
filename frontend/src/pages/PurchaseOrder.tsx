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
  DataTable,
  Alert,
  CheckboxField
} from '../components';
import { useToast } from '../contexts/ToastContext';
import { purchaseOrderAPI, productAPI, transactionAPI } from '../services/api';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';
// import { useAppContext } from '../App';
import { formatPrice, Currency } from '../utils/currency';

// 발주서 상태 타입
type PurchaseOrderStatus = 'draft' | 'pending' | 'partial' | 'completed' | 'cancelled';

// 발주서 타입
interface PurchaseOrder {
  id: string;
  po_number: string;  // API 응답 필드
  supplier: string;
  created_at: string;  // API 응답 필드
  expected_date?: string;  // API 응답 필드
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  total_amount: number;  // API 응답 필드
  notes?: string;  // API 응답 필드
  created_by?: string;  // API 응답 필드
  updated_at: string;  // API 응답 필드
  // 이전 필드들 (호환성 유지)
  orderNumber?: string;
  orderDate?: Date;
  expectedDate?: Date;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  memo?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  currency: Currency;
  amount: number;
  receivedQuantity: number;
}

// 발주서 목록 화면
function PurchaseOrderList({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [searchValue, setSearchValue] = useState('');
  const [searchType, setSearchType] = useState<string>('all'); // 검색 타입 추가
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 발주서 목록 조회 - 항상 전체 데이터를 가져옴
  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const response = await purchaseOrderAPI.getAll({
        // status 파라미터를 제거하여 항상 전체 데이터를 가져옴
      });
      
      // API 응답을 그대로 사용 (이미 필드명이 일치함)
      const ordersList = response.data || response || [];
      const transformedOrders: PurchaseOrder[] = Array.isArray(ordersList) ? ordersList : [];
      
      setOrders(transformedOrders);
    } catch (error) {
      console.error('발주서 목록 조회 실패:', error);
      showError('발주서 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 처리
  const handleSearch = () => {
    // 필터링은 이미 filteredOrders에서 처리되므로 추가 작업 불필요
    console.log('검색 실행:', searchType, searchValue);
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []); // statusFilter 제거 - 프론트엔드에서 필터링

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
    // 상태 필터 먼저 적용
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    if (!matchesStatus) return false;
    
    // 검색 필터
    let matchesSearch = true;
    if (searchValue !== '') {
      const lowerSearchValue = searchValue.toLowerCase();
      
      switch (searchType) {
        case 'orderNumber':
          matchesSearch = order.po_number && order.po_number.toLowerCase().includes(lowerSearchValue);
          break;
        case 'supplier':
          matchesSearch = order.supplier && order.supplier.toLowerCase().includes(lowerSearchValue);
          break;
        case 'product':
          // items가 있는 경우 품목명으로 검색
          matchesSearch = order.items && order.items.some(item => 
            (item.product_name && item.product_name.toLowerCase().includes(lowerSearchValue)) ||
            (item.productName && item.productName.toLowerCase().includes(lowerSearchValue))
          );
          break;
        case 'memo':
          matchesSearch = order.notes && order.notes.toLowerCase().includes(lowerSearchValue);
          break;
        case 'all':
        default:
          matchesSearch = 
            (order.po_number && order.po_number.toLowerCase().includes(lowerSearchValue)) ||
            (order.supplier && order.supplier.toLowerCase().includes(lowerSearchValue)) ||
            (order.notes && order.notes.toLowerCase().includes(lowerSearchValue)) ||
            (order.items && order.items.some(item => 
              (item.product_name && item.product_name.toLowerCase().includes(lowerSearchValue)) ||
              (item.productName && item.productName.toLowerCase().includes(lowerSearchValue))
            ));
          break;
      }
    }
    
    return matchesSearch;
  });

  // 상태 레이블 가져오기
  const getStatusLabel = (status: PurchaseOrderStatus) => {
    const labels = {
      draft: '임시 저장',
      pending: '발주 완료',  // '입고 대기' -> '발주 완료'로 변경
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
    const totalQuantity = order.items.reduce((sum, item) => sum + (item.ordered_quantity || item.quantity || 0), 0);
    const receivedQuantity = order.items.reduce((sum, item) => sum + (item.received_quantity || item.receivedQuantity || 0), 0);
    return `${receivedQuantity}/${totalQuantity}`;
  };

  const columns = [
    {
      key: 'status',
      header: '상태',
      render: (value: any, order: PurchaseOrder) => {
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
      render: (value: any, order: PurchaseOrder) => {
        if (!order?.created_at) return '-';
        const date = new Date(order.created_at);
        const expectedDate = order.expected_date ? new Date(order.expected_date) : null;
        return (
          <div>
            <p className="font-medium">{date.toLocaleDateString('ko-KR')}</p>
            {expectedDate && (
              <p className="text-xs text-gray-500">예상: {expectedDate.toLocaleDateString('ko-KR')}</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'orderNumber',
      header: '주문 번호',
      render: (value: any, order: PurchaseOrder) => {
        if (!order?.po_number) return null;
        return (
          <span className="font-mono text-blue-600 hover:underline cursor-pointer">
            {order.po_number}
          </span>
        );
      }
    },
    {
      key: 'supplier',
      header: '공급자',
      render: (value: any, order: PurchaseOrder) =>  order?.supplier || '-'
    },
    {
      key: 'product_name',
      header: '품목명',
      render: (value: any, order: PurchaseOrder) =>  (order as any)?.product_name || '-'
    },
    {
      key: 'progress',
      header: '입고 현황',
      render: (value: any, order: PurchaseOrder) => {
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
      key: 'memo',
      header: '메모',
      render: (value: any, order: PurchaseOrder) =>  (
        <span className="text-sm text-gray-600">{order?.notes || '-'}</span>
      )
    },
    {
      key: 'createdBy',
      header: '작성자',
      render: (value: any, order: PurchaseOrder) =>  order?.created_by || '-'
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
              { key: 'pending', label: '발주 완료' },  // '입고 대기' -> '발주 완료'로 변경
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
        <div className="p-4 border-t">
          <div className="grid grid-cols-12 gap-3">
            {/* 검색 영역 - 6칸 */}
            <div className="col-span-12 md:col-span-6">
              <div className="flex gap-2">
                <SelectField
                  name="searchType"
                  label=""
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  options={[
                    { value: 'all', label: '전체 검색' },
                    { value: 'orderNumber', label: '주문번호' },
                    { value: 'supplier', label: '공급자' },
                    { value: 'product', label: '품목명' },
                    { value: 'memo', label: '메모' }
                  ]}
                />
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={20} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    placeholder={
                      searchType === 'orderNumber' ? '주문번호 입력' :
                      searchType === 'supplier' ? '공급자명 입력' :
                      searchType === 'product' ? '품목명 입력' :
                      searchType === 'memo' ? '메모 내용 입력' :
                      '검색어 입력'
                    }
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {searchValue && (
                    <button
                      onClick={() => setSearchValue('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <X size={20} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* 상태 필터 - 3칸 */}
            <div className="col-span-6 md:col-span-3">
              <SelectField
                name="statusFilter"
                label=""
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: '전체 상태' },
                  { value: 'draft', label: '임시저장' },
                  { value: 'pending', label: '발주완료' },
                  { value: 'partial', label: '부분입고' },
                  { value: 'completed', label: '입고완료' },
                  { value: 'cancelled', label: '취소' }
                ]}
              />
            </div>
            
            {/* 기간 필터 - 3칸 */}
            <div className="col-span-6 md:col-span-3">
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
function PurchaseOrderForm({ onNavigate, id, initialData }: { onNavigate: (page: string) => void; id?: string; initialData?: any }) {
  const { showError, showSuccess, showWarning } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [existingOrder, setExistingOrder] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEdit = !!id;
  
  // 제품 목록 로드 및 초기 데이터 처리
  useEffect(() => {
    const loadData = async () => {
      try {
        // 제품 목록 로드
        const response = await productAPI.getAll();
        const productList = response.data || [];
        setProducts(productList);
        
        // 수정 모드일 경우 기존 발주서 데이터 로드
        if (isEdit && id) {
          try {
            const orderResponse = await purchaseOrderAPI.getById(id);
            const order = orderResponse;
            setExistingOrder(order);
            
            // 발주서 데이터를 폼에 적용
            if (order && order.items && order.items.length > 0) {
              const firstItem = order.items[0];
              setFormData(prev => ({
                ...prev,
                supplier: order.supplier || '',
                orderNumber: order.po_number || '',
                expectedDate: order.expected_date ? order.expected_date.split('T')[0] : '',
                memo: order.notes || '',
                productId: firstItem.product_code || '',
                productName: firstItem.product_name || '',
                productCode: firstItem.product_code || '',
                quantity: firstItem.ordered_quantity || 1,
                status: order.status || 'draft',
                currency: ((order as any).currency || 'KRW') as Currency
              }));
              setSearchProduct(firstItem.product_name || '');
            }
          } catch (error) {
            console.error('발주서 로드 실패:', error);
            showError('발주서 정보를 불러오는데 실패했습니다');
          }
        }
        
        // initialData가 있고 product_code가 있으면 해당 제품 자동 선택
        if (initialData?.product_code && !isEdit) {
          const targetProduct = productList.find(
            p => (p.product_code || p.productCode) === initialData.product_code
          );
          if (targetProduct) {
            // initialData의 권장 수량 정보를 함께 전달
            const enhancedProduct = {
              ...targetProduct,
              suggestedQuantity: initialData.quantity
            };
            selectProduct(enhancedProduct);
          }
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        showError('데이터를 불러오는데 실패했습니다');
      }
    };
    loadData();
  }, [id, isEdit, initialData]);

  const [formData, setFormData] = useState({
    supplier: initialData?.supplier || '',
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: '',
    memo: '',
    processImmediately: false,
    status: 'draft' as PurchaseOrderStatus,
    // 제품 정보
    productId: '',
    productName: initialData?.product_name || '',
    productCode: initialData?.product_code || '',
    manufacturer: '',
    quantity: initialData?.quantity || 1,
    currency: 'KRW' as Currency,
    moq: initialData?.moq || 0,
    leadTime: 0
  });

  const [searchProduct, setSearchProduct] = useState(initialData?.product_name || '');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // 제품 선택 함수를 먼저 정의
  const selectProduct = (product: any) => {
    // 발주일기준으로 리드타임 계산하여 예상 입고일 설정
    const leadTime = product.lead_time_days || product.leadTime || 0;
    const orderDate = new Date(formData.orderDate);
    const expectedDate = new Date(orderDate);
    expectedDate.setDate(expectedDate.getDate() + leadTime);
    
    // 권장 수량이 있으면 사용, 없으면 MOQ 또는 1
    const moqValue = product.moq || 0;
    const suggestedQty = product.suggestedQuantity;
    const initialQuantity = suggestedQty || (moqValue > 0 ? moqValue : 1);
    
    setFormData({
      ...formData,
      productId: product.id || product.product_code,
      productName: product.product_name || product.productName,
      productCode: product.product_code || product.productCode,
      manufacturer: product.manufacturer || '',
      quantity: initialQuantity,
      currency: (product.currency || 'KRW') as Currency,
      moq: moqValue,
      leadTime: leadTime,
      expectedDate: expectedDate.toISOString().split('T')[0],
      supplier: product.supplier || formData.supplier
    });
    
    setSearchProduct(product.product_name || product.productName);
    setShowProductSearch(false);
  };

  // 제품 검색 결과 - 검색어가 없으면 전체 목록, 있으면 필터링
  const filteredProducts = searchProduct.trim() === '' 
    ? products 
    : products.filter(p =>
        (p.product_name || p.productName || '').toLowerCase().includes(searchProduct.toLowerCase()) ||
        (p.product_code || p.productCode || '').toLowerCase().includes(searchProduct.toLowerCase())
      );


  // 삭제 처리
  const handleDelete = async () => {
    if (!existingOrder) return;
    
    try {
      await purchaseOrderAPI.delete(existingOrder.id);
      showSuccess('발주서가 삭제되었습니다.');
      setShowDeleteConfirm(false);
      onNavigate('list');
    } catch (error) {
      console.error('발주서 삭제 실패:', error);
      showError('발주서 삭제 중 오류가 발생했습니다.');
    }
  };

  // 저장 처리
  const handleSave = async (status: PurchaseOrderStatus) => {
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
    
    try {
      if (existingOrder) {
        // 수정 모드 - PUT 요청
        const updateData = {
          supplier: formData.supplier,
          expected_date: formData.expectedDate || null,
          notes: formData.memo || '',
          status: status || formData.status || 'draft',  // 전달받은 status 사용
          items: existingOrder.items && existingOrder.items.length > 0 ? [{
            item_id: existingOrder.items[0].id,
            product_code: formData.productCode,
            ordered_quantity: formData.quantity,
            unit_price: 0
          }] : []
        };
        
        // 발주서 수정
        await purchaseOrderAPI.update(existingOrder.id, updateData);
      } else {
        // 생성 모드 - POST 요청
        const purchaseOrderData = {
          supplier: formData.supplier,
          expected_date: formData.expectedDate || null,
          notes: formData.memo || '',
          items: [{
            product_code: formData.productCode,  // Use product_code instead of product_id
            ordered_quantity: formData.quantity,
            unit_price: 0
          }]
        };
        
        // 발주서 저장
        await purchaseOrderAPI.create(purchaseOrderData);
      }
      
      // 즉시 입고 처리
      if (formData.processImmediately && status === 'pending') {
        const product = products.find(p => p.id === formData.productId);
        if (product) {
          await transactionAPI.create({
            transaction_type: 'IN',
            product_code: formData.productCode,
            quantity: formData.quantity,
            reason: `발주 입고 - ${orderNumber}`,
            memo: `공급자: ${formData.supplier}`,
            created_by: '관리자'
          });
        }
        showSuccess('발주서가 저장되고 입고 처리되었습니다.');
      } else {
        showSuccess(`발주서가 ${existingOrder ? '수정' : (status === 'draft' ? '임시 저장' : '저장')}되었습니다.`);
      }
      
      onNavigate('list');
    } catch (error) {
      console.error('발주서 저장 실패:', error);
      showError('발주서 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title={isEdit ? '발주서 수정' : '발주서 작성'}
        icon={FileText}
        actions={
          <div className="flex gap-2">
            {isEdit && (
              <Button
                variant="outline"
                icon={Trash2}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:bg-red-50"
              >
                삭제
              </Button>
            )}
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => onNavigate('list')}
            >
              목록으로
            </Button>
          </div>
        }
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
              required
            />
            {isEdit && (
              <SelectField
                label="발주 상태"
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PurchaseOrderStatus })}
                options={[
                  { value: 'draft', label: '임시저장' },
                  { value: 'pending', label: '발주완료' },  // 'ordered' -> 'pending'으로 변경
                  { value: 'partial', label: '부분입고' },
                  { value: 'completed', label: '입고완료' },
                  { value: 'cancelled', label: '취소' }
                ]}
                required
              />
            )}
            {!isEdit && (
              <TextField
                label="발주일"
                name="orderDate"
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                required
              />
            )}
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
                              <p className="font-medium">{product.product_name || product.productName}</p>
                              <p className="text-sm text-gray-500">{product.product_code || product.productCode}</p>
                              {product.manufacturer && (
                                <p className="text-xs text-gray-400">제조사: {product.manufacturer}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatPrice(product.purchase_price || product.purchasePrice || 0, (product.currency || 'KRW') as Currency)}</p>
                              <p className="text-xs text-gray-500">재고: {product.current_stock || product.currentStock || 0}개</p>
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
          {!isEdit && (
            <div className="mb-4">
              <CheckboxField
                label="발주 내역을 저장하고 즉시 입고 처리합니다."
                name="processImmediately"
                checked={formData.processImmediately}
                onChange={(e) => setFormData({ ...formData, processImmediately: e.target.checked })}
              />
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onNavigate('list')}
            >
              돌아가기
            </Button>
            {isEdit ? (
              <Button
                onClick={() => handleSave(formData.status)}
                disabled={!formData.supplier || !formData.productId}
                icon={Save}
              >
                상태 업데이트
              </Button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* 삭제 확인 다이얼로그 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">발주서 삭제</h3>
              <p className="text-gray-600 mb-6">
                이 발주서를 삭제하시겠습니까?<br />
                삭제된 데이터는 복구할 수 없습니다.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2"
                >
                  취소
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  삭제
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 메인 컴포넌트 - 라우팅 처리
function PurchaseOrder({ initialData }: { initialData?: any }) {
  // initialData에 따라 초기 페이지 설정
  const [purchaseOrderData, setPurchaseOrderData] = useState<any>(initialData);
  const [currentPage, setCurrentPage] = useState<'list' | 'new' | string>(initialData ? 'new' : 'list');
  const [editId, setEditId] = useState<string | undefined>(undefined);

  // initialData가 변경되면 purchaseOrderData 업데이트 및 새 발주서 작성 페이지로 이동
  React.useEffect(() => {
    console.log('PurchaseOrder - initialData received:', initialData);
    if (initialData) {
      setPurchaseOrderData(initialData);
      setCurrentPage('new');
      console.log('PurchaseOrder - Switching to new page with data:', initialData);
    } else {
      // initialData가 null이면 목록 페이지로
      setCurrentPage('list');
      setPurchaseOrderData(null);
    }
  }, [initialData]);
  
  const handleNavigate = (page: string) => {
    if (page === 'list') {
      setCurrentPage('list');
      setEditId(undefined);
      setPurchaseOrderData(null);  // 리스트로 돌아갈 때 데이터 초기화
    } else if (page === 'new') {
      setCurrentPage('new');
      setEditId(undefined);
    } else if (page.startsWith('edit/')) {
      setCurrentPage('edit');
      setEditId(page.replace('edit/', ''));
      setPurchaseOrderData(null);  // 편집 시 데이터 초기화
    }
  };
  
  if (currentPage === 'new' || currentPage === 'edit') {
    return <PurchaseOrderForm 
      onNavigate={handleNavigate} 
      id={editId} 
      initialData={purchaseOrderData}  // 데이터 전달
    />;
  }
  
  return <PurchaseOrderList onNavigate={handleNavigate} />;
}

export default PurchaseOrder;