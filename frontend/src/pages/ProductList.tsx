import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Package, Plus, FileSpreadsheet, Layers, 
  Wrench, AlertCircle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, BarChart, Barcode,
  RefreshCw, MapPin, Save, X, Trash2, Search,
  Calculator, Info, Clock, Calendar
} from 'lucide-react';
import debounce from 'lodash.debounce';
import { saveAs } from 'file-saver';
import {
  Button,
  CheckboxField,
  DataTable,
  EmptyState,
  PageHeader,
  SearchBar,
  SelectField,
  Alert,
  TextField,
  TextareaField
} from '../components';
import { useData } from '../contexts/DataContext';
import { useAppContext } from '../App';
import { useToast } from '../contexts/ToastContext';
import { productAPI, transactionAPI } from '../services/api';

function ProductList() {
  const { assembleSet, disassembleSet, addTransaction, updateProduct, transactions } = useData();
  const { setActivePage } = useAppContext();
  const { showError, showSuccess, showWarning } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(false);
  const [showOnlyDiscrepancy, setShowOnlyDiscrepancy] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [assembleQuantity, setAssembleQuantity] = useState(1);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    reason: '',
    memo: ''
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [safetyStockInfo, setSafetyStockInfo] = useState<string>('');
  
  // BOM 관리를 위한 추가 상태
  const [editingBOM, setEditingBOM] = useState<any[]>([]);
  const [showBOMSearchDropdown, setShowBOMSearchDropdown] = useState(false);
  const [bomSearchValue, setBomSearchValue] = useState('');
  const [selectedBOMProduct, setSelectedBOMProduct] = useState<any>(null);
  const [bomQuantity, setBomQuantity] = useState(1);
  
  // 검색 디바운싱 적용
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchValue(value);
    }, 300),
    []
  );
  
  // 검색값 변경 시 디바운싱 적용
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);
  
  // 제품 추가 폼 상태
  const [newProduct, setNewProduct] = useState({
    productCode: '',
    productName: '',
    barcode: '',
    category: '',
    brand: '',
    manufacturer: '',
    leadTime: 0,
    moq: 0,
    purchasePrice: 0,
    salePrice: 0,
    initialStock: 0,
    location: '기본 위치',
    zoneId: '', // 구역ID 추가
    memo: '',
    supplier: '',
    supplierContact: '',
    supplierEmail: '', // 공급업체 담당자 이메일 추가
    orderEmailTemplate: '', // 발주 메일 템플릿 추가
    safetyStock: 0, // 안전 재고량 (기존 reorderPoint)
    minStock: 10,
    maxStock: 1000,
    isSameAsManufacturer: false // 제조사와 동일 체크박스 상태 추가
  });

  // 제품 목록 조회
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await productAPI.getAll(0, 100);
      setProducts(response.data || []);
    } catch (error) {
      console.error('제품 조회 실패:', error);
      showError('제품 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // 제품별 거래 내역 조회
  const fetchProductTransactions = useCallback(async (productId: string) => {
    try {
      const response = await transactionAPI.getAll({
        product_id: productId,
        limit: 100
      });
      return response.data || [];
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
      showError('거래 내역을 불러오는데 실패했습니다.');
      return [];
    }
  }, [showError]);

  // 컴포넌트 마운트 시 제품 목록 조회
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 필터링된 제품 목록
  // 필터링된 제품 목록 - 메모이제이션 적용
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const searchTerm = debouncedSearchValue.toLowerCase();
      const matchesSearch = !searchTerm || 
                            product.product_name?.toLowerCase().includes(searchTerm) ||
                            product.product_code?.toLowerCase().includes(searchTerm) ||
                            product.barcode?.toLowerCase().includes(searchTerm);
      const matchesStock = !showOnlyWithStock || product.current_stock > 0;
      const matchesDiscrepancy = !showOnlyDiscrepancy || product.discrepancy !== 0;
      return matchesSearch && matchesStock && matchesDiscrepancy;
    });
  }, [products, debouncedSearchValue, showOnlyWithStock, showOnlyDiscrepancy]);

  // 세트 가능 수량 계산
  const calculatePossibleSets = (product: any) => {
    if (!product.bom || product.bom.length === 0) return null;
    
    const possibleQuantities = product.bom.map((item: any) => {
      const childProduct = products.find(p => p.id === item.childProductId);
      if (!childProduct) return 0;
      return Math.floor(childProduct.current_stock / item.quantity);
    });
    
    return Math.min(...possibleQuantities);
  };
  
  // SKU 자동 생성
  const generateSKU = () => {
    const prefix = 'SKU';
    const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}-${randomStr}`;
  };
  
  // 바코드 자동 생성
  const generateBarcode = () => {
    // EAN-13 형식의 예시 바코드 생성
    const barcode = Math.floor(Math.random() * 9000000000000) + 1000000000000;
    return barcode.toString();
  };

  // 안전 재고량 자동 계산 함수
  const calculateSafetyStock = () => {
    if (!isEditMode || !editingProductId) {
      showWarning('수정 모드에서만 자동 계산이 가능합니다.');
      return;
    }

    // 해당 제품의 출고 이력만 필터링
    const outboundTransactions = transactions.filter(
      t => t.productId === editingProductId && (t.type === 'outbound' || t.type === 'dispatch')
    );

    // 1개월 이상의 데이터가 있는지 확인
    if (outboundTransactions.length === 0) {
      setSafetyStockInfo('출고 이력이 없습니다.');
      showWarning('출고 이력이 없어 자동 계산할 수 없습니다.');
      return;
    }

    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    // 1개월 이상의 데이터 확인
    const recentTransactions = outboundTransactions.filter(
      t => new Date(t.date) >= oneMonthAgo
    );

    if (recentTransactions.length === 0) {
      setSafetyStockInfo('최근 1개월 이내 출고 이력이 없습니다.');
      showWarning('최근 1개월 이내 출고 이력이 없어 자동 계산할 수 없습니다.');
      return;
    }

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
    const leadTime = newProduct.leadTime || 7; // 기본 리드타임 7일
    const bufferDays = 7;
    const totalDays = leadTime + bufferDays;

    // 안전 재고량 = 일평균 출고량 × (리드타임 + 버퍼)
    const safetyStock = Math.ceil(avgDailyOutbound * totalDays);

    // UI 업데이트
    setNewProduct({
      ...newProduct, 
      safetyStock,
      isAutoCalculated: true
    });
    setSafetyStockInfo(`자동 계산: 일평균 ${avgDailyOutbound.toFixed(1)}개 × ${totalDays}일 (리드타임 ${leadTime}일 + 버퍼 7일)`);
    showSuccess(`안전 재고량이 ${safetyStock}개로 자동 계산되었습니다.`);
  };
  
  // 제품 클릭 핸들러 (수정 모드 진입)
  const handleProductClick = (product: any) => {
    setIsEditMode(true);
    setEditingProductId(product.id);
    setNewProduct({
      productCode: product.product_code || '',
      productName: product.product_name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      brand: product.brand || '',
      manufacturer: product.manufacturer || '',
      leadTime: product.lead_time_days || 0,
      moq: product.moq || 0,
      purchasePrice: product.purchase_price || product.price || 0,
      salePrice: product.sale_price || product.price || 0,
      initialStock: product.current_stock || 0,
      location: product.location || '기본 위치',
      zoneId: product.zone_id || '',
      memo: product.memo || '',
      supplier: product.supplier || '',
      supplierContact: product.supplier_contact || '',
      supplierEmail: product.supplier_email || '',
      orderEmailTemplate: product.order_email_template || '',
      safetyStock: product.safety_stock || 0,
      minStock: product.min_stock || 10,
      maxStock: product.max_stock || 1000,
      isSameAsManufacturer: product.manufacturer === product.supplier
    });
    setShowAddProductModal(true);
  };

  // 제품 추가/수정 처리
  const handleAddProduct = async () => {
    if (!newProduct.productCode || !newProduct.productName) {
      showError('SKU와 제품명은 필수 입력 항목입니다.');
      return;
    }
    
    if (isEditMode && editingProductId) {
      // 제품 수정 API 호출
      try {
        const productData = {
          product_code: newProduct.productCode,
          product_name: newProduct.productName,
          category: newProduct.category || null,
          manufacturer: newProduct.manufacturer || null,
          supplier: newProduct.supplier || null,
          supplier_email: newProduct.supplierEmail || null,
          zone_id: newProduct.zoneId || null,
          unit: '개',
          price: newProduct.salePrice,
          current_stock: newProduct.initialStock,
          safety_stock: newProduct.safetyStock,
          is_auto_calculated: safetyStockInfo ? true : false,
          moq: newProduct.moq,
          lead_time_days: newProduct.leadTime,
          order_email_template: newProduct.orderEmailTemplate || null
        };
        await productAPI.update(editingProductId, productData);
        showSuccess('제품이 수정되었습니다.');
        await fetchProducts(); // 목록 새로고침
      } catch (error) {
        console.error('제품 수정 실패:', error);
        showError('제품 수정에 실패했습니다.');
      }
    } else {
      // 제품 추가 API 호출
      try {
        const productData = {
          product_code: newProduct.productCode,
          product_name: newProduct.productName,
          category: newProduct.category || null,
          manufacturer: newProduct.manufacturer || null,
          supplier: newProduct.supplier || null,
          supplier_email: newProduct.supplierEmail || null,
          zone_id: newProduct.zoneId || null,
          unit: '개',
          price: newProduct.salePrice,
          current_stock: newProduct.initialStock,
          safety_stock: newProduct.safetyStock,
          moq: newProduct.moq,
          lead_time_days: newProduct.leadTime,
          order_email_template: newProduct.orderEmailTemplate || null
        };
        await productAPI.create(productData);
        showSuccess('제품이 추가되었습니다.');
        await fetchProducts(); // 목록 새로고침
      } catch (error) {
        console.error('제품 추가 실패:', error);
        showError('제품 추가에 실패했습니다.');
      }
    }
    
    // 모달 닫기 및 초기화
    setShowAddProductModal(false);
    setIsEditMode(false);
    setEditingProductId(null);
    resetForm();
  };
  
  // 폼 초기화
  const resetForm = () => {
    setNewProduct({
      productCode: '',
      productName: '',
      barcode: '',
      category: '',
      brand: '',
      manufacturer: '',
      leadTime: 0,
      moq: 0,
      purchasePrice: 0,
      salePrice: 0,
      initialStock: 0,
      location: '기본 위치',
      zoneId: '',
      memo: '',
      supplier: '',
      supplierContact: '',
      supplierEmail: '',
      orderEmailTemplate: '',
      safetyStock: 0,
      minStock: 10,
      maxStock: 1000,
      isSameAsManufacturer: false
    });
  };

  // 제품 삭제 처리
  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('정말 이 제품을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      await productAPI.delete(productId);
      showSuccess('제품이 삭제되었습니다.');
      await fetchProducts();
    } catch (error) {
      console.error('제품 삭제 실패:', error);
      showError('제품 삭제에 실패했습니다.');
    }
  };

  const columns = [
    { 
      key: 'product_code', 
      header: '상품코드',
      render: (value: string, row: any) => (
        <div 
          className="flex items-center gap-2 cursor-pointer hover:text-blue-600"
          onClick={() => handleProductClick(row)}
        >
          {row.bom && row.bom.length > 0 && (
            <Layers className="text-blue-500" size={16} title="세트상품" />
          )}
          <span className="font-medium underline">{value}</span>
        </div>
      )
    },
    { 
      key: 'product_name', 
      header: '상품명',
      render: (value: string, row: any) => (
        <span 
          className="cursor-pointer hover:text-blue-600 hover:underline"
          onClick={() => handleProductClick(row)}
        >
          {value}
        </span>
      )
    },
    { key: 'category', header: '카테고리' },
    { 
      key: 'zone_id', 
      header: '구역ID',
      render: (value: string | undefined) => (
        <span className="font-mono text-sm">
          {value || '-'}
        </span>
      )
    },
    { 
      key: 'current_stock', 
      header: '현재 재고', 
      align: 'center' as const,
      render: (value: number, row: any) => {
        // 자동 발주점 체크
        const needsReorder = row.safety_stock && value <= row.safety_stock;
        
        return (
          <div>
            <span className="text-xl font-bold">{value ? value.toLocaleString() : 0}</span>
            {needsReorder && (
              <div className="text-xs text-red-600 font-medium mt-1">
                발주 필요
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'safety_stock',
      header: '안전 재고량',
      align: 'center' as const,
      render: (value: number | undefined, row: any) => {
        const safetyStock = value || 0;
        if (!safetyStock) return '-';
        
        // 현재 재고가 안전 재고량 이하인지 확인
        const isLowStock = row.current_stock <= safetyStock;
        
        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {row.is_auto_calculated && (
                <Calculator className="text-blue-500" size={14} title="자동 계산된 값" />
              )}
              <div className={`font-medium ${isLowStock ? 'text-red-600' : ''}`}>
                {safetyStock.toLocaleString()}
              </div>
            </div>
            {isLowStock && (
              <div className="text-xs text-red-600 font-medium mt-1">
                발주 필요
              </div>
            )}
            {row.moq && (
              <div className="text-xs text-gray-500">MOQ: {row.moq}</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'supplier',
      header: '공급업체',
      render: (value: string | undefined, row: any) => {
        if (!value) return '-';
        return (
          <div>
            <div className="font-medium">{value}</div>
            {row.lead_time_days && (
              <div className="text-xs text-gray-500">리드타임: {row.lead_time_days}일</div>
            )}
          </div>
        );
      }
    },
    {
      key: 'discrepancy',
      header: '불일치',
      align: 'center' as const,
      render: (value: number, row: any) => {
        // 마지막 조정 이후의 불일치만 표시
        if (!row.lastAdjustmentDate) {
          return <div className="flex justify-center">-</div>;
        }
        
        if (value === 0) {
          return (
            <div className="flex justify-center">
              <CheckCircle className="text-green-500" size={20} />
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center">
            <div className={`font-bold ${value > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {value > 0 ? '+' : ''}{value}
            </div>
            <div className="text-xs text-gray-400">
              {row.lastAdjustmentDate && 
                new Date(row.lastAdjustmentDate).toLocaleDateString('ko-KR', { 
                  month: '2-digit', 
                  day: '2-digit' 
                })
              }
            </div>
          </div>
        );
      }
    },
    {
      key: 'bom',
      header: 'BOM',
      align: 'center' as const,
      render: (value: any, row: any) => {
        const hasBOM = value && value.length > 0;
        const possibleSets = hasBOM ? calculatePossibleSets(row) : null;
        
        return (
          <div className="flex flex-col items-center gap-1">
            <Button
              size="sm"
              variant={hasBOM ? "outline" : "ghost"}
              onClick={() => {
                setSelectedProduct(row);
                setEditingBOM(row.bom || []);
                setShowBOMModal(true);
              }}
            >
              {hasBOM ? '구성 관리' : '구성 설정'}
            </Button>
            {possibleSets !== null && (
              <span className="text-xs text-gray-500">
                조립 가능: {possibleSets}세트
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: '작업',
      align: 'center' as const,
      render: (_: any, row: any) => (
        <div className="flex gap-2 justify-center">
          <Button 
            size="sm" 
            variant="ghost" 
            title="재고 조정"
            onClick={() => {
              setSelectedProduct(row);
              setAdjustmentData({ quantity: 0, reason: '', memo: '' });
              setShowAdjustmentModal(true);
            }}
          >
            <Wrench size={16} />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            title="이력 보기"
            onClick={async () => {
              // API에서 해당 제품의 거래 내역 가져오기
              const productHistory = await fetchProductTransactions(row.id);
              setSelectedProduct(row);
              setSelectedProductHistory(productHistory);
              setShowHistoryModal(true);
            }}
          >
            <BarChart size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="제품 목록"
        icon={Package}
        actions={
          <>
            <Button icon={Plus} onClick={() => {
            setIsEditMode(false);
            setEditingProductId(null);
            resetForm();
            setShowAddProductModal(true);
          }}>제품 추가</Button>
            <Button 
              variant="outline" 
              icon={FileSpreadsheet}
              onClick={() => {
                try {
                  // CSV 형식으로 제품 목록 다운로드
                  const headers = ['제품코드', '제품명', '바코드', '카테고리', '현재재고', '최소재고', '최대재고', '가격'];
                  
                  // 데이터에 쉼표가 있을 경우를 대비해 따옴표로 감싸기
                  const escapeCSV = (value: any) => {
                    if (value === null || value === undefined) return '';
                    const str = String(value);
                    // 쉼표, 줄바꿈, 따옴표가 포함된 경우 따옴표로 감싸기
                    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                      return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                  };
                  
                  const rows = products.map(p => [
                    escapeCSV(p.product_code),
                    escapeCSV(p.product_name),
                    escapeCSV(p.barcode),
                    escapeCSV(p.category),
                    escapeCSV(p.current_stock),
                    escapeCSV(p.min_stock),
                    escapeCSV(p.max_stock),
                    escapeCSV(p.price)
                  ]);
                  
                  const csvContent = [
                    headers.map(h => escapeCSV(h)).join(','),
                    ...rows.map(row => row.join(','))
                  ].join('\r\n');
                  
                  // BOM 추가로 Excel에서 한글 깨짐 방지
                  const BOM = '\ufeff';
                  const csvWithBOM = BOM + csvContent;
                  
                  const today = new Date();
                  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const fileName = `제품목록_${dateStr}.csv`;
                  
                  // Data URL 방식으로 시도
                  const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvWithBOM);
                  const link = document.createElement('a');
                  link.href = dataUrl;
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  showSuccess('제품 목록이 다운로드되었습니다.');
                } catch (error) {
                  console.error('Export error:', error);
                  showError('다운로드 중 오류가 발생했습니다.');
                }
              }}
            >
              엑셀 내보내기
            </Button>
          </>
        }
        showHelp
      />

      {/* 재고 불일치 알림 */}
      {products.some(p => p.discrepancy !== 0) && (
        <Alert
          type="warning"
          message={`${products.filter(p => p.discrepancy !== 0).length}개 제품에서 재고 불일치가 발견되었습니다.`}
          action={{
            label: showOnlyDiscrepancy ? '전체 보기' : '불일치 제품만 보기',
            onClick: () => setShowOnlyDiscrepancy(!showOnlyDiscrepancy)
          }}
          className="mb-4"
        />
      )}
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex gap-4">
              <div className="flex-1">
                <SelectField
                  label=""
                  name="location"
                  options={[
                    { value: 'all', label: '모든 위치' },
                    { value: 'main', label: '본사 창고' },
                    { value: 'sub1', label: '지점 창고' }
                  ]}
                  value="all"
                  onChange={() => {}}
                />
              </div>
              <div className="flex-1">
                <TextField
                  label=""
                  name="search"
                  placeholder="상품코드, 이름, 바코드 검색"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  icon={Search}
                />
              </div>
            </div>
            <div className="w-28 flex items-center justify-center">
              <CheckboxField
                label="재고 보유"
                name="withStock"
                checked={showOnlyWithStock}
                onChange={(e) => setShowOnlyWithStock(e.target.checked)}
                className="whitespace-nowrap"
              />
            </div>
          </div>
        </div>
        
        {filteredProducts.length > 0 ? (
          <DataTable
            columns={columns}
            data={filteredProducts}
          />
        ) : (
          <EmptyState
            icon={Package}
            title="제품이 없습니다"
            description="검색 조건을 변경하거나 새 제품을 추가해보세요"
            action={{
              label: '제품 추가',
              onClick: () => {},
              icon: Plus
            }}
          />
        )}
      </div>

      {/* BOM 관리 모달 */}
      {showBOMModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              BOM 구성 관리 - {selectedProduct.productName}
            </h2>
            
            {/* 현재 재고 상태 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">세트 재고</p>
                  <p className="text-2xl font-bold">{selectedProduct.currentStock}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">조립 가능</p>
                  <p className="text-2xl font-bold text-green-600">
                    {calculatePossibleSets(selectedProduct) || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">예상 재고</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedProduct.currentStock + (calculatePossibleSets(selectedProduct) || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* BOM 구성 편집 영역 */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">구성 부품 설정</h3>
                <span className="text-sm text-gray-500">
                  {editingBOM.length > 0 ? `${editingBOM.length}개 부품` : '부품을 추가하세요'}
                </span>
              </div>

              {/* 부품 추가 영역 */}
              <div className="border rounded-lg p-4 mb-4 bg-blue-50">
                <h4 className="font-medium mb-3">부품 추가</h4>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="제품명 또는 코드로 검색..."
                      value={bomSearchValue}
                      onChange={(e) => {
                        setBomSearchValue(e.target.value);
                        setShowBOMSearchDropdown(true);
                      }}
                      onFocus={() => setShowBOMSearchDropdown(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {/* 제품 검색 드롭다운 */}
                    {showBOMSearchDropdown && bomSearchValue && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {products
                          .filter(p => 
                            p.id !== selectedProduct.id && // 자기 자신 제외
                            !editingBOM.some(b => b.childProductId === p.id) && // 이미 추가된 부품 제외
                            (p.productName.toLowerCase().includes(bomSearchValue.toLowerCase()) ||
                             p.productCode.toLowerCase().includes(bomSearchValue.toLowerCase()))
                          )
                          .slice(0, 10)
                          .map(product => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setSelectedBOMProduct(product);
                                setBomSearchValue(product.productName);
                                setShowBOMSearchDropdown(false);
                              }}
                            >
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium">{product.productName}</p>
                                  <p className="text-sm text-gray-500">{product.productCode}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold">{product.currentStock}개</p>
                                  <p className="text-xs text-gray-500">재고</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        {products.filter(p => 
                          p.id !== selectedProduct.id &&
                          !editingBOM.some(b => b.childProductId === p.id) &&
                          (p.productName.toLowerCase().includes(bomSearchValue.toLowerCase()) ||
                           p.productCode.toLowerCase().includes(bomSearchValue.toLowerCase()))
                        ).length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            검색 결과가 없습니다
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="w-32">
                    <input
                      type="number"
                      min="1"
                      value={bomQuantity}
                      onChange={(e) => setBomQuantity(Number(e.target.value))}
                      placeholder="수량"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  <Button
                    onClick={() => {
                      if (selectedBOMProduct && bomQuantity > 0) {
                        setEditingBOM([...editingBOM, {
                          childProductId: selectedBOMProduct.id,
                          childProductName: selectedBOMProduct.productName,
                          quantity: bomQuantity
                        }]);
                        setBomSearchValue('');
                        setSelectedBOMProduct(null);
                        setBomQuantity(1);
                      }
                    }}
                    disabled={!selectedBOMProduct || bomQuantity <= 0}
                    icon={Plus}
                  >
                    추가
                  </Button>
                </div>
              </div>

              {/* 현재 구성 부품 목록 */}
              <div className="space-y-2">
                {editingBOM.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Package size={48} className="mx-auto mb-2" />
                    <p>구성 부품이 없습니다</p>
                    <p className="text-sm">위에서 부품을 추가하세요</p>
                  </div>
                ) : (
                  editingBOM.map((item: any, index: number) => {
                    const childProduct = products.find(p => p.id === item.childProductId);
                    return (
                      <div key={item.childProductId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.childProductName}</p>
                          <p className="text-sm text-gray-500">
                            재고: {childProduct?.currentStock || 0}개
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">필요 수량:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newBOM = [...editingBOM];
                              newBOM[index].quantity = Number(e.target.value);
                              setEditingBOM(newBOM);
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-600">개</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingBOM(editingBOM.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 조립/해체 작업 (BOM이 있을 때만 표시) */}
            {editingBOM.length > 0 && (
              <div className="border-t pt-4 mb-6">
                <h3 className="font-semibold mb-3">세트 조립/해체</h3>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      수량
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(calculatePossibleSets({...selectedProduct, bom: editingBOM}) || 0, selectedProduct.currentStock)}
                      value={assembleQuantity}
                      onChange={(e) => setAssembleQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      // 먼저 BOM 저장
                      updateProduct(selectedProduct.id, { bom: editingBOM });
                      // 조립 실행
                      assembleSet(selectedProduct.id, assembleQuantity);
                      showSuccess(`${assembleQuantity}개 세트가 조립되었습니다.`);
                      // 모달 닫기
                      setShowBOMModal(false);
                      setSelectedProduct(null);
                      setEditingBOM([]);
                      setBomSearchValue('');
                      setSelectedBOMProduct(null);
                      setBomQuantity(1);
                    }}
                    disabled={(calculatePossibleSets({...selectedProduct, bom: editingBOM}) || 0) < assembleQuantity}
                    icon={TrendingUp}
                  >
                    세트 조립
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // 먼저 BOM 저장
                      updateProduct(selectedProduct.id, { bom: editingBOM });
                      // 해체 실행
                      disassembleSet(selectedProduct.id, assembleQuantity);
                      showSuccess(`${assembleQuantity}개 세트가 해체되었습니다.`);
                      // 모달 닫기
                      setShowBOMModal(false);
                      setSelectedProduct(null);
                      setEditingBOM([]);
                      setBomSearchValue('');
                      setSelectedBOMProduct(null);
                      setBomQuantity(1);
                    }}
                    disabled={selectedProduct.currentStock < assembleQuantity}
                    icon={TrendingDown}
                  >
                    세트 해체
                  </Button>
                </div>
                
                {/* 예상 결과 */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>조립 시:</strong> 세트 +{assembleQuantity}, 
                    {editingBOM.map((item: any) => 
                      ` ${item.childProductName} -${item.quantity * assembleQuantity}`
                    ).join(',')}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>해체 시:</strong> 세트 -{assembleQuantity}, 
                    {editingBOM.map((item: any) => 
                      ` ${item.childProductName} +${item.quantity * assembleQuantity}`
                    ).join(',')}
                  </p>
                </div>
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="flex justify-between border-t pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingBOM([]);
                  setBomSearchValue('');
                  setSelectedBOMProduct(null);
                  setBomQuantity(1);
                }}
              >
                초기화
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBOMModal(false);
                    setSelectedProduct(null);
                    setEditingBOM([]);
                    setBomSearchValue('');
                    setSelectedBOMProduct(null);
                    setBomQuantity(1);
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={() => {
                    // BOM 저장
                    updateProduct(selectedProduct.id, { bom: editingBOM });
                    showSuccess('BOM 구성이 저장되었습니다.');
                    setShowBOMModal(false);
                    setSelectedProduct(null);
                    setEditingBOM([]);
                    setBomSearchValue('');
                    setSelectedBOMProduct(null);
                    setBomQuantity(1);
                  }}
                  icon={Save}
                >
                  저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 제품 추가 모달 */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{isEditMode ? '제품 수정' : '제품 추가'}</h2>
              <button
                onClick={() => {
                  if (isEditMode && editingProductId) {
                    // 수정 모드에서는 원래 데이터로 복원
                    const originalProduct = products.find(p => p.id === editingProductId);
                    if (originalProduct) {
                      handleProductClick(originalProduct);
                    }
                  } else {
                    resetForm();
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
                title={isEditMode ? "원래 값으로 복원" : "초기화"}
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {/* 제품 정보 섹션 */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">제품 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <TextField
                      label="SKU"
                      name="productCode"
                      value={newProduct.productCode}
                      onChange={(e) => setNewProduct({...newProduct, productCode: e.target.value})}
                      placeholder="제품 코드를 입력하세요"
                      required
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewProduct({...newProduct, productCode: generateSKU()})}
                        >
                          자동 생성
                        </Button>
                      }
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <TextField
                      label="제품명"
                      name="productName"
                      value={newProduct.productName}
                      onChange={(e) => setNewProduct({...newProduct, productName: e.target.value})}
                      placeholder="제품명을 입력하세요"
                      required
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <TextField
                      label="바코드"
                      name="barcode"
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                      placeholder="바코드가 없어도 자동 생성할 수 있습니다"
                      icon={Barcode}
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewProduct({...newProduct, barcode: generateBarcode()})}
                        >
                          자동 생성
                        </Button>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* 제품 속성 섹션 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">제품 속성</h3>
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="카테고리"
                    name="category"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    placeholder="텍스트 입력"
                  />
                  <TextField
                    label="브랜드"
                    name="brand"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                    placeholder="텍스트 입력"
                  />
                  <TextField
                    label="제조사"
                    name="manufacturer"
                    value={newProduct.manufacturer}
                    onChange={(e) => {
                      const manufacturerValue = e.target.value;
                      setNewProduct({
                        ...newProduct, 
                        manufacturer: manufacturerValue,
                        supplier: newProduct.isSameAsManufacturer ? manufacturerValue : newProduct.supplier
                      });
                    }}
                    placeholder="제조사명 입력"
                  />
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        공급업체
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <CheckboxField
                        label="제조사와 동일"
                        name="sameAsManufacturer"
                        checked={newProduct.isSameAsManufacturer}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setNewProduct({
                            ...newProduct,
                            isSameAsManufacturer: isChecked,
                            supplier: isChecked ? newProduct.manufacturer : ''
                          });
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      name="supplier"
                      value={newProduct.isSameAsManufacturer ? newProduct.manufacturer : newProduct.supplier}
                      onChange={(e) => setNewProduct({...newProduct, supplier: e.target.value})}
                      placeholder="공급업체명 입력"
                      disabled={newProduct.isSameAsManufacturer}
                      className={`
                        w-full px-4 py-2 border rounded-lg
                        ${newProduct.isSameAsManufacturer ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                        border-gray-300 focus:ring-blue-500 focus:border-blue-500
                        focus:outline-none focus:ring-2
                      `}
                      required
                    />
                  </div>
                  <TextField
                    label="공급업체 연락처"
                    name="supplierContact"
                    value={newProduct.supplierContact}
                    onChange={(e) => setNewProduct({...newProduct, supplierContact: e.target.value})}
                    placeholder="전화번호 또는 이메일"
                  />
                  <TextField
                    label="MOQ (최소발주수량)"
                    name="moq"
                    type="number"
                    value={newProduct.moq}
                    onChange={(e) => setNewProduct({...newProduct, moq: parseInt(e.target.value) || 0})}
                    placeholder="최소 발주 가능 수량"
                    hint="제조사/공급처의 최소 주문 수량"
                  />
                  <TextField
                    label="리드타임 (일)"
                    name="leadTime"
                    type="number"
                    value={newProduct.leadTime}
                    onChange={(e) => setNewProduct({...newProduct, leadTime: parseInt(e.target.value) || 0})}
                    placeholder="입고까지 소요일수"
                    hint="발주 후 실제 입고까지 걸리는 평균 일수"
                  />
                  <div>
                    <TextField
                      label="안전 재고량"
                      name="safetyStock"
                      type="number"
                      value={newProduct.safetyStock}
                      onChange={(e) => {
                        setNewProduct({
                          ...newProduct, 
                          safetyStock: parseInt(e.target.value) || 0,
                          isAutoCalculated: false // 수동 입력 시 false로 설정
                        });
                        setSafetyStockInfo(''); // 자동 계산 정보 초기화
                      }}
                      placeholder="안전 재고 유지 수량"
                      hint="이 수량 이하로 떨어지면 발주 알림이 발생합니다"
                      action={
                        isEditMode && (
                          <button
                            type="button"
                            onClick={calculateSafetyStock}
                            className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-lg transition-colors ${
                              newProduct.isAutoCalculated 
                                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                            title="출고 이력 기반 자동 계산"
                          >
                            <Calculator size={14} />
                            자동 계산
                          </button>
                        )
                      }
                    />
                  </div>
                  <TextField
                    label="구역ID"
                    name="zoneId"
                    value={newProduct.zoneId}
                    onChange={(e) => setNewProduct({...newProduct, zoneId: e.target.value})}
                    placeholder="예: A-01, B-12"
                    hint="창고 내 보관 구역 식별 코드"
                  />
                  <TextField
                    label="담당자 이메일"
                    name="supplierEmail"
                    type="email"
                    value={newProduct.supplierEmail}
                    onChange={(e) => setNewProduct({...newProduct, supplierEmail: e.target.value})}
                    placeholder="supplier@email.com"
                    hint="공급업체 발주 담당자 이메일"
                  />
                </div>
                
                {/* 자동 계산 근거 표시 */}
                {safetyStockInfo && (
                  <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="text-blue-600 mt-0.5" size={16} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">안전 재고량 계산 근거</p>
                        <p className="text-sm text-blue-700 mt-1">{safetyStockInfo}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          * 최근 3개월간 출고 데이터를 기반으로 일평균 출고량을 계산하고,
                          리드타임과 7일의 버퍼 기간을 고려하여 산출되었습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 발주 메일 템플릿 섹션 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">발주 메일 설정</h3>
                <TextareaField
                  label="발주 메일 템플릿"
                  name="orderEmailTemplate"
                  value={newProduct.orderEmailTemplate}
                  onChange={(e) => setNewProduct({...newProduct, orderEmailTemplate: e.target.value})}
                  placeholder="안녕하세요, {{공급업체명}} 담당자님&#10;&#10;{{제품명}} {{수량}}개 발주 요청드립니다.&#10;&#10;납품 예정일: {{예정일}}&#10;&#10;감사합니다."
                  rows={6}
                  hint="사용 가능한 변수: {{제품명}}, {{제품코드}}, {{수량}}, {{공급업체명}}, {{예정일}}, {{담당자명}}, {{회사명}}"
                />
              </div>

              {/* 가격 정보 섹션 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">가격 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    label="구매가"
                    name="purchasePrice"
                    type="number"
                    value={newProduct.purchasePrice}
                    onChange={(e) => setNewProduct({...newProduct, purchasePrice: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                  <TextField
                    label="판매가"
                    name="salePrice"
                    type="number"
                    value={newProduct.salePrice}
                    onChange={(e) => setNewProduct({...newProduct, salePrice: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* 초기 수량 섹션 */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-700">초기 수량</h3>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={20} className="text-gray-500" />
                      <span className="font-medium">{newProduct.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TextField
                        label=""
                        name="initialStock"
                        type="number"
                        value={newProduct.initialStock}
                        onChange={(e) => setNewProduct({...newProduct, initialStock: parseInt(e.target.value) || 0})}
                        placeholder="0"
                        className="w-32"
                      />
                      <span className="text-gray-600">개</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 메모 섹션 */}
              <div>
                <TextareaField
                  label="메모"
                  name="memo"
                  value={newProduct.memo}
                  onChange={(e) => setNewProduct({...newProduct, memo: e.target.value})}
                  placeholder="제품에 대한 추가 정보를 입력하세요"
                  rows={3}
                />
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddProductModal(false);
                  setIsEditMode(false);
                  setEditingProductId(null);
                  setSafetyStockInfo('');
                  resetForm();
                }}
              >
                취소
              </Button>
              <Button
                icon={Save}
                onClick={handleAddProduct}
                disabled={!newProduct.productCode || !newProduct.productName}
              >
                {isEditMode ? '수정 완료' : '입력 완료'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 재고 조정 모달 */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">재고 조정</h2>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* 제품 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">제품명</p>
                  <p className="font-semibold">{selectedProduct.productName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">제품 코드</p>
                  <p className="font-semibold">{selectedProduct.productCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">현재 재고</p>
                  <p className="font-semibold text-blue-600">{selectedProduct.currentStock}개</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">최소 재고</p>
                  <p className="font-semibold">{selectedProduct.minStock}개</p>
                </div>
              </div>
            </div>

            {/* 조정 입력 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  실제 재고 수량
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({
                    ...adjustmentData,
                    quantity: parseInt(e.target.value) || 0
                  })}
                  placeholder="실사 확인된 실제 재고 수량을 입력하세요"
                  min="0"
                />
                {adjustmentData.quantity > 0 && adjustmentData.quantity !== selectedProduct.currentStock && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className={`text-sm font-medium ${
                      adjustmentData.quantity > selectedProduct.currentStock ? 'text-green-600' : 'text-red-600'
                    }`}>
                      불일치: {adjustmentData.quantity > selectedProduct.currentStock ? '+' : ''}{adjustmentData.quantity - selectedProduct.currentStock}개
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      현재 재고({selectedProduct.currentStock}개) → 실제 재고({adjustmentData.quantity}개)
                    </p>
                  </div>
                )}
              </div>

              <SelectField
                label="조정 사유"
                name="reason"
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({
                  ...adjustmentData,
                  reason: e.target.value
                })}
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
                label="메모"
                name="memo"
                value={adjustmentData.memo}
                onChange={(e) => setAdjustmentData({
                  ...adjustmentData,
                  memo: e.target.value
                })}
                placeholder="추가 설명을 입력하세요"
                rows={3}
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowAdjustmentModal(false)}
              >
                취소
              </Button>
              <Button
                icon={Save}
                onClick={async () => {
                  if (adjustmentData.quantity === 0) {
                    showError('실제 재고 수량을 입력해주세요.');
                    return;
                  }
                  if (adjustmentData.quantity === selectedProduct.currentStock) {
                    showWarning('현재 재고와 동일합니다. 조정이 필요하지 않습니다.');
                    return;
                  }
                  if (!adjustmentData.reason) {
                    showError('조정 사유를 선택해주세요.');
                    return;
                  }

                  // 불일치 수량 계산 (실제 재고 - 현재 재고)
                  const discrepancy = adjustmentData.quantity - selectedProduct.currentStock;

                  // API를 통한 재고 조정
                  const adjustTransaction = {
                    transaction_type: 'ADJUST',
                    product_id: selectedProduct.id,
                    quantity: discrepancy, // 차이값을 기록
                    reason: adjustmentData.reason,
                    memo: adjustmentData.memo || `실사 재고: ${adjustmentData.quantity}개 (불일치: ${discrepancy > 0 ? '+' : ''}${discrepancy}개)`,
                    created_by: '관리자'
                  };
                  
                  try {
                    await transactionAPI.create(adjustTransaction);
                    showSuccess('재고 조정이 완료되었습니다.');
                    await fetchProducts(); // 제품 목록 새로고침
                    setShowAdjustmentModal(false);
                    setAdjustmentData({ quantity: 0, reason: '', memo: '' });
                  } catch (error) {
                    console.error('재고 조정 실패:', error);
                    showError('재고 조정에 실패했습니다.');
                  }
                }}
                disabled={adjustmentData.quantity === 0 || adjustmentData.quantity === selectedProduct.currentStock || !adjustmentData.reason || adjustmentData.memo.length < 10}
              >
                조정 완료
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 제품별 히스토리 모달 */}
      {showHistoryModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold">{selectedProduct.productName} 거래 이력</h2>
                <p className="text-sm text-gray-500">제품코드: {selectedProduct.productCode}</p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedProductHistory([]);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* 이력 테이블 */}
            <div className="flex-1 overflow-auto">
              {selectedProductHistory.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">날짜/시간</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">이전 재고</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">이후 재고</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">사유</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">메모</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">담당자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductHistory.map((history, index) => (
                      <tr key={history.id || index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            {new Date(history.date).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={12} />
                            {new Date(history.date).toLocaleTimeString('ko-KR')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            history.type === 'inbound' ? 'bg-green-100 text-green-800' :
                            history.type === 'outbound' ? 'bg-red-100 text-red-800' :
                            history.type === 'adjustment' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {history.type === 'inbound' ? '입고' :
                             history.type === 'outbound' ? '출고' :
                             history.type === 'adjustment' ? '조정' : '이동'}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-medium ${
                          history.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {history.quantity > 0 ? '+' : ''}{history.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          {history.previousStock?.toLocaleString() || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {history.newStock?.toLocaleString() || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {history.reason || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {history.memo || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {history.createdBy || '관리자'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Clock size={48} className="mx-auto mb-4" />
                  <p className="text-lg">거래 이력이 없습니다</p>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                총 {selectedProductHistory.length}건의 거래 이력
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedProductHistory([]);
                  setSelectedProduct(null);
                }}
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductList;