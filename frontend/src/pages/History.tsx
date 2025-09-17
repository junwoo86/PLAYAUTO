import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import debounce from 'lodash.debounce';
import {
  History, Filter, Download, Calendar, ChevronRight,
  Package, TrendingUp, TrendingDown, Settings, ArrowRightLeft,
  Clock, User, FileText, Plus, X, RefreshCw, Trash2
} from 'lucide-react';
import {
  PageHeader,
  Button,
  EmptyState,
  TextField,
  CheckboxField
} from '../components';
import { transactionAPI } from '../services/api';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';
import { parseUTCToLocal, formatKoreanDateTimeShort, getDateRangeFilter } from '../utils/dateUtils';

interface HistoryItem {
  id: string;
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  date: Date;
  user: string;
  items: {
    productId: string;
    productName: string;
    productCode: string;
    quantity: number;
    fromLocation?: string;
    toLocation?: string;
  }[];
  totalItems: number;
  totalQuantity: number;
  memo?: string;
  tags?: string[];
}

function HistoryPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [productFilter, setProductFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);
  
  // 검색 디바운싱 적용
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 300),
    []
  );
  
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // 실제 거래 데이터 가져오기
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await transactionAPI.getAll({
        limit: 100 // API 제한에 맞게 100개로 변경
      });
      setTransactions(response.data || []);
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
      showError('거래 내역을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 거래 삭제 처리
  const handleDeleteTransaction = async () => {
    if (!selectedItem) return;
    
    try {
      await transactionAPI.delete(selectedItem.id);
      showSuccess('거래 내역이 삭제되었습니다');
      setShowDeleteConfirm(false);
      setSelectedItem(null);
      // 목록 새로고침
      fetchTransactions();
    } catch (error: any) {
      console.error('거래 삭제 실패:', error);
      
      // 백엔드에서 반환한 구체적인 에러 메시지 표시
      if (error.response?.data?.detail) {
        showError(error.response.data.detail);
      } else {
        showError('거래 삭제 중 오류가 발생했습니다');
      }
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  React.useEffect(() => {
    fetchTransactions();
    
    const filterProduct = localStorage.getItem('historyFilterProduct');
    if (filterProduct) {
      setProductFilter(filterProduct);
      localStorage.removeItem('historyFilterProduct'); // 한 번 사용 후 삭제
    }
  }, []);

  // 외부 클릭 감지로 날짜 선택 팝업 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowCustomDatePicker(false);
      }
      if (filterModalRef.current && !filterModalRef.current.contains(event.target as Node)) {
        setShowFilterModal(false);
      }
    };

    if (showCustomDatePicker || showFilterModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCustomDatePicker, showFilterModal]);

  // 거래 유형별 아이콘과 색상
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inbound': return <TrendingDown className="text-green-600" size={20} />;
      case 'outbound': return <TrendingUp className="text-red-600" size={20} />;
      case 'adjustment': return <Settings className="text-blue-600" size={20} />;
      case 'transfer': return <ArrowRightLeft className="text-purple-600" size={20} />;
      default: return <Package className="text-gray-600" size={20} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'inbound': return '입고';
      case 'outbound': return '출고';
      case 'adjustment': return '조정';
      case 'transfer': return '이동';
      default: return '기타';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'inbound': return 'bg-green-100 text-green-800';
      case 'outbound': return 'bg-red-100 text-red-800';
      case 'adjustment': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 트랜잭션을 히스토리 아이템으로 그룹화 - 실제 API 데이터 구조 사용
  const historyItems: HistoryItem[] = useMemo(() => {
    // 제품 필터 및 검색 필터 적용
    let filteredTransactions = transactions;
    
    if (productFilter) {
      filteredTransactions = filteredTransactions.filter(t => 
        t.product_name === productFilter
      );
    }
    
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filteredTransactions = filteredTransactions.filter(t => 
        (t.product_name?.toLowerCase().includes(searchLower)) ||
        (t.product_code?.toLowerCase().includes(searchLower)) ||
        (t.created_by?.toLowerCase().includes(searchLower))
      );
    }

    // 실제 API 데이터를 HistoryItem으로 변환
    return filteredTransactions.map(trans => {
      const transactionType = trans.transaction_type === 'IN' ? 'inbound' : 
                             trans.transaction_type === 'OUT' ? 'outbound' : 
                             trans.transaction_type === 'ADJUST' ? 'adjustment' : 'transfer';
      
      return {
        id: trans.id,
        type: transactionType as 'inbound' | 'outbound' | 'adjustment' | 'transfer',
        date: parseUTCToLocal(trans.transaction_date || trans.created_at),
        user: trans.created_by || '관리자',
        items: [{
          productId: trans.product_code || '',
          productName: trans.product_name || '알 수 없는 제품',
          productCode: trans.product_code || '',
          quantity: trans.quantity,
          fromLocation: transactionType === 'transfer' ? '기본 창고' : undefined,
          toLocation: transactionType === 'transfer' ? '매장' : undefined
        }],
        totalItems: 1,
        totalQuantity: Math.abs(trans.quantity),
        memo: trans.memo || trans.reason,
        tags: trans.reason ? [trans.reason] : []
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, productFilter, debouncedSearchTerm]);

  // 기간 필터링 - 메모이제이션 적용
  const filteredItems = useMemo(() => historyItems.filter(item => {
    if (selectedPeriod === 'all') return true;
    
    const now = new Date();
    const itemDate = new Date(item.date);
    
    const range = getDateRangeFilter(selectedPeriod);
    if (range) {
      return itemDate >= range.start && itemDate <= range.end;
    }

    switch (selectedPeriod) {
      case 'custom':
        if (customDateRange.start && customDateRange.end) {
          const start = new Date(customDateRange.start);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customDateRange.end);
          end.setHours(23, 59, 59, 999);
          return itemDate >= start && itemDate <= end;
        }
        return true;
      default:
        return true;
    }
  }), [historyItems, selectedPeriod, customDateRange]);

  // 추가 필터 적용 - 메모이제이션 적용
  const finalFilteredItems = useMemo(() => filteredItems.filter(item => {
    if (activeFilters.length === 0) return true;
    return activeFilters.some(filter => {
      if (filter.startsWith('type:')) {
        return item.type === filter.replace('type:', '');
      }
      if (filter.startsWith('user:')) {
        return item.user === filter.replace('user:', '');
      }
      return true;
    });
  }), [filteredItems, activeFilters]);

  const formatDate = (date: Date) => {
    return formatKoreanDateTimeShort(date);
  };

  const periodOptions = [
    { value: 'all', label: '전체 기간' },
    { value: 'today', label: '오늘' },
    { value: 'week', label: '최근 7일' },
    { value: 'month', label: '최근 30일' },
    { value: 'custom', label: '기간 선택' }
  ];

  return (
    <div className="p-8">
      <PageHeader
        title={productFilter ? `히스토리 - ${productFilter}` : "히스토리"}
        icon={History}
        actions={
          <Button variant="outline" icon={Download}>
            엑셀 내보내기
          </Button>
        }
      />

      {/* 제품 필터 표시 */}
      {productFilter && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700">
            <strong>{productFilter}</strong> 제품의 거래 내역만 표시 중
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setProductFilter('')}
            icon={X}
          >
            필터 해제
          </Button>
        </div>
      )}

      {/* 필터 바 */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex items-center gap-3">
          {/* 기간 선택 */}
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowCustomDatePicker(!showCustomDatePicker)}
              className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <Calendar size={16} />
              {periodOptions.find(o => o.value === selectedPeriod)?.label}
              <ChevronRight size={16} className={`transform transition-transform ${showCustomDatePicker ? 'rotate-90' : ''}`} />
            </button>
            
            {showCustomDatePicker && (
              <div className="absolute top-full mt-2 left-0 bg-white border rounded-lg shadow-lg p-4 z-10 min-w-[200px]">
                {periodOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedPeriod(option.value);
                      if (option.value !== 'custom') {
                        setShowCustomDatePicker(false);
                      }
                    }}
                    className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-50 ${
                      selectedPeriod === option.value ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                
                {selectedPeriod === 'custom' && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="space-y-2">
                      <TextField
                        label="시작 날짜"
                        name="startDate"
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                      />
                      <TextField
                        label="종료 날짜"
                        name="endDate"
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 필터 추가 버튼 */}
          <button
            onClick={() => setShowFilterModal(true)}
            className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50"
          >
            <Filter size={16} />
            필터 추가
          </button>

          {/* 활성 필터 태그 */}
          {activeFilters.map(filter => (
            <div key={filter} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center gap-2">
              <span className="text-sm">{filter.replace(':', ': ')}</span>
              <button
                onClick={() => setActiveFilters(activeFilters.filter(f => f !== filter))}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 히스토리 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex">
          {/* 왼쪽: 히스토리 목록 */}
          <div className="w-1/2 border-r">
            <div className="max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
                    <p className="text-gray-500">거래 내역을 불러오는 중...</p>
                  </div>
                </div>
              ) : finalFilteredItems.length > 0 ? (
                <>
                  {finalFilteredItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedItem?.id === item.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(item.type)}
                          <div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeColor(item.type)}`}>
                              {getTypeLabel(item.type)}
                            </span>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <Clock size={12} />
                              {formatDate(item.date)}
                              <User size={12} />
                              {item.user}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700">
                        {item.totalItems}개 품목 / {item.totalQuantity.toLocaleString()}개
                      </div>
                      
                      {/* 제품명 목록 */}
                      <div className="text-xs text-gray-600 mt-2">
                        {(() => {
                          // 세트 상품과 일반 상품 구분
                          const setProducts = new Set<string>();
                          const normalProducts: string[] = [];
                          
                          item.items.forEach(product => {
                            // 세트 상품인지 확인 (예: "바이오밸런스 세트 - 바이오밸런스" 형태)
                            if (product.productName.includes(' 세트 - ')) {
                              const setName = product.productName.split(' - ')[0];
                              setProducts.add(setName);
                            } else if (product.productName.includes(' 세트')) {
                              setProducts.add(product.productName);
                            } else {
                              normalProducts.push(product.productName);
                            }
                          });
                          
                          const allProducts = [...Array.from(setProducts), ...normalProducts];
                          const displayProducts = allProducts.slice(0, 3);
                          const remainingCount = allProducts.length - 3;
                          
                          return (
                            <div className="flex flex-wrap gap-1">
                              {displayProducts.map((name, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                  {name}
                                </span>
                              ))}
                              {remainingCount > 0 && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                                  +{remainingCount}개
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {item.memo && (
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <ChevronRight size={14} />
                          {item.memo}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="p-4 text-center text-sm text-gray-500">
                    더 이상 불러올 내역이 없습니다.
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={History}
                  title="거래 내역이 없습니다"
                  description="선택한 기간에 해당하는 거래가 없습니다"
                />
              )}
            </div>
          </div>

          {/* 오른쪽: 상세 정보 */}
          <div className="w-1/2 p-6">
            {selectedItem ? (
              <div>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">거래 상세</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-20">유형:</span>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeColor(selectedItem.type)}`}>
                        {getTypeLabel(selectedItem.type)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-20">날짜:</span>
                      <span className="text-sm">{formatDate(selectedItem.date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-20">담당자:</span>
                      <span className="text-sm">{selectedItem.user}</span>
                    </div>
                    
                    {selectedItem.memo && (
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-gray-500 w-20">메모:</span>
                        <span className="text-sm">{selectedItem.memo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-3">품목 목록</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">제품명</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">제품코드</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">수량</th>
                          {selectedItem.type === 'transfer' && (
                            <>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">출발</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">도착</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItem.items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2 text-sm">{item.productName}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{item.productCode}</td>
                            <td className="px-4 py-2 text-sm text-right">{item.quantity.toLocaleString()}</td>
                            {selectedItem.type === 'transfer' && (
                              <>
                                <td className="px-4 py-2 text-sm">{item.fromLocation}</td>
                                <td className="px-4 py-2 text-sm">{item.toLocation}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4" />
                  <p>왼쪽 목록에서 내역을 선택해 주세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 필터 모달 */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full" ref={filterModalRef}>
            <h3 className="text-lg font-semibold mb-4">필터 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">거래 유형</label>
                <div className="space-y-3">
                  {['inbound', 'outbound', 'adjustment', 'transfer'].map(type => (
                    <CheckboxField
                      key={type}
                      label={getTypeLabel(type)}
                      name={`type_${type}`}
                      checked={activeFilters.includes(`type:${type}`)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveFilters([...activeFilters, `type:${type}`]);
                        } else {
                          setActiveFilters(activeFilters.filter(f => f !== `type:${type}`));
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowFilterModal(false)}
              >
                취소
              </Button>
              <Button
                onClick={() => setShowFilterModal(false)}
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">거래 내역 삭제</h3>
            <p className="text-gray-600 mb-6">
              이 거래 내역을 삭제하시겠습니까?<br />
              삭제된 데이터는 복구할 수 없으며, 재고 수량에 영향을 줄 수 있습니다.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                취소
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteTransaction}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;