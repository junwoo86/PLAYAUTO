import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, FileText, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { dailyLedgerAPI, DailyLedger, LedgerSummary } from '../services/api/dailyLedger';
import toast, { Toaster } from 'react-hot-toast';

const DailyLedgerPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgers, setLedgers] = useState<DailyLedger[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // 수불부 데이터 조회
  useEffect(() => {
    fetchLedgers();
    fetchSummary();
  }, [selectedDate]);

  const fetchLedgers = async () => {
    setIsLoading(true);
    try {
      const response = await dailyLedgerAPI.getAll({ ledger_date: selectedDate });
      setLedgers(response.data);
    } catch (error) {
      console.error('수불부 조회 실패:', error);
      toast.error('수불부 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await dailyLedgerAPI.getSummary(selectedDate);
      setSummary(response.data);
    } catch (error) {
      console.error('요약 조회 실패:', error);
    }
  };

  // 수불부 생성
  const generateLedger = async () => {
    setIsGenerating(true);
    try {
      const response = await dailyLedgerAPI.generate(selectedDate);
      toast.success(response.data.message);
      
      // 데이터 새로고침
      fetchLedgers();
      fetchSummary();
    } catch (error) {
      console.error('수불부 생성 실패:', error);
      toast.error('수불부 생성에 실패했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

  // CSV 다운로드
  const downloadCSV = () => {
    if (ledgers.length === 0) {
      toast.error('다운로드할 데이터가 없습니다');
      return;
    }

    const headers = ['제품코드', '제품명', '기초재고', '입고', '출고', '조정', '기말재고', '단위'];
    const rows = ledgers.map(ledger => [
      ledger.product?.product_code || '',
      ledger.product?.product_name || '',
      ledger.beginning_stock,
      ledger.total_inbound,
      ledger.total_outbound,
      ledger.adjustments,
      ledger.ending_stock,
      ledger.product?.unit || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `수불부_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('CSV 파일 다운로드 완료');
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">일일 수불부</h1>
        <p className="mt-2 text-gray-600">일자별 재고 수불 현황을 관리합니다</p>
      </div>

      {/* 날짜 선택 및 액션 버튼 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={generateLedger}
              disabled={isGenerating}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isGenerating
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="inline h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="inline h-4 w-4 mr-2" />
                  수불부 생성
                </>
              )}
            </button>
            
            <button
              onClick={downloadCSV}
              disabled={ledgers.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                ledgers.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Download className="inline h-4 w-4 mr-2" />
              CSV 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 제품 수</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_products}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 입고</p>
                <p className="text-2xl font-bold text-green-600">{summary.total_inbound}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 출고</p>
                <p className="text-2xl font-bold text-red-600">{summary.total_outbound}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 조정</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_adjustments}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-gray-500 opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* 수불부 테이블 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedDate} 수불부 내역
          </h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        ) : ledgers.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">해당 날짜의 수불부가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">상단의 '수불부 생성' 버튼을 눌러 생성하세요</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제품코드</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">제품명</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">기초재고</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">입고</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">출고</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">조정</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">기말재고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ledgers.map((ledger) => {
                  const stockChange = ledger.ending_stock - ledger.beginning_stock;
                  
                  return (
                    <tr key={ledger.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {ledger.product?.product_code || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {ledger.product?.product_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-900">
                        {ledger.beginning_stock}
                        <span className="text-xs text-gray-500 ml-1">
                          {ledger.product?.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {ledger.total_inbound > 0 ? (
                          <span className="text-green-600 font-medium">
                            +{ledger.total_inbound}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {ledger.total_outbound > 0 ? (
                          <span className="text-red-600 font-medium">
                            -{ledger.total_outbound}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        {ledger.adjustments !== 0 ? (
                          <span className={ledger.adjustments > 0 ? 'text-blue-600' : 'text-orange-600'}>
                            {ledger.adjustments > 0 ? '+' : ''}{ledger.adjustments}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-medium text-gray-900">
                            {ledger.ending_stock}
                            <span className="text-xs text-gray-500 ml-1">
                              {ledger.product?.unit}
                            </span>
                          </span>
                          {stockChange !== 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              stockChange > 0 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {stockChange > 0 ? '+' : ''}{stockChange}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyLedgerPage;