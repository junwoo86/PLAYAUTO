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
              { label: '총 손실액', value: `₩${Math.round(monthly?.totalLossAmount || 0).toLocaleString()}` },
              { label: '건당 평균', value: `₩${Math.round(monthly?.averageLoss || 0).toLocaleString()}` }
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

      {/* 주간 조정 분석 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          주간 조정 분석
          <span className="text-sm text-gray-500 ml-2">최근 4주</span>
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* 조정 사유 분포 - 왼쪽 */}
          <ChartCard
            title="조정 사유 TOP 5"
            value={`${monthly?.totalAdjustments || 0}건`}
            subtitle="이번 달 총 조정"
            color="purple"
          >
            <div className="space-y-2 mt-4">
              {Object.entries(weekly?.reasonBreakdown || {})
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([reason, percentage]) => (
                  <div key={reason} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{reason}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </ChartCard>

          {/* 주요 조정 품목 - 오른쪽 */}
          <ChartCard
            title="주요 조정 품목 TOP 5"
            value={`${(weekly?.topAdjustedProducts || []).length}개 품목`}
            subtitle="이번 달 기준"
            color="red"
          >
            <div className="space-y-3 mt-4">
              {(weekly?.topAdjustedProducts || []).slice(0, 5).map((product: any, idx: number) => (
                <div key={product.productId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-red-100 text-red-600' : 
                      idx === 1 ? 'bg-orange-100 text-orange-600' : 
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
                      <p className="text-xs text-gray-500">{product.adjustmentCount}회</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{product.totalQuantity}</p>
                    <p className="text-xs text-gray-500">조정량</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
});

export default Dashboard;