import React, { useState, useEffect } from 'react';
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

function Dashboard() {
  const { excelUploads } = useData();
  const { setActivePage } = useAppContext();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // API에서 대시보드 데이터 가져오기
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await statisticsAPI.getDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
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
  const { today, inventory, weekly, monthly, pendingDiscrepancies = [] } = dashboardData;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

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
            onClick: () => setActivePage('batch-process')
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

      {/* 오늘의 거래 요약 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">오늘의 거래 요약</h3>
        <div className="grid grid-cols-4 gap-4">
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
          <MiniStatsCard
            label="엑셀 업로드"
            value={excelUploads.filter(u => {
              const uploadDate = new Date(u.uploadedAt);
              return uploadDate >= todayStart && uploadDate <= todayEnd;
            }).length.toString()}
            icon={FileSpreadsheet}
            trend="neutral"
            trendValue="오늘"
          />
        </div>
      </div>

      {/* KPI 지표 */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="재고 정확도"
          value={`${(inventory?.averageAccuracy || 0).toFixed(1)}%`}
          color="blue"
          icon={CheckCircle}
          trend={{
            value: (weekly?.accuracyRate || 0) - 96.5,
            label: '지난주 대비'
          }}
          subStats={[
            { label: '목표', value: '98%' },
            { label: '달성률', value: `${((inventory?.averageAccuracy || 0)/98*100).toFixed(0)}%` }
          ]}
        />
        
        <StatsCard
          title="재고실사 현황"
          value={pendingDiscrepancies.length > 0 ? `${pendingDiscrepancies.length}건` : '정상'}
          color={pendingDiscrepancies.length > 0 ? "orange" : "teal"}
          icon={pendingDiscrepancies.length > 0 ? AlertCircle : CheckCircle}
          trend={pendingDiscrepancies.length > 0 ? {
            value: pendingDiscrepancies.reduce((sum, item) => sum + Math.abs(item.discrepancy), 0),
            label: '총 불일치 수량'
          } : undefined}
          subStats={
            pendingDiscrepancies.length > 0 ? [
              { label: '미처리', value: `${pendingDiscrepancies.filter(d => !d.explanation).length}건` },
              { label: '대기중', value: `${pendingDiscrepancies.filter(d => d.explanation).length}건` }
            ] : [
              { label: '상태', value: '모두 처리됨' },
              { label: '마감', value: '가능' }
            ]
          }
          onClick={pendingDiscrepancies.length > 0 ? () => setActivePage('batch-process') : undefined}
        />
        
        <StatsCard
          title="월간 손실액"
          value={`₩${(monthly?.totalLossAmount || 0).toLocaleString('ko-KR')}`}
          color="red"
          icon={TrendingDown}
          subStats={[
            { label: '조정 건수', value: `${monthly?.totalAdjustments || 0}건` },
            { label: '평균 손실', value: `₩${(monthly?.averageLoss || 0).toLocaleString('ko-KR')}` }
          ]}
        />
        
        <StatsCard
          title="재고 총액"
          value={`₩${(inventory?.totalValue || 0).toLocaleString('ko-KR')}`}
          color="green"
          icon={BarChart3}
          subStats={[
            { label: '총 SKU', value: `${inventory?.totalProducts || 0}개` },
            { label: '평균 재고일수', value: '45일' }
          ]}
        />
      </div>

      {/* 주간 조정 통계 */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          주간 조정 분석
          <span className="text-sm text-gray-500 ml-2">최근 4주</span>
        </h3>
        <div className="grid grid-cols-2 gap-6">
          {/* 정확도 추이 */}
          <ChartCard
            title="재고 정확도 추이"
            value={`${weekly?.accuracyRate || 0}%`}
            subtitle="현재 정확도"
            color="teal"
            trend={{
              value: 1.0,
              type: 'increase'
            }}
          >
            <SimpleBarChart
              data={(weekly?.accuracyTrend || []).map((item: any) => ({
                label: item.date.split('-')[1],
                value: item.rate
              }))}
            />
          </ChartCard>

          {/* 조정 사유 분포 */}
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
        </div>
      </div>

      {/* 문제 품목 TOP 10 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          빈번한 조정 품목
          <span className="text-sm text-gray-500 ml-2">조정 횟수 기준</span>
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {(weekly?.topAdjustedProducts || []).slice(0, 6).map((product: any, idx: number) => (
            <div key={product.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${idx < 3 ? 'text-red-500' : 'text-gray-500'}`}>
                  #{idx + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{product.productName}</p>
                  <p className="text-sm text-gray-500">조정 {product.adjustmentCount}회</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-600">{product.totalQuantity}개</p>
                <p className="text-xs text-gray-500">총 조정량</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;