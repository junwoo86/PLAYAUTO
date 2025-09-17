import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, Download, BarChart3 } from 'lucide-react';
import { statisticsAPI } from '../services/api';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';

interface SalesData {
  total_revenue: number;
  total_quantity_sold: number;
  average_daily_revenue: number;
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  sales_trend: Array<{
    date: string;
    revenue: number;
  }>;
  period_days: number;
}

const SalesAnalysisPage: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchSalesData();
  }, [days]);

  const fetchSalesData = async () => {
    setIsLoading(true);
    try {
      const response = await statisticsAPI.getSalesAnalysis(days);
      setSalesData(response.data);
    } catch (error) {
      console.error('매출 분석 데이터 조회 실패:', error);
      showError('매출 분석 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!salesData) return;

    const csvData = [];
    csvData.push(['구분', '제품명', '수량', '매출'].join(','));
    
    salesData.top_products.forEach(product => {
      csvData.push([
        '제품별 매출',
        product.product_name,
        product.quantity_sold,
        product.revenue
      ].join(','));
    });

    csvData.push(['', '', '', ''].join(','));
    csvData.push(['일별 매출 추이', '', '', ''].join(','));
    csvData.push(['날짜', '매출', '', ''].join(','));
    
    salesData.sales_trend.forEach(day => {
      csvData.push([
        day.date,
        day.revenue,
        '',
        ''
      ].join(','));
    });

    const csvContent = csvData.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `매출분석_${new Date().toISOString().split('T')[0]}.csv`);
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
              <DollarSign className="h-8 w-8 text-green-600" />
              매출 분석
            </h1>
            <p className="text-gray-600 mt-2">제품별 매출 현황 및 매출 추이를 분석합니다</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>
            <button
              onClick={downloadReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              다운로드
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">매출 분석 데이터를 불러오는 중...</p>
          </div>
        </div>
      ) : salesData ? (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">총 매출</p>
                  <p className="text-2xl font-bold text-green-800">₩{Math.round(salesData.total_revenue).toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">총 판매량</p>
                  <p className="text-2xl font-bold text-blue-800">{salesData.total_quantity_sold.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">일평균 매출</p>
                  <p className="text-2xl font-bold text-purple-800">₩{Math.round(salesData.average_daily_revenue).toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* 매출 상위 제품 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">매출 상위 제품</h3>
              {salesData.top_products.length === 0 ? (
                <p className="text-gray-500 text-center py-4">매출 데이터가 없습니다</p>
              ) : (
                <div className="space-y-3">
                  {salesData.top_products.map((product, index) => (
                    <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full font-semibold text-sm">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{product.product_name}</p>
                          <p className="text-sm text-gray-500">판매량: {product.quantity_sold.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₩{Math.round(product.revenue).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          {((product.revenue / salesData.total_revenue) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 일별 매출 추이 차트 영역 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">일별 매출 추이</h3>
              {salesData.sales_trend.length === 0 ? (
                <p className="text-gray-500 text-center py-4">매출 추이 데이터가 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {salesData.sales_trend.slice(-7).map((day, index) => {
                    const maxRevenue = Math.max(...salesData.sales_trend.map(d => d.revenue));
                    const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-16 text-sm text-gray-600">
                          {new Date(day.date).toLocaleDateString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-20 text-sm text-right text-gray-900 font-medium">
                          ₩{Math.round(day.revenue).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 매출 추이 테이블 */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">상세 매출 내역</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      날짜
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      일일 매출
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      전체 대비
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData.sales_trend.map((day, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-green-600 font-medium">
                          ₩{Math.round(day.revenue).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-gray-600">
                          {((day.revenue / salesData.total_revenue) * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">매출 분석 데이터를 불러올 수 없습니다</p>
        </div>
      )}
    </div>
  );
};

export default SalesAnalysisPage;