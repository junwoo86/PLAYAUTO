import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react';
import { statisticsAPI } from '../services/api';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';

interface TransactionSummary {
  date: string;
  inbound: number;
  outbound: number;
  adjustment: number;
}

const TransactionSummaryPage: React.FC = () => {
  const [summaryData, setSummaryData] = useState<TransactionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchSummaryData();
  }, [days]);

  const fetchSummaryData = async () => {
    setIsLoading(true);
    try {
      const response = await statisticsAPI.getTransactionSummary(days);
      // API 응답 구조에 맞게 수정
      const dailyData = response.daily_summary || response.data?.daily_summary || [];
      // 날짜와 수량 정보를 TransactionSummary 형식으로 변환
      const formattedData = dailyData.map((item: any) => ({
        date: item.date,
        inbound: item.in_quantity || 0,
        outbound: item.out_quantity || 0,
        adjustment: item.adjustment_quantity || 0
      }));
      setSummaryData(formattedData);
    } catch (error) {
      console.error('입출고 요약 데이터 로딩 실패:', error);
      showError('입출고 요약 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const totals = summaryData.reduce(
    (acc, item) => ({
      inbound: acc.inbound + item.inbound,
      outbound: acc.outbound + item.outbound,
      adjustment: acc.adjustment + item.adjustment
    }),
    { inbound: 0, outbound: 0, adjustment: 0 }
  );

  const downloadReport = () => {
    const csvContent = [
      ['날짜', '입고', '출고', '조정'].join(','),
      ...summaryData.map(item => [
        item.date,
        item.inbound,
        item.outbound,
        item.adjustment
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `입출고요약_${new Date().toISOString().split('T')[0]}.csv`);
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
              <BarChart3 className="h-8 w-8 text-blue-600" />
              입출고 요약
            </h1>
            <p className="text-gray-600 mt-2">일별 입출고 및 조정 내역을 요약하여 보여줍니다</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">총 입고</p>
              <p className="text-2xl font-bold text-blue-800">{totals.inbound.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">총 출고</p>
              <p className="text-2xl font-bold text-red-800">{totals.outbound.toLocaleString()}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600">총 조정</p>
              <p className="text-2xl font-bold text-yellow-800">{totals.adjustment.toLocaleString()}</p>
            </div>
            <Calendar className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold">일별 상세 내역</h3>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    날짜
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    입고
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출고
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    조정
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    순 변동
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {summaryData.map((item, index) => {
                  const netChange = item.inbound - item.outbound + item.adjustment;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.date).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-blue-600 font-medium">
                          +{item.inbound.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-red-600 font-medium">
                          -{item.outbound.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`font-medium ${item.adjustment >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                          {item.adjustment >= 0 ? '+' : ''}{item.adjustment.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`font-bold ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {summaryData.length === 0 && !isLoading && (
          <div className="p-8 text-center">
            <p className="text-gray-500">표시할 데이터가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionSummaryPage;