import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Download, Package } from 'lucide-react';
import { statisticsAPI, productAPI } from '../services/api';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';

interface PastQuantityData {
  date: string;
  transactions: Array<{
    transaction_id: string;
    product_id: string;
    product_name: string;
    type: string;
    quantity: number;
    reason: string;
    timestamp: string;
  }>;
}

interface Product {
  id: string;
  product_code: string;
  product_name: string;
}

const PastQuantityLookupPage: React.FC = () => {
  const [historyData, setHistoryData] = useState<PastQuantityData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchHistoryData();
  }, []);

  useEffect(() => {
    fetchHistoryData();
  }, [selectedProduct, days]);

  const fetchProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setProducts(response.data || []);
    } catch (error) {
      console.error('제품 목록 조회 실패:', error);
    }
  };

  const fetchHistoryData = async () => {
    setIsLoading(true);
    try {
      const response = await statisticsAPI.getPastQuantityAnalysis(
        selectedProduct || undefined, 
        days
      );
      setHistoryData(response.data.history || []);
    } catch (error) {
      console.error('과거 수량 데이터 조회 실패:', error);
      showError('과거 수량 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'IN': return '입고';
      case 'OUT': return '출고';
      case 'ADJUST': return '조정';
      default: return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'text-blue-600 bg-blue-50';
      case 'OUT': return 'text-red-600 bg-red-50';
      case 'ADJUST': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const downloadReport = () => {
    const csvData = [];
    csvData.push(['날짜', '제품명', '거래유형', '수량', '사유'].join(','));
    
    historyData.forEach(dayData => {
      dayData.transactions.forEach(transaction => {
        csvData.push([
          dayData.date,
          transaction.product_name,
          getTransactionTypeLabel(transaction.type),
          transaction.quantity,
          transaction.reason || '-'
        ].join(','));
      });
    });

    const csvContent = csvData.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `과거수량조회_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="h-8 w-8 text-purple-600" />
              과거 수량 조회
            </h1>
            <p className="text-gray-600 mt-2">제품별 과거 재고 변동 내역을 조회할 수 있습니다</p>
          </div>
          <button
            onClick={downloadReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            다운로드
          </button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 제품 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제품 선택
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="제품명 또는 제품코드로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {searchTerm && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div
                  onClick={() => {
                    setSelectedProduct('');
                    setSearchTerm('전체 제품');
                  }}
                  className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b"
                >
                  <p className="font-medium">전체 제품</p>
                </div>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product.id);
                      setSearchTerm(product.product_name);
                    }}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-sm text-gray-500">{product.product_code}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 조회 기간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              조회 기간
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
              <option value={180}>최근 6개월</option>
            </select>
          </div>

          {/* 조회 버튼 */}
          <div className="flex items-end">
            <button
              onClick={fetchHistoryData}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {isLoading ? '조회 중...' : '조회'}
            </button>
          </div>
        </div>
      </div>

      {/* 결과 영역 */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b">
          <h3 className="font-semibold">조회 결과</h3>
          <p className="text-sm text-gray-500">
            {selectedProduct ? '선택된 제품의' : '전체 제품의'} 최근 {days}일간 변동 내역
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        ) : historyData.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">해당 기간에 거래 내역이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {historyData.map((dayData, dayIndex) => (
              <div key={dayIndex} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <h4 className="font-medium text-gray-900">
                    {new Date(dayData.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </h4>
                  <span className="text-sm text-gray-500">
                    ({dayData.transactions.length}건)
                  </span>
                </div>

                <div className="space-y-2">
                  {dayData.transactions.map((transaction, transIndex) => (
                    <div 
                      key={transIndex} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.product_name}</p>
                          <p className="text-sm text-gray-500">{transaction.reason || '사유 없음'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.quantity >= 0 ? '+' : ''}{transaction.quantity.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.timestamp).toLocaleTimeString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PastQuantityLookupPage;