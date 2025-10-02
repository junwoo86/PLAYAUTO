import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Package, Plus, FileSpreadsheet, Layers, 
  Wrench, AlertCircle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, BarChart, Barcode,
  RefreshCw, MapPin, Save, X, Trash2, Search,
  Calculator, Info, Clock, Calendar, DollarSign,
  AlertTriangle
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
  TextareaField,
  ConfirmDialog
} from '../components';
import { useData } from '../contexts/DataContext';
import { useAppContext } from '../App';
import { useToast } from '../contexts/ToastContext';
import { productAPI, transactionAPI, productBOMAPI } from '../services/api';
import { formatPrice, parsePrice, validatePriceInput, CURRENCY_OPTIONS, Currency } from '../utils/currency';
import { warehouseService, Warehouse } from '../services/api/warehouses';

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
  const [showOnlySetProducts, setShowOnlySetProducts] = useState(false); // 세트 상품 필터 추가
  const [showDeletedProducts, setShowDeletedProducts] = useState(false); // 삭제 상품 필터 추가
  const [showLowStock, setShowLowStock] = useState(false); // 재고 부족 필터 추가
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // 카테고리 필터 추가
  const [sortField, setSortField] = useState<string>(''); // 정렬 필드
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // 정렬 방향

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // 제품 코드 중복 검사를 위한 상태
  const [duplicateCheckStatus, setDuplicateCheckStatus] = useState<{
    isChecking: boolean;
    isDuplicate: boolean;
    message: string;
    lastCheckedCode: string;
  }>({
    isChecking: false,
    isDuplicate: false,
    message: '',
    lastCheckedCode: ''
  });
  
  // BOM 관리를 위한 추가 상태
  const [editingBOM, setEditingBOM] = useState<any[]>([]);
  const [showBOMSearchDropdown, setShowBOMSearchDropdown] = useState(false);
  const [bomSearchValue, setBomSearchValue] = useState('');
  const [selectedBOMProduct, setSelectedBOMProduct] = useState<any>(null);
  const [bomQuantity, setBomQuantity] = useState(1);
  const [initialMaxStock, setInitialMaxStock] = useState<number>(0); // 예상 재고 최대량 초기값 저장

  // ConfirmDialog 상태
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger' as 'danger' | 'info' | 'warning'
  });

  // 검색 디바운싱 적용
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchValue(value);
    }, 300),
    []
  );
  
  // 제품 코드 중복 검사 디바운싱
  const debouncedDuplicateCheck = useCallback(
    debounce(async (productCode: string, currentCode?: string) => {
      if (!productCode || productCode.length < 2) {
        setDuplicateCheckStatus({
          isChecking: false,
          isDuplicate: false,
          message: '',
          lastCheckedCode: productCode
        });
        return;
      }

      try {
        setDuplicateCheckStatus(prev => ({ ...prev, isChecking: true }));
        const result = await productAPI.checkDuplicate(productCode, currentCode);
        
        setDuplicateCheckStatus({
          isChecking: false,
          isDuplicate: result.isDuplicate,
          message: result.message,
          lastCheckedCode: productCode
        });
      } catch (error) {
        console.error('중복 검사 실패:', error);
        setDuplicateCheckStatus({
          isChecking: false,
          isDuplicate: false,
          message: '중복 검사 중 오류가 발생했습니다',
          lastCheckedCode: productCode
        });
      }
    }, 500),
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
    manufacturer: '',
    leadTime: 0,
    moq: 0,
    purchaseCurrency: 'KRW' as Currency, // 구매 통화 단위
    saleCurrency: 'KRW' as Currency, // 판매 통화 단위
    purchasePrice: 0,
    salePrice: 0,
    initialStock: 0,
    location: '기본 위치',
    zoneId: '', // 구역ID 추가
    memo: '',
    supplier: '',
    supplierEmail: '', // 공급업체 연락처
    contactEmail: '', // 담당자 이메일
    orderEmailTemplate: '', // 발주 메일 템플릿 추가
    safetyStock: 0, // 안전 재고량 (기존 reorderPoint)
    minStock: 10,
    maxStock: 1000,
    isSameAsManufacturer: false, // 제조사와 동일 체크박스 상태 추가
    warehouseId: '' // 창고 ID 추가
  });

  // 고유 카테고리 목록 추출
  const uniqueCategories = useMemo(() => {
    const categories = products
      .map(p => p.category)
      .filter(c => c && c.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return categories;
  }, [products]);

  // 제품 목록 조회
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        skip: 0,
        limit: 100,
        is_active: showDeletedProducts ? false : true  // 삭제 상품 필터에 따라 is_active 설정
      };
      if (selectedWarehouseId) {
        params.warehouse_id = selectedWarehouseId;
      }
      const response = await productAPI.getAll(
        0,
        200,
        undefined,
        undefined,
        params.warehouse_id,
        params.is_active  // is_active 파라미터 추가
      );
      setProducts(response.data || []);
    } catch (error) {
      console.error('제품 조회 실패:', error);
      showError('제품 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [showError, selectedWarehouseId, showDeletedProducts]);

  // 제품별 거래 내역 조회
  const fetchProductTransactions = useCallback(async (productCode: string) => {
    try {
      const response = await transactionAPI.getAll({
        product_code: productCode,
        limit: 100
      });

      // API 응답을 프론트엔드에서 사용하는 필드명으로 매핑
      const mappedData = response.data?.map((transaction: any) => {
        // transaction_type을 프론트엔드 형식으로 변환
        let type = 'movement'; // 기본값
        switch (transaction.transaction_type) {
          case 'IN':
            type = 'inbound';
            break;
          case 'OUT':
            type = 'outbound';
            break;
          case 'ADJUST':
            type = 'adjustment';
            break;
          case 'DISPOSAL':
            type = 'disposal';
            break;
        }

        return {
          id: transaction.id,
          date: transaction.transaction_date,
          type: type,
          quantity: transaction.quantity,
          previousStock: transaction.previous_stock,
          newStock: transaction.new_stock,
          reason: transaction.reason,
          memo: transaction.memo,
          createdBy: transaction.created_by || '관리자'
        };
      }) || [];

      return mappedData;
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
      showError('거래 내역을 불러오는데 실패했습니다.');
      return [];
    }
  }, [showError]);

  // 컴포넌트 마운트 시 제품 목록 조회
  // 창고 목록 조회
  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await warehouseService.getWarehouses({ is_active: true });
      setWarehouses(response.items);
    } catch (error) {
      console.error('창고 목록 조회 실패:', error);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

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
      const matchesWarehouse = !selectedWarehouseId || product.warehouse_id === selectedWarehouseId;
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesSetProduct = !showOnlySetProducts || (product.bom && product.bom.length > 0);
      const matchesLowStock = !showLowStock || (product.current_stock <= product.safety_stock);

      // 디버깅용 로그
      if (showOnlySetProducts) {
        console.log(`Filtering ${product.product_name}: BOM=`, product.bom, 'matchesSetProduct=', matchesSetProduct);
      }

      return matchesSearch && matchesStock && matchesDiscrepancy && matchesWarehouse && matchesCategory && matchesSetProduct && matchesLowStock;
    });
  }, [products, debouncedSearchValue, showOnlyWithStock, showOnlyDiscrepancy, selectedWarehouseId, selectedCategory, showOnlySetProducts, showLowStock]);

  // 정렬된 제품 목록
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    
    // 카테고리 우선순위 정렬 함수
    const getCategoryPriority = (category: string) => {
      if (category === '영양제') return 1;
      if (category === '검사권') return 2;
      return 3;
    };
    
    sorted.sort((a, b) => {
      // 선택된 필드로 정렬
      if (sortField) {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // null/undefined 처리
        if (aValue === null || aValue === undefined) aValue = '';
        if (bValue === null || bValue === undefined) bValue = '';
        
        // 숫자 필드인 경우
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // 문자열 필드인 경우
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr, 'ko');
        } else {
          return bStr.localeCompare(aStr, 'ko');
        }
      }
      
      // 기본 정렬: 카테고리 우선순위로 정렬
      const categoryPriorityA = getCategoryPriority(a.category);
      const categoryPriorityB = getCategoryPriority(b.category);
      
      if (categoryPriorityA !== categoryPriorityB) {
        return categoryPriorityA - categoryPriorityB;
      }
      
      // 카테고리가 같으면 제품코드 순
      return a.product_code.localeCompare(b.product_code, 'ko');
    });
    
    return sorted;
  }, [filteredProducts, sortField, sortDirection]);

  // 페이징된 제품 목록
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, currentPage, itemsPerPage]);

  // 전체 페이지 수
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  // 필터나 검색어 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchValue, showOnlyWithStock, showOnlyDiscrepancy, showOnlySetProducts, showDeletedProducts, showLowStock, selectedWarehouseId, selectedCategory]);

  // 세트 가능 수량 계산
  const calculatePossibleSets = (product: any) => {
    if (!product.bom || product.bom.length === 0) return null;

    console.log('Calculating possible sets for:', product.product_name);
    console.log('BOM data:', product.bom);

    const possibleQuantities = product.bom.map((item: any) => {
      // BOM 데이터 구조에 따라 child_product_code 또는 childProductCode 사용
      const childCode = item.child_product_code || item.childProductCode;
      const childProduct = products.find(p => p.product_code === childCode);

      console.log(`Looking for child product: ${childCode}`);
      console.log('Found product:', childProduct);

      if (!childProduct) return 0;
      const possibleQty = Math.floor(childProduct.current_stock / item.quantity);
      console.log(`${childCode}: stock=${childProduct.current_stock}, needed=${item.quantity}, possible=${possibleQty}`);
      return possibleQty;
    });

    const result = possibleQuantities.length > 0 ? Math.min(...possibleQuantities) : 0;
    console.log('Final possible sets:', result);
    return result;
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
    setEditingProductId(product.product_code);
    setNewProduct({
      productCode: product.product_code || '',
      productName: product.product_name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      manufacturer: product.manufacturer || '',
      leadTime: product.lead_time_days || 0,
      moq: product.moq || 0,
      purchaseCurrency: product.purchase_currency || 'KRW',
      saleCurrency: product.sale_currency || 'KRW',
      purchasePrice: parseFloat(product.purchase_price) || 0,
      salePrice: parseFloat(product.sale_price) || 0,
      initialStock: product.current_stock || 0,
      location: product.location || '기본 위치',
      zoneId: product.zone_id || '',
      memo: product.memo || '',
      supplier: product.supplier || '',
      supplierEmail: product.supplier_email || '',
      contactEmail: product.contact_email || '',
      orderEmailTemplate: product.order_email_template || '',
      safetyStock: product.safety_stock || 0,
      minStock: product.min_stock || 10,
      maxStock: product.max_stock || 1000,
      isSameAsManufacturer: product.manufacturer === product.supplier,
      warehouseId: product.warehouse_id || '' // 창고 ID 추가
    });
    // 편집 모드에서는 중복 검사 초기화
    setDuplicateCheckStatus({
      isChecking: false,
      isDuplicate: false,
      message: '',
      lastCheckedCode: product.product_code || ''
    });
    setShowAddProductModal(true);
  };

  // 개별 제품 업데이트 함수
  const updateSingleProduct = useCallback(async (productCode: string) => {
    try {
      // 수정된 제품 정보 가져오기
      const updatedProduct = await productAPI.getByCode(productCode);
      
      // 기존 목록에서 해당 제품만 업데이트
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.product_code === productCode ? updatedProduct : product
        )
      );
    } catch (error) {
      console.error('제품 업데이트 실패:', error);
      // 실패 시 전체 새로고침
      await fetchProducts();
    }
  }, [fetchProducts]);

  // 제품 추가/수정 처리
  const handleAddProduct = async () => {
    if (!newProduct.productCode || !newProduct.productName) {
      showError('SKU와 제품명은 필수 입력 항목입니다.');
      return;
    }

    let success = false;

    if (isEditMode && editingProductId) {
      // 제품 수정 API 호출
      try {
        const productData = {
          product_code: newProduct.productCode,
          product_name: newProduct.productName,
          barcode: newProduct.barcode || null,
          category: newProduct.category || null,
          manufacturer: newProduct.manufacturer || null,
          supplier: newProduct.supplier || null,
          supplier_email: newProduct.supplierEmail || null,
          contact_email: newProduct.contactEmail || null,
          zone_id: newProduct.zoneId || null,
          warehouse_id: newProduct.warehouseId || null,
          unit: '개',
          purchase_currency: newProduct.purchaseCurrency,
          sale_currency: newProduct.saleCurrency,
          sale_price: newProduct.salePrice,
          purchase_price: newProduct.purchasePrice,
          current_stock: newProduct.initialStock,
          safety_stock: newProduct.safetyStock,
          is_auto_calculated: safetyStockInfo ? true : false,
          moq: newProduct.moq,
          lead_time_days: newProduct.leadTime,
          order_email_template: newProduct.orderEmailTemplate || null,
          memo: newProduct.memo || null
        };
        // 제품 코드로 업데이트 (기존 product_code 사용)
        const originalProduct = products.find(p => p.product_code === editingProductId);
        await productAPI.update(originalProduct?.product_code || editingProductId, productData);

        // 전체 제품 목록 새로고침으로 변경 (화면 동기화 보장)
        await fetchProducts();

        showSuccess('제품이 수정되었습니다.');
        success = true;
      } catch (error) {
        console.error('제품 수정 실패:', error);
        showError('제품 수정에 실패했습니다.');
        return; // 실패 시 모달 닫지 않음
      }
    } else {
      // 제품 추가 API 호출
      try {
        const productData = {
          product_code: newProduct.productCode,
          product_name: newProduct.productName,
          barcode: newProduct.barcode || null,
          category: newProduct.category || null,
          manufacturer: newProduct.manufacturer || null,
          supplier: newProduct.supplier || null,
          supplier_email: newProduct.supplierEmail || null,
          contact_email: newProduct.contactEmail || null,
          zone_id: newProduct.zoneId || null,
          warehouse_id: newProduct.warehouseId || null,
          unit: '개',
          purchase_currency: newProduct.purchaseCurrency,
          sale_currency: newProduct.saleCurrency,
          sale_price: newProduct.salePrice,
          purchase_price: newProduct.purchasePrice,
          current_stock: newProduct.initialStock,
          safety_stock: newProduct.safetyStock,
          moq: newProduct.moq,
          lead_time_days: newProduct.leadTime,
          order_email_template: newProduct.orderEmailTemplate || null,
          memo: newProduct.memo || null
        };
        await productAPI.create(productData);

        // 새 제품은 전체 목록 새로고침 - 데이터 업데이트 완료 대기
        await fetchProducts();

        showSuccess('제품이 추가되었습니다.');
        success = true;
      } catch (error) {
        console.error('제품 추가 실패:', error);
        showError('제품 추가에 실패했습니다.');
        return; // 실패 시 모달 닫지 않음
      }
    }

    // 성공 시에만 모달 닫기 및 초기화
    if (success) {
      setShowAddProductModal(false);
      setIsEditMode(false);
      setEditingProductId(null);
      resetForm();
    }
  };
  
  // 폼 초기화
  const resetForm = () => {
    setNewProduct({
      productCode: '',
      productName: '',
      barcode: '',
      category: '',
      manufacturer: '',
      leadTime: 0,
      moq: 0,
      purchaseCurrency: 'KRW' as Currency,
      saleCurrency: 'KRW' as Currency,
      purchasePrice: 0,
      salePrice: 0,
      initialStock: 0,
      location: '기본 위치',
      zoneId: '',
      memo: '',
      supplier: '',
      supplierEmail: '',
      contactEmail: '',
      orderEmailTemplate: '',
      safetyStock: 0,
      minStock: 10,
      maxStock: 1000,
      isSameAsManufacturer: false,
      warehouseId: '' // 창고 ID 추가
    });
    // 중복 검사 상태 초기화
    setDuplicateCheckStatus({
      isChecking: false,
      isDuplicate: false,
      message: '',
      lastCheckedCode: ''
    });
  };

  // 제품 삭제 처리
  // 컬럼 클릭 핸들러
  const handleSort = (field: string) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭하면 방향 토글
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // 새로운 필드를 클릭하면 오름차순으로 시작
      setSortField(field);
      setSortDirection('asc');
    }
  };

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
      key: 'category',
      header: (
        <div 
          className="cursor-pointer flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSort('category')}
        >
          카테고리
          {sortField === 'category' && (
            <span className="text-xs">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      ),
      render: (_: any, row: any) => (
        <div className={`text-sm font-medium ${row.is_active === false ? 'text-gray-400' : 'text-gray-600'}`}>
          {row.category || '-'}
        </div>
      )
    },
    { 
      key: 'product_code', 
      header: (
        <div 
          className="cursor-pointer flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSort('product_name')}
        >
          상품 정보
          {sortField === 'product_name' && (
            <span className="text-xs">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      ),
      render: (value: string, row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div
              className={`text-xl font-bold cursor-pointer hover:text-blue-600 ${row.is_active === false ? 'text-gray-400 line-through' : 'text-gray-900'}`}
              onClick={() => handleProductClick(row)}
            >
              {row.product_name}
            </div>
            {row.is_active === false && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded">
                삭제됨
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 cursor-pointer hover:text-blue-600"
            onClick={() => handleProductClick(row)}
          >
            {row.bom && row.bom.length > 0 && (
              <Layers className="text-blue-500" size={14} title="세트상품" />
            )}
            <span className="text-xs text-gray-500 underline">{value}</span>
          </div>
        </div>
      )
    },
    {
      key: 'supplier',
      header: (
        <div 
          className="cursor-pointer flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSort('supplier')}
        >
          공급업체
          {sortField === 'supplier' && (
            <span className="text-xs">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      ),
      render: (value: string | undefined, row: any) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">{value}</div>
            {(row.lead_time_days !== undefined && row.lead_time_days !== null) && (
              <div className="text-xs text-gray-500">
                리드타임: {row.lead_time_days}일
              </div>
            )}
          </div>
        );
      }
    },
    { 
      key: 'current_stock', 
      header: (
        <div 
          className="cursor-pointer flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSort('current_stock')}
        >
          재고 현황
          {sortField === 'current_stock' && (
            <span className="text-xs">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      ), 
      align: 'center' as const,
      render: (value: number, row: any) => {
        const currentStock = value || 0;
        const safetyStock = row.safety_stock || 0;
        const needsReorder = safetyStock && currentStock <= safetyStock;
        
        // 재고 상태에 따른 색상 결정
        let stockColor = 'text-gray-900'; // 정상
        let bgColor = '';
        if (currentStock === 0) {
          stockColor = 'text-red-700';
          bgColor = 'bg-red-50';
        } else if (needsReorder) {
          stockColor = 'text-orange-700';
          bgColor = 'bg-orange-50';
        } else if (currentStock > safetyStock * 2) {
          stockColor = 'text-green-700';
          bgColor = 'bg-green-50';
        }
        
        return (
          <div className={`p-2 rounded ${bgColor}`}>
            <div className={`text-2xl font-bold ${stockColor}`}>
              {currentStock.toLocaleString()}
            </div>
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
      header: (
        <div 
          className="cursor-pointer flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSort('safety_stock')}
        >
          안전 재고량
          {sortField === 'safety_stock' && (
            <span className="text-xs">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      ),
      align: 'center' as const,
      render: (value: number | undefined, row: any) => {
        const safetyStock = value || 0;
        
        return (
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              {row.is_auto_calculated && (
                <Calculator className="text-blue-500" size={14} title="자동 계산된 값" />
              )}
              <div className="text-xl font-bold">
                {safetyStock ? safetyStock.toLocaleString() : '-'}
              </div>
            </div>
            {row.moq && (
              <div className="text-xs text-gray-500">
                MOQ: {row.moq.toLocaleString()}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'location',
      header: '위치',
      render: (_: any, row: any) => (
        <div className="space-y-1">
          <div className="font-medium text-sm">
            {row.warehouse_name || '미지정'}
          </div>
          {row.zone_id && (
            <div className="text-xs text-gray-500">
              구역: {row.zone_id}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'price',
      header: (
        <div 
          className="cursor-pointer flex items-center gap-1 hover:text-blue-600"
          onClick={() => handleSort('sale_price')}
        >
          판매가(VAT포함)
          {sortField === 'sale_price' && (
            <span className="text-xs">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </div>
      ),
      align: 'right' as const,
      render: (_: any, row: any) => {
        const saleCurrency = row.sale_currency || 'KRW';
        return (
          <div className="text-right">
            <div className="text-sm">
              <span className="font-medium">{formatPrice(row.sale_price || 0, saleCurrency as Currency)}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'discrepancy',
      header: '7일간 재고 불일치',
      align: 'center' as const,
      render: (_: any, row: any) => {
        const hasDiscrepancy = row.has_pending_discrepancy && row.discrepancy !== 0;
        
        if (!hasDiscrepancy) {
          return (
            <div className="flex justify-center">
              <CheckCircle className="text-green-500" size={20} title="정상" />
            </div>
          );
        }
        
        // 불일치 값 표시
        return (
          <div className="flex flex-col items-center">
            <div className={`font-bold text-lg ${row.discrepancy > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {row.discrepancy > 0 ? '+' : ''}{row.discrepancy}
            </div>
            {row.discrepancy_count > 0 && (
              <div className="text-xs text-gray-500">
                7일간 조정: {row.discrepancy_count}건
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: '개별 조정 / 이력 / 세트 구성 관리',
      align: 'center' as const,
      render: (_: any, row: any) => {
        const hasBOM = row.bom && row.bom.length > 0;
        const possibleSets = hasBOM ? calculatePossibleSets(row) : null;

        return (
          <div className="flex flex-col gap-1 items-center">
            <div className="flex gap-1">
              {row.is_active !== false && (
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
              )}
              <Button
                size="sm"
                variant="ghost"
                title="이력 보기"
                onClick={async () => {
                  // API에서 해당 제품의 거래 내역 가져오기
                  const productHistory = await fetchProductTransactions(row.product_code);
                  setSelectedProduct(row);
                  setSelectedProductHistory(productHistory);
                  setShowHistoryModal(true);
                }}
              >
                <BarChart size={16} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                title="세트 구성 관리"
                onClick={async () => {
                  setSelectedProduct(row);
                  setEditingBOM([]);

                  // BOM 데이터 로드
                  try {
                    const bomData = await productBOMAPI.getAll(row.product_code);
                    if (bomData.items && bomData.items.length > 0) {
                      const formattedBOM = bomData.items.map((item: any) => ({
                        childProductCode: item.child_product_code,
                        childProductName: item.child_product_name,
                        quantity: item.quantity,
                        currentStock: products.find((p: any) => p.product_code === item.child_product_code)?.current_stock || 0
                      }));
                      setEditingBOM(formattedBOM);

                      // 초기 최대 재고량 계산 및 저장
                      const possibleSets = calculatePossibleSets({...row, bom: formattedBOM});
                      setInitialMaxStock(row.current_stock + (possibleSets || 0));
                    } else {
                      // BOM이 없는 경우
                      setInitialMaxStock(row.current_stock);
                    }
                  } catch (error) {
                    console.error('BOM 조회 실패:', error);
                    setInitialMaxStock(row.current_stock);
                  }

                  setShowBOMModal(true);
                }}
                className={hasBOM ? 'text-blue-600 hover:text-blue-700' : ''}
              >
                <Layers size={hasBOM ? 20 : 16} className={hasBOM ? 'text-blue-600' : ''} />
              </Button>
            </div>
            {hasBOM && (
              <div className="text-xs text-gray-500">
                세트 {possibleSets}개 가능
              </div>
            )}
          </div>
        );
      }
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
                  const headers = ['제품코드', '제품명', '바코드', '카테고리', '현재재고', '최소재고', '최대재고', '판매가(VAT포함)'];
                  
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
              <div className="w-40">
                <SelectField
                  label="창고 선택"
                  name="location"
                  options={[
                    { value: '', label: '모든 창고' },
                    ...warehouses.map(wh => ({
                      value: wh.id,
                      label: wh.name
                    }))
                  ]}
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                />
              </div>
              <div className="w-40">
                <SelectField
                  label="카테고리 선택"
                  name="category"
                  options={[
                    { value: '', label: '모든 카테고리' },
                    ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort().map(cat => ({
                      value: cat,
                      label: cat
                    }))
                  ]}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <TextField
                  label="상품 검색"
                  name="search"
                  placeholder="상품코드, 이름, 바코드 검색"
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  icon={Search}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CheckboxField
                label="재고 부족"
                name="lowStock"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="whitespace-nowrap"
              />
              <CheckboxField
                label="재고 보유"
                name="withStock"
                checked={showOnlyWithStock}
                onChange={(e) => setShowOnlyWithStock(e.target.checked)}
                className="whitespace-nowrap"
              />
              <CheckboxField
                label="세트 상품"
                name="setProducts"
                checked={showOnlySetProducts}
                onChange={(e) => setShowOnlySetProducts(e.target.checked)}
                className="whitespace-nowrap"
              />
              <CheckboxField
                label="삭제 상품"
                name="deletedProducts"
                checked={showDeletedProducts}
                onChange={(e) => {
                  setShowDeletedProducts(e.target.checked);
                  // 삭제 상품 필터를 켜면 다른 필터들은 끄기
                  if (e.target.checked) {
                    setShowOnlyWithStock(false);
                    setShowOnlySetProducts(false);
                    setShowLowStock(false);
                  }
                }}
                className="whitespace-nowrap text-red-600"
              />
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">제품 목록을 불러오는 중...</p>
          </div>
        ) : sortedProducts.length > 0 ? (
          <>
            <DataTable
              columns={columns}
              data={paginatedProducts}
            />

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    전체 {sortedProducts.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, sortedProducts.length)}개 표시
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    처음
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? 'bg-blue-600 text-white' : ''}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    마지막
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    페이지 {currentPage} / {totalPages}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Package}
            title="제품이 없습니다"
            description="검색 조건을 변경하거나 새 제품을 추가해보세요"
            action={{
              label: '제품 추가',
              onClick: () => {
                setIsEditMode(false);
                setEditingProductId(null);
                resetForm();
                setShowAddProductModal(true);
              },
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
              세트 구성 관리 - {selectedProduct.product_name}
            </h2>
            
            {/* 현재 재고 상태 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">세트 재고</p>
                  <p className="text-2xl font-bold">{selectedProduct.current_stock}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">조립 가능</p>
                  <p className="text-2xl font-bold text-green-600">
                    {calculatePossibleSets({...selectedProduct, bom: editingBOM}) || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">예상 재고 최대량</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {initialMaxStock}
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
                            p.product_code !== selectedProduct.product_code && // 자기 자신 제외
                            !editingBOM.some(b => b.childProductCode === p.product_code) && // 이미 추가된 부품 제외
                            (p.product_name.toLowerCase().includes(bomSearchValue.toLowerCase()) ||
                             p.product_code.toLowerCase().includes(bomSearchValue.toLowerCase()))
                          )
                          .slice(0, 10)
                          .map(product => (
                            <div
                              key={product.product_code}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setSelectedBOMProduct(product);
                                setBomSearchValue(product.product_name);
                                setShowBOMSearchDropdown(false);
                              }}
                            >
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium">{product.product_name}</p>
                                  <p className="text-sm text-gray-500">{product.product_code}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold">{product.current_stock}개</p>
                                  <p className="text-xs text-gray-500">재고</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        {products.filter(p =>
                          p.product_code !== selectedProduct.product_code &&
                          !editingBOM.some(b => b.childProductCode === p.product_code) &&
                          (p.product_name.toLowerCase().includes(bomSearchValue.toLowerCase()) ||
                           p.product_code.toLowerCase().includes(bomSearchValue.toLowerCase()))
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
                          childProductCode: selectedBOMProduct.product_code,
                          childProductName: selectedBOMProduct.product_name,
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
                    const childProduct = products.find(p => p.product_code === item.childProductCode);
                    return (
                      <div key={item.childProductCode} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.childProductName}</p>
                          <p className="text-sm text-gray-500">
                            재고: {childProduct?.current_stock || 0}개
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
                      max={Math.max(calculatePossibleSets({...selectedProduct, bom: editingBOM}) || 0, selectedProduct.current_stock)}
                      value={assembleQuantity}
                      onChange={(e) => setAssembleQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      try {
                        // 세트 조립 API 호출
                        const assembleResult = await productBOMAPI.assemble(selectedProduct.product_code, assembleQuantity);

                        showSuccess(`${assembleQuantity}개 세트가 조립되었습니다.`);

                        // 제품 목록 새로고침
                        await fetchProducts();

                        // API에서 반환된 세트 제품 정보로 직접 업데이트
                        if (assembleResult.set_product) {
                          const updatedSetProduct = {
                            ...selectedProduct,
                            current_stock: assembleResult.set_product.new_quantity
                          };
                          setSelectedProduct(updatedSetProduct);

                          // 구성 부품 재고 업데이트
                          const updatedBOM = editingBOM.map(item => {
                            const requiredQty = item.quantity * assembleQuantity;
                            return {
                              ...item,
                              currentStock: item.currentStock - requiredQty
                            };
                          });
                          setEditingBOM(updatedBOM);
                        }

                        // 조립 수량 초기화
                        setAssembleQuantity(1);
                      } catch (error) {
                        console.error('세트 조립 실패:', error);
                        showError('세트 조립에 실패했습니다.');
                      }
                    }}
                    disabled={(calculatePossibleSets({...selectedProduct, bom: editingBOM}) || 0) < assembleQuantity}
                    icon={TrendingUp}
                  >
                    세트 조립
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        // 세트 해체 API 호출
                        const disassembleResult = await productBOMAPI.disassemble(selectedProduct.product_code, assembleQuantity);

                        showSuccess(`${assembleQuantity}개 세트가 해체되었습니다.`);

                        // 제품 목록 새로고침
                        await fetchProducts();

                        // API에서 반환된 세트 제품 정보로 직접 업데이트
                        if (disassembleResult.set_product) {
                          const updatedSetProduct = {
                            ...selectedProduct,
                            current_stock: disassembleResult.set_product.new_quantity
                          };
                          setSelectedProduct(updatedSetProduct);

                          // 구성 부품 재고 업데이트
                          const updatedBOM = editingBOM.map(item => {
                            const returnedQty = item.quantity * assembleQuantity;
                            return {
                              ...item,
                              currentStock: item.currentStock + returnedQty
                            };
                          });
                          setEditingBOM(updatedBOM);
                        }

                        // 조립 수량 초기화
                        setAssembleQuantity(1);
                      } catch (error) {
                        console.error('세트 해체 실패:', error);
                        showError('세트 해체에 실패했습니다.');
                      }
                    }}
                    disabled={selectedProduct.current_stock < assembleQuantity}
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
                  나가기
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      // BOM 저장
                      await productBOMAPI.bulkCreate(selectedProduct.product_code, editingBOM);
                      showSuccess('BOM 구성이 저장되었습니다.');

                      // 제품 목록 새로고침
                      await fetchProducts();

                      setShowBOMModal(false);
                      setSelectedProduct(null);
                      setEditingBOM([]);
                      setBomSearchValue('');
                      setSelectedBOMProduct(null);
                      setBomQuantity(1);
                    } catch (error) {
                      console.error('BOM 저장 실패:', error);
                      showError('BOM 저장에 실패했습니다.');
                    }
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
                    const originalProduct = products.find(p => p.product_code === editingProductId);
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
                    <div className="space-y-2">
                      <TextField
                        label="SKU"
                        name="productCode"
                        value={newProduct.productCode}
                        onChange={(e) => {
                          const newCode = e.target.value;
                          setNewProduct({...newProduct, productCode: newCode});
                          
                          // 편집 모드에서는 현재 제품 코드를 제외하고 검사
                          const originalCode = isEditMode && editingProductId ? 
                            products.find(p => p.product_code === editingProductId)?.product_code : 
                            undefined;
                          
                          // 중복 검사 실행
                          debouncedDuplicateCheck(newCode, originalCode);
                        }}
                        placeholder="제품 코드를 입력하세요"
                        required
                        className={`${
                          duplicateCheckStatus.isDuplicate && 
                          duplicateCheckStatus.lastCheckedCode === newProduct.productCode
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : duplicateCheckStatus.message && 
                              !duplicateCheckStatus.isDuplicate && 
                              duplicateCheckStatus.lastCheckedCode === newProduct.productCode
                              ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                              : ''
                        }`}
                        action={
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newCode = generateSKU();
                              setNewProduct({...newProduct, productCode: newCode});
                              debouncedDuplicateCheck(newCode, isEditMode && editingProductId ? 
                                products.find(p => p.product_code === editingProductId)?.product_code : undefined);
                            }}
                          >
                            자동 생성
                          </Button>
                        }
                      />
                      
                      {/* 중복 검사 결과 표시 */}
                      {duplicateCheckStatus.isChecking && duplicateCheckStatus.lastCheckedCode === newProduct.productCode && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <RefreshCw className="animate-spin" size={14} />
                          <span>중복 검사 중...</span>
                        </div>
                      )}
                      
                      {!duplicateCheckStatus.isChecking && duplicateCheckStatus.message && duplicateCheckStatus.lastCheckedCode === newProduct.productCode && (
                        <div className={`flex items-center gap-2 text-sm ${
                          duplicateCheckStatus.isDuplicate ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {duplicateCheckStatus.isDuplicate ? (
                            <XCircle size={14} />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          <span>{duplicateCheckStatus.message}</span>
                        </div>
                      )}
                    </div>
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
                  <div>
                    <TextField
                      label="카테고리"
                      name="category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      placeholder="기존 카테고리를 선택하거나 새로 입력"
                      list="category-options"
                    />
                    <datalist id="category-options">
                      {uniqueCategories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>
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
                    name="supplierEmail"
                    value={newProduct.supplierEmail}
                    onChange={(e) => setNewProduct({...newProduct, supplierEmail: e.target.value})}
                    placeholder="supplier@email.com"
                    hint="공급업체 담당자 연락처"
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
                  <SelectField
                    label="창고"
                    name="warehouseId"
                    options={[
                      { value: '', label: '창고 선택' },
                      ...warehouses.map(wh => ({
                        value: wh.id,
                        label: wh.name
                      }))
                    ]}
                    value={newProduct.warehouseId}
                    onChange={(e) => setNewProduct({...newProduct, warehouseId: e.target.value})}
                    required
                  />
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
                    name="contactEmail"
                    type="email"
                    value={newProduct.contactEmail}
                    onChange={(e) => setNewProduct({...newProduct, contactEmail: e.target.value})}
                    placeholder="contact@email.com"
                    hint="내부 담당자 이메일"
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
                <div className="space-y-4">
                  {/* 판매가 정보 */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3 text-gray-600">판매가(VAT포함)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <SelectField
                        label="판매 통화"
                        name="saleCurrency"
                        value={newProduct.saleCurrency}
                        onChange={(e) => setNewProduct({...newProduct, saleCurrency: e.target.value as Currency})}
                        options={CURRENCY_OPTIONS}
                        icon={DollarSign}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          판매가 {newProduct.saleCurrency === 'KRW' ? '(원)' : '(달러)'}
                        </label>
                        <input
                          type="text"
                          value={newProduct.saleCurrency === 'KRW' 
                            ? Math.round(Number(newProduct.salePrice) || 0).toString() 
                            : (Number(newProduct.salePrice) || 0).toFixed(2)}
                          onChange={(e) => {
                            const validated = validatePriceInput(e.target.value, newProduct.saleCurrency);
                            const parsed = parseFloat(validated) || 0;
                            setNewProduct({...newProduct, salePrice: parsed});
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={newProduct.saleCurrency === 'KRW' ? '0' : '0.00'}
                        />
                        <div className="mt-1 text-sm text-gray-500">
                          {formatPrice(newProduct.salePrice || 0, newProduct.saleCurrency)}
                        </div>
                      </div>
                    </div>
                  </div>
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
            <div className="flex justify-between items-center gap-2 mt-6 pt-4 border-t">
              {/* 왼쪽: 삭제/활성화 버튼 */}
              <div>
                {isEditMode && editingProductId && (() => {
                  const currentProduct = products.find(p => p.product_code === editingProductId);
                  return currentProduct?.is_active === false ? (
                    // 활성화 버튼 (비활성 상품)
                    <button
                      onClick={() => {
                        const product = products.find(p => p.product_code === editingProductId);
                        setConfirmDialog({
                          isOpen: true,
                          title: '제품 활성화',
                          message: `"${product?.product_name}" 제품을 다시 활성화하시겠습니까?`,
                          variant: 'info',
                          onConfirm: async () => {
                            try {
                              await productAPI.update(editingProductId, {
                                is_active: true
                              });
                              showSuccess('제품이 활성화되었습니다.');
                              setShowAddProductModal(false);
                              setIsEditMode(false);
                              setEditingProductId(null);
                              resetForm();
                              await fetchProducts();
                            } catch (error) {
                              console.error('제품 활성화 실패:', error);
                              showError('제품 활성화에 실패했습니다.');
                            }
                            setConfirmDialog({ ...confirmDialog, isOpen: false });
                          }
                        });
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 border border-blue-300 hover:border-blue-400 rounded-lg font-medium transition-all hover:bg-blue-50"
                    >
                      <CheckCircle size={18} />
                      <span>활성화</span>
                    </button>
                  ) : (
                    // 삭제 버튼 (활성 상품)
                    <Button
                      variant="outline"
                      icon={Trash2}
                      onClick={() => {
                        const product = products.find(p => p.product_code === editingProductId);
                        setConfirmDialog({
                          isOpen: true,
                          title: '제품 삭제',
                          message: `정말로 "${product?.product_name}" 제품을 삭제하시겠습니까?\n\n삭제된 제품은 '삭제 상품' 필터를 통해 확인 및 복구할 수 있습니다.`,
                          variant: 'danger',
                          onConfirm: async () => {
                            try {
                              await productAPI.update(editingProductId, {
                                is_active: false
                              });
                              showSuccess('제품이 삭제되었습니다.');
                              setShowAddProductModal(false);
                              setIsEditMode(false);
                              setEditingProductId(null);
                              resetForm();
                              await fetchProducts();
                            } catch (error) {
                              console.error('제품 삭제 실패:', error);
                              showError('제품 삭제에 실패했습니다.');
                            }
                            setConfirmDialog({ ...confirmDialog, isOpen: false });
                          }
                        });
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      삭제
                    </Button>
                  );
                })()}
              </div>

              {/* 오른쪽: 취소, 수정완료 버튼 */}
              <div className="flex gap-2">
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
                  disabled={
                    !newProduct.productCode ||
                    !newProduct.productName ||
                    duplicateCheckStatus.isChecking ||
                    (duplicateCheckStatus.isDuplicate && duplicateCheckStatus.lastCheckedCode === newProduct.productCode)
                  }
                >
                  {isEditMode ? '수정 완료' : '입력 완료'}
                </Button>
              </div>
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
                  <p className="font-semibold">{selectedProduct.product_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">제품 코드</p>
                  <p className="font-semibold">{selectedProduct.product_code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">현재 재고</p>
                  <p className="font-semibold text-blue-600">{selectedProduct.current_stock}개</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">최소 재고</p>
                  <p className="font-semibold">{selectedProduct.safety_stock || 0}개</p>
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
                {adjustmentData.quantity > 0 && adjustmentData.quantity !== selectedProduct.current_stock && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className={`text-sm font-medium ${
                      adjustmentData.quantity > selectedProduct.current_stock ? 'text-green-600' : 'text-red-600'
                    }`}>
                      불일치: {adjustmentData.quantity > selectedProduct.current_stock ? '+' : ''}{adjustmentData.quantity - selectedProduct.current_stock}개
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      현재 재고({selectedProduct.current_stock}개) → 실제 재고({adjustmentData.quantity}개)
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
                  if (adjustmentData.quantity === selectedProduct.current_stock) {
                    showWarning('현재 재고와 동일합니다. 조정이 필요하지 않습니다.');
                    return;
                  }
                  if (!adjustmentData.reason) {
                    showError('조정 사유를 선택해주세요.');
                    return;
                  }

                  // 불일치 수량 계산 (실제 재고 - 현재 재고)
                  const discrepancy = adjustmentData.quantity - selectedProduct.current_stock;

                  // API를 통한 재고 조정
                  const adjustTransaction = {
                    transaction_type: 'ADJUST',
                    product_code: selectedProduct.product_code,
                    quantity: discrepancy, // 차이값을 기록
                    reason: adjustmentData.reason,
                    memo: adjustmentData.memo || `실사 재고: ${adjustmentData.quantity}개 (불일치: ${discrepancy > 0 ? '+' : ''}${discrepancy}개)`,
                    created_by: '관리자'
                  };
                  
                  try {
                    await transactionAPI.create(adjustTransaction);
                    showSuccess('재고 조정이 완료되었습니다.');
                    
                    // 개별 제품 업데이트 (위치 유지)
                    await updateSingleProduct(selectedProduct.product_code);
                    setShowAdjustmentModal(false);
                    setAdjustmentData({ quantity: 0, reason: '', memo: '' });
                  } catch (error) {
                    console.error('재고 조정 실패:', error);
                    showError('재고 조정에 실패했습니다.');
                  }
                }}
                disabled={adjustmentData.quantity === 0 || adjustmentData.quantity === selectedProduct.current_stock || !adjustmentData.reason || adjustmentData.memo.length < 10}
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
          <div className="bg-white rounded-lg p-6 max-w-7xl w-full max-h-[80vh] overflow-hidden flex flex-col">
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[150px]">날짜/시간</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap min-w-[100px]">구분</th>
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
                      <tr key={history.id || index} className={`border-b hover:bg-gray-50 ${
                        history.affectsCurrentStock === false ? 'bg-gray-50 opacity-70' : ''
                      }`}>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            {new Date(history.date).toLocaleDateString('ko-KR')}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={12} />
                            {new Date(history.date).toLocaleTimeString('ko-KR')}
                          </div>
                          {history.affectsCurrentStock === false && (
                            <div className="mt-1">
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                재고 미반영
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            history.type === 'inbound' ? 'bg-green-100 text-green-800' :
                            history.type === 'outbound' ? 'bg-red-100 text-red-800' :
                            history.type === 'adjustment' ? 'bg-yellow-100 text-yellow-800' :
                            history.type === 'disposal' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {history.type === 'inbound' ? '입고' :
                             history.type === 'outbound' ? '출고' :
                             history.type === 'adjustment' ? '조정' :
                             history.type === 'disposal' ? '폐기' : '이동'}
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

      {/* ConfirmDialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === 'info' ? '활성화' : '삭제'}
        cancelText="취소"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}

export default ProductList;