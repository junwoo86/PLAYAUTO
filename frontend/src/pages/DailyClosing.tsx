import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, Download, CheckCircle, AlertTriangle, 
  FileText, Clock, TrendingUp, TrendingDown, Settings,
  RefreshCw, Save, X, ArrowRight, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Alert,
  DataTable,
  StatsCard,
  SelectField,
  TextField
} from '../components';
import { dailyLedgerAPI, DailyLedger } from '../services/api/dailyLedger';
import { productAPI } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../App';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';

interface DailyLedgerItem {
  productId: string;
  productCode: string;
  productName: string;
  openingStock: number;
  inbound: number;
  outbound: number;
  adjustment: number;
  closingStock: number;
  systemStock: number;
  discrepancy: number;
  status: 'matched' | 'discrepancy' | 'warning';
}

interface ClosingStatus {
  date: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  totalItems: number;
  matchedItems: number;
  discrepancyItems: number;
  totalDiscrepancyValue: number;
}

function DailyClosing() {
  const { showError, showSuccess, showWarning, showInfo } = useToast();
  const { setActivePage } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgers, setLedgers] = useState<DailyLedger[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [closingStatus, setClosingStatus] = useState<ClosingStatus>({
    date: new Date(),
    status: 'pending',
    totalItems: 0,
    matchedItems: 0,
    discrepancyItems: 0,
    totalDiscrepancyValue: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('excel');

  // 데이터 로드
  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ledgersResponse, productsResponse] = await Promise.all([
        dailyLedgerAPI.getAll({ ledger_date: selectedDate }),
        productAPI.getAll()
      ]);
      setLedgers(ledgersResponse.data || []);
      setProducts(productsResponse.data || []);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      showError('데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 수불부 생성
  const generateLedger = async () => {
    setIsLoading(true);
    try {
      const response = await dailyLedgerAPI.generate(selectedDate);
      showSuccess(response.data.message);
      await fetchData(); // 데이터 새로고침
    } catch (error) {
      console.error('수불부 생성 실패:', error);
      showError('수불부 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 일일 수불부 데이터 변환
  const dailyLedgerData: DailyLedgerItem[] = useMemo(() => {
    return ledgers.map(ledger => {
      const discrepancy = ledger.ending_stock - (ledger.product ? products.find(p => p.id === ledger.product_id)?.current_stock || ledger.ending_stock : ledger.ending_stock);
      
      return {
        productId: ledger.product_id,
        productCode: ledger.product?.product_code || '',
        productName: ledger.product?.product_name || '알 수 없는 제품',
        openingStock: ledger.beginning_stock,
        inbound: ledger.total_inbound,
        outbound: ledger.total_outbound,
        adjustment: ledger.adjustments,
        closingStock: ledger.ending_stock,
        systemStock: ledger.product ? products.find(p => p.id === ledger.product_id)?.current_stock || ledger.ending_stock : ledger.ending_stock,
        discrepancy,
        status: discrepancy === 0 ? 'matched' : 
                Math.abs(discrepancy) > 10 ? 'discrepancy' : 'warning'
      };
    });
  }, [ledgers, products]);

  // 통계 계산
  const statistics = useMemo(() => {
    const totalInbound = dailyLedgerData.reduce((sum, item) => sum + item.inbound, 0);
    const totalOutbound = dailyLedgerData.reduce((sum, item) => sum + item.outbound, 0);
    const totalAdjustment = dailyLedgerData.reduce((sum, item) => sum + Math.abs(item.adjustment), 0);
    const totalDiscrepancy = dailyLedgerData.filter(item => item.discrepancy !== 0).length;
    const accuracyRate = dailyLedgerData.length > 0 ? ((dailyLedgerData.length - totalDiscrepancy) / dailyLedgerData.length * 100).toFixed(1) : '100.0';
    
    return {
      totalInbound,
      totalOutbound,
      totalAdjustment,
      totalDiscrepancy,
      accuracyRate,
      totalTransactions: totalInbound + totalOutbound + totalAdjustment
    };
  }, [dailyLedgerData]);

  // 마감 처리
  const handleClosing = async () => {
    setIsProcessing(true);
    setClosingStatus({
      ...closingStatus,
      status: 'in_progress',
      totalItems: dailyLedgerData.length,
      matchedItems: dailyLedgerData.filter(d => d.status === 'matched').length,
      discrepancyItems: dailyLedgerData.filter(d => d.status !== 'matched').length,
      totalDiscrepancyValue: dailyLedgerData.reduce((sum, d) => sum + Math.abs(d.discrepancy), 0)
    });

    // 실제 마감 처리 시뮬레이션
    setTimeout(() => {
      setClosingStatus(prev => ({
        ...prev,
        status: 'completed'
      }));
      setIsProcessing(false);
      setShowConfirmModal(false);
      showSuccess('일일 마감이 완료되었습니다.');
    }, 2000);
  };

  // 수불부 다운로드
  const handleExport = (format: 'pdf' | 'excel') => {
    const fileName = `수불부_${selectedDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    console.log(`Exporting ${fileName}...`);
    
    // 실제 다운로드 로직 구현
    if (format === 'excel') {
      // CSV 형식으로 간단히 구현
      const headers = ['상품코드', '상품명', '기초재고', '입고', '출고', '조정', '마감재고', '시스템재고', '차이'];
      const rows = dailyLedgerData.map(item => [
        item.productCode,
        item.productName,
        item.openingStock,
        item.inbound,
        item.outbound,
        item.adjustment,
        item.closingStock,
        item.systemStock,
        item.discrepancy
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName.replace('.xlsx', '.csv');
      link.click();
    } else {
      showWarning('PDF 다운로드 기능은 추가 구현이 필요합니다.');
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    { 
      key: 'status', 
      header: '상태',
      render: (value: string) => {
        const icons = {
          matched: <CheckCircle className="text-green-500" size={20} />,
          discrepancy: <AlertTriangle className="text-red-500" size={20} />,
          warning: <AlertTriangle className="text-yellow-500" size={20} />
        };
        return icons[value as keyof typeof icons];
      }
    },
    { key: 'productCode', header: '상품코드' },
    { key: 'productName', header: '상품명' },
    { 
      key: 'openingStock', 
      header: '기초재고',
      align: 'right' as const,
      render: (value: number) => value.toLocaleString()
    },
    { 
      key: 'inbound', 
      header: '입고',
      align: 'right' as const,
      render: (value: number) => value > 0 ? (
        <span className="text-green-600 font-medium">+{value.toLocaleString()}</span>
      ) : '-'
    },
    { 
      key: 'outbound', 
      header: '출고',
      align: 'right' as const,
      render: (value: number) => value > 0 ? (
        <span className="text-red-600 font-medium">-{value.toLocaleString()}</span>
      ) : '-'
    },
    { 
      key: 'adjustment', 
      header: '조정',
      align: 'right' as const,
      render: (value: number) => value !== 0 ? (
        <span className={`font-medium ${value > 0 ? 'text-blue-600' : 'text-orange-600'}`}>
          {value > 0 ? '+' : ''}{value.toLocaleString()}
        </span>
      ) : '-'
    },
    { 
      key: 'closingStock', 
      header: '마감재고',
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-bold">{value.toLocaleString()}</span>
      )
    },
    { 
      key: 'systemStock', 
      header: '시스템재고',
      align: 'right' as const,
      render: (value: number) => value.toLocaleString()
    },
    { 
      key: 'discrepancy', 
      header: '차이',
      align: 'right' as const,
      render: (value: number, row: DailyLedgerItem) => value !== 0 ? (
        <span className={`font-bold ${row.status === 'discrepancy' ? 'text-red-600' : 'text-yellow-600'}`}>
          {value > 0 ? '+' : ''}{value.toLocaleString()}
        </span>
      ) : (
        <span className="text-green-600">일치</span>
      )
    }
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="일일 수불부"
        icon={FileText}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={() => {
                fetchData();
                showInfo('데이터가 새로고침되었습니다.');
              }}
              disabled={isLoading}
            >
              {isLoading ? '로딩 중...' : '새로고침'}
            </Button>
            <Button
              variant="outline"
              icon={FileText}
              onClick={generateLedger}
              disabled={isLoading}
            >
              수불부 생성
            </Button>
            <Button
              icon={Download}
              onClick={() => setShowExportModal(true)}
            >
              다운로드
            </Button>
          </div>
        }
      />

      {/* 날짜 선택 및 상태 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-500" />
              <div className="w-48">
                <TextField
                  label="날짜 선택"
                  name="selectedDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            {/* 마감 상태 표시 */}
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              {closingStatus.status === 'completed' ? (
                <>
                  <CheckCircle className="text-green-500" size={20} />
                  <span className="text-sm font-medium text-green-700">마감 완료</span>
                </>
              ) : closingStatus.status === 'in_progress' ? (
                <>
                  <Clock className="text-blue-500 animate-spin" size={20} />
                  <span className="text-sm font-medium text-blue-700">마감 처리 중...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="text-yellow-500" size={20} />
                  <span className="text-sm font-medium text-yellow-700">미마감</span>
                </>
              )}
            </div>
          </div>

          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={isProcessing || closingStatus.status === 'completed'}
            icon={Save}
          >
            일일 마감
          </Button>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatsCard
          title="총 거래"
          value={statistics.totalTransactions.toString()}
          icon={FileText}
          color="blue"
        />
        <StatsCard
          title="입고"
          value={statistics.totalInbound.toLocaleString()}
          icon={TrendingDown}
          color="green"
        />
        <StatsCard
          title="출고"
          value={statistics.totalOutbound.toLocaleString()}
          icon={TrendingUp}
          color="red"
        />
        <StatsCard
          title="조정"
          value={statistics.totalAdjustment.toLocaleString()}
          icon={Settings}
          color="orange"
        />
        <StatsCard
          title="정확도"
          value={`${statistics.accuracyRate}%`}
          icon={CheckCircle}
          color="teal"
          subStats={[
            { label: '불일치', value: `${statistics.totalDiscrepancy}건` }
          ]}
        />
      </div>

      {/* 빈 데이터 알림 */}
      {dailyLedgerData.length === 0 && !isLoading && (
        <Alert
          type="warning"
          title="수불부 데이터 없음"
          message="해당 날짜의 수불부가 생성되지 않았습니다. '수불부 생성' 버튼을 클릭해주세요."
          className="mb-6"
        />
      )}

      {/* 불일치 알림 */}
      {statistics.totalDiscrepancy > 0 && (
        <Alert
          type="warning"
          title="재고 불일치 발견"
          message={`${statistics.totalDiscrepancy}개 품목에서 시스템 재고와 계산 재고가 일치하지 않습니다. 확인이 필요합니다.`}
          className="mb-6"
        />
      )}

      {/* 수불부 테이블 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">일일 수불부 상세</h3>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(selectedDate).toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })} 거래 내역
          </p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        ) : dailyLedgerData.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">해당 날짜의 수불부가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">상단의 '수불부 생성' 버튼을 눌러 생성하세요</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={dailyLedgerData}
          />
        )}
      </div>

      {/* 마감 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">일일 마감 확인</h2>
            
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">마감일</p>
                <p className="font-medium">
                  {new Date(selectedDate).toLocaleDateString('ko-KR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">처리 항목</p>
                <div className="mt-1 space-y-1">
                  <p className="text-sm">• 총 {dailyLedgerData.length}개 품목</p>
                  <p className="text-sm">• {statistics.totalTransactions}건 거래</p>
                  {statistics.totalDiscrepancy > 0 && (
                    <p className="text-sm text-red-600">• {statistics.totalDiscrepancy}건 불일치</p>
                  )}
                </div>
              </div>


              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>주의:</strong> 마감 후에는 해당 일자의 거래를 수정할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleClosing}
                disabled={isProcessing}
                icon={isProcessing ? RefreshCw : CheckCircle}
              >
                {isProcessing ? '처리 중...' : '마감 처리'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 다운로드 옵션 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">다운로드 형식 선택</h3>
            
            <div className="space-y-2 mb-6">
              <button
                className={`w-full p-3 border rounded-lg text-left hover:bg-gray-50 ${
                  exportFormat === 'excel' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => setExportFormat('excel')}
              >
                <p className="font-medium">Excel (.xlsx)</p>
                <p className="text-sm text-gray-500">데이터 분석용</p>
              </button>
              
              <button
                className={`w-full p-3 border rounded-lg text-left hover:bg-gray-50 ${
                  exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onClick={() => setExportFormat('pdf')}
              >
                <p className="font-medium">PDF</p>
                <p className="text-sm text-gray-500">인쇄 및 보관용</p>
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
              >
                취소
              </Button>
              <Button
                onClick={() => {
                  handleExport(exportFormat);
                  setShowExportModal(false);
                }}
                icon={Download}
              >
                다운로드
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyClosing;