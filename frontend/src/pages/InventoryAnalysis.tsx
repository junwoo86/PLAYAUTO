import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, Download, PieChart } from 'lucide-react';
import { statisticsAPI } from '../services/api';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';

interface InventoryAnalysisData {
  abc_analysis: {
    A: number;
    B: number;
    C: number;
  };
  total_products: number;
  low_stock_products: Array<{
    id: string;
    name: string;
    current_stock: number;
    safety_stock: number;
    days_to_stockout: number;
  }>;
  high_stock_products: Array<{
    id: string;
    name: string;
    current_stock: number;
    max_stock: number;
    inventory_days: number;
  }>;
  turnover_rate: number;
  inventory_days: number;
  total_inventory_value: number;
}

const InventoryAnalysisPage: React.FC = () => {
  const [analysisData, setAnalysisData] = useState<InventoryAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAnalysisData();
  }, []);

  const fetchAnalysisData = async () => {
    setIsLoading(true);
    try {
      const response = await statisticsAPI.getInventoryAnalysis();
      setAnalysisData(response.data);
    } catch (error) {
      console.error('재고 분석 데이터 조회 실패:', error);
      showError('재고 분석 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!analysisData) return;

    const csvData = [];
    csvData.push(['분류', '내용', '값'].join(','));
    
    // ABC 분석
    csvData.push(['ABC 분석', 'A급 제품', analysisData.abc_analysis.A].join(','));
    csvData.push(['ABC 분석', 'B급 제품', analysisData.abc_analysis.B].join(','));
    csvData.push(['ABC 분석', 'C급 제품', analysisData.abc_analysis.C].join(','));
    
    // 재고 부족 제품
    analysisData.low_stock_products.forEach(product => {
      csvData.push(['재고 부족', product.name, `현재: ${product.current_stock}, 안전: ${product.safety_stock}`].join(','));
    });
    
    // 재고 과잉 제품
    analysisData.high_stock_products.forEach(product => {
      csvData.push(['재고 과잉', product.name, `현재: ${product.current_stock}, 최대: ${product.max_stock}`].join(','));
    });

    const csvContent = csvData.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `재고분석_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">재고 분석 데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">재고 분석 데이터를 불러올 수 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-8 w-8 text-green-600" />
              재고 분석
            </h1>
            <p className="text-gray-600 mt-2">ABC 분석, 재고 회전율 및 재고 최적화 정보를 제공합니다</p>
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

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">총 제품 수</p>
              <p className="text-2xl font-bold text-blue-800">{analysisData.total_products.toLocaleString()}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">총 재고 가치</p>
              <p className="text-2xl font-bold text-green-800">₩{Math.round(analysisData.total_inventory_value).toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600">재고 회전율</p>
              <p className="text-2xl font-bold text-orange-800">{analysisData.turnover_rate}회</p>
            </div>
            <PieChart className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">평균 재고 일수</p>
              <p className="text-2xl font-bold text-red-800">{analysisData.inventory_days}일</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* ABC 분석 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">ABC 분석</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div>
                <p className="font-medium text-red-800">A급 제품</p>
                <p className="text-sm text-red-600">매출 80% 기여</p>
              </div>
              <span className="text-2xl font-bold text-red-800">{analysisData.abc_analysis.A}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="font-medium text-yellow-800">B급 제품</p>
                <p className="text-sm text-yellow-600">매출 15% 기여</p>
              </div>
              <span className="text-2xl font-bold text-yellow-800">{analysisData.abc_analysis.B}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-800">C급 제품</p>
                <p className="text-sm text-blue-600">매출 5% 기여</p>
              </div>
              <span className="text-2xl font-bold text-blue-800">{analysisData.abc_analysis.C}</span>
            </div>
          </div>
        </div>

        {/* 재고 부족 제품 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-700">재고 부족 제품</h3>
          {analysisData.low_stock_products.length === 0 ? (
            <p className="text-gray-500 text-center py-4">재고 부족 제품이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {analysisData.low_stock_products.map((product) => (
                <div key={product.id} className="p-3 border rounded-lg bg-red-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        현재: {product.current_stock} / 안전: {product.safety_stock}
                      </p>
                    </div>
                    <span className="text-sm text-red-600 font-medium">
                      {product.days_to_stockout}일 남음
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 재고 과잉 제품 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-700">재고 과잉 제품</h3>
          {analysisData.high_stock_products.length === 0 ? (
            <p className="text-gray-500 text-center py-4">재고 과잉 제품이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {analysisData.high_stock_products.map((product) => (
                <div key={product.id} className="p-3 border rounded-lg bg-blue-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        현재: {product.current_stock} / 최대: {product.max_stock}
                      </p>
                    </div>
                    <span className="text-sm text-blue-600 font-medium">
                      {product.inventory_days}일분
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryAnalysisPage;