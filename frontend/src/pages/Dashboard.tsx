import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Package, AlertTriangle, 
  FileSpreadsheet, CheckCircle, Clock, BarChart3, AlertCircle 
} from 'lucide-react';
import {
  Alert,
  PageHeader,
  StatsCard,
  ChartCard,
  SimpleBarChart,
  MiniStatsCard
} from '../components';
import { useData } from '../contexts/DataContext';
import { useAppContext } from '../App';
import { statisticsAPI } from '../services/api';

const Dashboard = React.memo(() => {
  const { excelUploads } = useData();
  const { setActivePage } = useAppContext();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // API에서 대시보드 데이터 가져오기 - useCallback으로 최적화
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await statisticsAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const dateRange = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return { todayStart, todayEnd };
  }, []);
  
  const todayExcelUploads = useMemo(() => {
    return excelUploads.filter(u => {
      const uploadDate = new Date(u.uploadedAt);
      return uploadDate >= dateRange.todayStart && uploadDate <= dateRange.todayEnd;
    }).length;
  }, [excelUploads, dateRange]);
  
  const handleNavigateToBatchProcess = useCallback(() => {
    setActivePage('batch-process');
  }, [setActivePage]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  // 데이터 추출
  const { today, inventory, weekly, monthly, categoryOutboundTrend = {}, pendingDiscrepancies = [] } = dashboardData;

  return (
    <div className="p-8">
      {/* 미처리 불일치 알림 */}
      {pendingDiscrepancies.length > 0 && (
        <Alert
          type="warning"
          title="처리 대기 중인 불일치"
          message={`${pendingDiscrepancies.length}개 품목의 재고 불일치가 소명 대기 중입니다.`}
          action={{
            label: '지금 처리하기',
            onClick: handleNavigateToBatchProcess
          }}
          className="mb-6"
        />
      )}

      <PageHeader
        title="대시보드"
        subtitle={new Date().toLocaleDateString('ko-KR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          weekday: 'long'
        })}
        className="mb-8"
      />

      {/* 오늘의 거래 요약 - 간소화 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">오늘의 거래 요약</h3>
        <div className="grid grid-cols-3 gap-6 mb-6">
          <MiniStatsCard
            label="입고"
            value={(today?.inbound || 0).toLocaleString()}
            icon={Package}
            trend={today?.inbound > 0 ? 'up' : 'neutral'}
            trendValue={`${today?.inbound || 0}개`}
          />
          <MiniStatsCard
            label="출고"
            value={(today?.outbound || 0).toLocaleString()}
            icon={Package}
            trend={today?.outbound > 0 ? 'down' : 'neutral'}
            trendValue={`${today?.outbound || 0}개`}
          />
          <MiniStatsCard
            label="조정"
            value={(today?.adjustments || 0).toString()}
            icon={AlertTriangle}
            trend={today?.adjustments > 0 ? 'down' : 'neutral'}
            trendValue={`${today?.adjustments || 0}건`}
          />
        </div>

        {/* 핵심 KPI 지표 - 오늘의 거래 요약 섹션 내로 이동 */}
        <div className="grid grid-cols-3 gap-8">
          <StatsCard
            title="총 재고 가치(판매가 VAT포함)"
            value={`₩${Math.round(inventory?.totalSalesValue || 0).toLocaleString()}`}
            color="green"
            icon={BarChart3}
            subStats={[
              { label: '총 SKU', value: `${inventory?.totalProducts || 0}개` },
              { label: '부족 품목', value: `${inventory?.lowStockCount || 0}개` }
            ]}
            footer={
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                <div>$1 = ₩{inventory?.exchangeRate || 1300} 환산</div>
              </div>
            }
          />
          
          <StatsCard
            title="월간 조정 현황"
            value={`${monthly?.totalAdjustments || 0}건`}
            color="red"
            icon={TrendingDown}
            subStats={[
              { label: '총 손실액', value: `₩${Math.round(monthly?.totalLossAmount || 0).toLocaleString()}` }
            ]}
          />
          
          <StatsCard
            title="재고 정확도 및 실사 현황"
            value={`${Math.round((inventory?.averageAccuracy || 0) * 10) / 10}%`}
            color={pendingDiscrepancies.length > 0 ? "orange" : "blue"}
            icon={pendingDiscrepancies.length > 0 ? AlertCircle : CheckCircle}
            trend={{
              value: Math.round(((weekly?.accuracyRate || 0) - 96.5) * 10) / 10,
              label: '지난주 대비'
            }}
            subStats={
              pendingDiscrepancies.length > 0 ? [
                { label: '목표 98%', value: `${Math.round((inventory?.averageAccuracy || 0)/98*100)}%` },
                { label: '미처리 불일치', value: `${pendingDiscrepancies.length}건` }
              ] : [
                { label: '목표 달성률', value: `${Math.round((inventory?.averageAccuracy || 0)/98*100)}%` },
                { label: '실사 상태', value: '정상' }
              ]
            }
            onClick={pendingDiscrepancies.length > 0 ? handleNavigateToBatchProcess : undefined}
          />
        </div>
      </div>

      {/* 주요 카테고리 출고 추이 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          주요 카테고리 출고 추이
          <span className="text-sm text-gray-500 ml-2">최근 10주</span>
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* 검사권 */}
          <ChartCard
            title="검사권"
            value={`${((categoryOutboundTrend['검사권'] || []).reduce((sum: number, item: any) => sum + item.quantity, 0)).toLocaleString()}개`}
            subtitle="10주간 총 출고량"
            color="blue"
          >
            <SimpleBarChart
              data={(categoryOutboundTrend['검사권'] || []).map((item: any) => ({
                label: item.week,
                value: item.quantity
              }))}
            />
          </ChartCard>

          {/* 영양제 */}
          <ChartCard
            title="영양제"
            value={`${((categoryOutboundTrend['영양제'] || []).reduce((sum: number, item: any) => sum + item.quantity, 0)).toLocaleString()}개`}
            subtitle="10주간 총 출고량"
            color="green"
          >
            <SimpleBarChart
              data={(categoryOutboundTrend['영양제'] || []).map((item: any) => ({
                label: item.week,
                value: item.quantity
              }))}
            />
          </ChartCard>
        </div>
      </div>

      {/* 주요 카테고리 출고 분석 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          주요 카테고리 출고 분석
          <span className="text-sm text-gray-500 ml-2">최근 4주</span>
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* 검사권 출고 TOP 6 - 왼쪽 */}
          <ChartCard
            title="검사권 출고 TOP 6"
            value={`${(weekly?.testKitTop6 || []).reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString()}개`}
            subtitle="4주간 총 출고량"
            color="blue"
          >
            <div className="space-y-3 mt-4">
              {(weekly?.testKitTop6 || []).map((product: any, idx: number) => (
                <div key={product.productName} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-blue-100 text-blue-600' :
                      idx === 1 ? 'bg-sky-100 text-sky-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{product.quantity.toLocaleString()}개</p>
                  </div>
                </div>
              ))}
              {(!weekly?.testKitTop6 || weekly.testKitTop6.length === 0) && (
                <p className="text-center text-gray-500 text-sm py-4">출고 내역이 없습니다</p>
              )}
            </div>
          </ChartCard>

          {/* 영양제 출고 TOP 6 - 오른쪽 */}
          <ChartCard
            title="영양제 출고 TOP 6"
            value={`${(weekly?.supplementTop6 || []).reduce((sum: number, item: any) => sum + item.quantity, 0).toLocaleString()}개`}
            subtitle="4주간 총 출고량"
            color="green"
          >
            <div className="space-y-3 mt-4">
              {(weekly?.supplementTop6 || []).map((product: any, idx: number) => (
                <div key={product.productName} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-green-100 text-green-600' :
                      idx === 1 ? 'bg-emerald-100 text-emerald-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{product.quantity.toLocaleString()}개</p>
                  </div>
                </div>
              ))}
              {(!weekly?.supplementTop6 || weekly.supplementTop6.length === 0) && (
                <p className="text-center text-gray-500 text-sm py-4">출고 내역이 없습니다</p>
              )}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;