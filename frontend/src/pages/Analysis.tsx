import React, { useState, useMemo, useCallback } from 'react';
import { 
  BarChart3, TrendingUp, Package, DollarSign, AlertTriangle,
  FileText, Download, TrendingDown, CheckCircle, Plus,
  Calendar, Mail, Clock, Settings, PieChart, LineChart,
  Table, Filter, Send, Save, Trash2
} from 'lucide-react';
import {
  PageHeader,
  ChartCard,
  SimpleBarChart,
  StatsCard,
  SelectField,
  TextField,
  Button,
  DataTable,
  Alert
} from '../components';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

interface AnalysisProps {
  type: string;
}

interface CustomReport {
  id: string;
  name: string;
  widgets: ReportWidget[];
  schedule?: ReportSchedule;
  recipients?: string[];
  createdAt: Date;
  lastModified: Date;
}

interface ReportWidget {
  id: string;
  type: 'chart' | 'table' | 'stat' | 'text';
  title: string;
  dataSource: string;
  filters?: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
}

interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  enabled: boolean;
}

function Analysis({ type }: AnalysisProps) {
  const { transactions, products, getAdjustmentAnalysis } = useData();
  const { showError, showSuccess, showWarning } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CustomReport | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newReport, setNewReport] = useState<Partial<CustomReport>>({
    name: '',
    widgets: [],
    recipients: []
  });
  const [schedule, setSchedule] = useState<ReportSchedule>({
    frequency: 'weekly',
    time: '09:00',
    dayOfWeek: 1,
    enabled: true
  });
  
  const titles: Record<string, string> = {
    'analysis-summary': '입출고 요약',
    'past-quantity': '과거 수량 조회',
    'analysis-dashboard': '분석 대시보드',
    'inventory-analysis': '재고 분석',
    'sales-analysis': '매출 분석',
    'data-management': '데이터 관리',
    'adjustment-analysis': '조정 이력 분석'
  };

  // 조정 거래만 필터링 - 메모이제이션 적용
  const adjustmentTransactions = useMemo(() => 
    transactions.filter(t => t.type === 'adjustment'),
    [transactions]
  );
  
  const analysis = useMemo(() => 
    getAdjustmentAnalysis(selectedPeriod as 'week' | 'month'),
    [getAdjustmentAnalysis, selectedPeriod]
  );
  
  // 차트 데이터 메모이제이션
  const chartData = useMemo(() => {
    // 입출고 트렌드 데이터
    const inboundData = transactions
      .filter(t => t.type === 'inbound')
      .reduce((acc, t) => {
        const month = new Date(t.date).getMonth();
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
    const outboundData = transactions
      .filter(t => t.type === 'outbound')
      .reduce((acc, t) => {
        const month = new Date(t.date).getMonth();
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
    return {
      inbound: Object.values(inboundData),
      outbound: Object.values(outboundData)
    };
  }, [transactions]);

  // 리포트 저장 함수 - useCallback으로 최적화
  const saveCustomReport = useCallback(() => {
    if (!newReport.name || newReport.widgets?.length === 0) {
      showError('리포트 이름과 최소 1개의 위젯을 추가해주세요.');
      return;
    }
    
    const report: CustomReport = {
      id: Date.now().toString(),
      name: newReport.name,
      widgets: newReport.widgets || [],
      recipients: newReport.recipients,
      schedule: schedule,
      createdAt: new Date(),
      lastModified: new Date()
    };
    
    setCustomReports([...customReports, report]);
    setShowReportBuilder(false);
    setNewReport({ name: '', widgets: [], recipients: [] });
  }, [newReport, schedule, customReports]);
  
  const renderContent = () => {
    switch(type) {
      case 'analysis-dashboard':
        return (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="월 평균 재고"
                value="1,850"
                icon={Package}
                color="blue"
              />
              <StatsCard
                title="재고 회전율"
                value="4.2"
                icon={TrendingUp}
                color="green"
              />
              <StatsCard
                title="재고 보유 일수"
                value="87일"
                icon={BarChart3}
                color="purple"
              />
              <StatsCard
                title="재고 가치"
                value="₩45,200,000"
                icon={DollarSign}
                color="yellow"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <ChartCard
                title="월별 재고 추이"
                value="평균 1,850개"
                color="blue"
              >
                <SimpleBarChart
                  data={[
                    { label: '1월', value: 1500 },
                    { label: '2월', value: 1800 },
                    { label: '3월', value: 2000 },
                    { label: '4월', value: 1900 },
                    { label: '5월', value: 2100 }
                  ]}
                />
              </ChartCard>

              <ChartCard
                title="카테고리별 재고 분포"
                value="5개 카테고리"
                color="green"
              >
                <SimpleBarChart
                  data={[
                    { label: '영양제', value: 800 },
                    { label: '건강식품', value: 600 },
                    { label: '의료기기', value: 400 },
                    { label: '화장품', value: 300 },
                    { label: '기타', value: 100 }
                  ]}
                />
              </ChartCard>
            </div>
          </>
        );

      case 'inventory-analysis':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <SelectField
                label="분석 기간"
                name="period"
                options={[
                  { value: 'week', label: '최근 1주' },
                  { value: 'month', label: '최근 1개월' },
                  { value: 'quarter', label: '최근 3개월' },
                  { value: 'year', label: '최근 1년' }
                ]}
                onChange={() => {}}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <ChartCard
                title="ABC 분석"
                value="A등급 20%"
                color="blue"
              >
                <SimpleBarChart
                  data={[
                    { label: 'A등급', value: 20 },
                    { label: 'B등급', value: 30 },
                    { label: 'C등급', value: 50 }
                  ]}
                />
              </ChartCard>

              <ChartCard
                title="재고 부족 예상"
                value="5개 품목"
                color="red"
              >
                <div className="text-sm text-gray-600 mt-2">
                  <p>• 바이오밸런스 (3일 내)</p>
                  <p>• 오메가3 (5일 내)</p>
                  <p>• 비타민C (7일 내)</p>
                </div>
              </ChartCard>

              <ChartCard
                title="과잉 재고"
                value="3개 품목"
                color="yellow"
              >
                <div className="text-sm text-gray-600 mt-2">
                  <p>• 프로틴파우더 (재고일수 120일)</p>
                  <p>• 콜라겐 (재고일수 95일)</p>
                  <p>• 유산균 (재고일수 88일)</p>
                </div>
              </ChartCard>
            </div>
          </div>
        );

      case 'adjustment-analysis':
        return (
          <>
            {/* 기간 선택 및 액션 버튼 */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <SelectField
                    label=""
                    name="period"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    options={[
                      { value: 'week', label: '주간' },
                      { value: 'month', label: '월간' },
                      { value: 'quarter', label: '분기' },
                      { value: 'year', label: '연간' }
                    ]}
                  />
                  <SelectField
                    label=""
                    name="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    options={[
                      { value: 'all', label: '전체 카테고리' },
                      { value: '영양제', label: '영양제' },
                      { value: '건강식품', label: '건강식품' },
                      { value: '의료기기', label: '의료기기' }
                    ]}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    icon={Plus}
                    onClick={() => setShowReportBuilder(true)}
                  >
                    리포트 빌더
                  </Button>
                  <Button 
                    variant="outline" 
                    icon={Clock}
                    onClick={() => setShowScheduleModal(true)}
                  >
                    스케줄 설정
                  </Button>
                  <Button variant="outline" icon={Download}>
                    보고서 다운로드
                  </Button>
                  <Button variant="outline" icon={FileText}>
                    PDF 내보내기
                  </Button>
                </div>
              </div>
            </div>

            {/* 핵심 지표 카드 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="총 조정 건수"
                value={`${analysis.totalAdjustments}건`}
                icon={AlertTriangle}
                color="orange"
                trend={{
                  value: -15,
                  label: '전월 대비'
                }}
              />
              <StatsCard
                title="조정 손실액"
                value={`₩${analysis.totalLossAmount.toLocaleString('ko-KR')}`}
                icon={TrendingDown}
                color="red"
                trend={{
                  value: -Math.round(analysis.totalLossAmount * 0.1),
                  label: '전월 대비'
                }}
              />
              <StatsCard
                title="재고 정확도"
                value={`${analysis.accuracyRate}%`}
                icon={CheckCircle}
                color="green"
                trend={{
                  value: 1.5,
                  label: '개선율'
                }}
              />
              <StatsCard
                title="평균 조정률"
                value="2.3%"
                icon={BarChart3}
                color="blue"
                subStats={[
                  { label: '목표', value: '< 2%' }
                ]}
              />
            </div>

            {/* 조정 사유 분석 차트 */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <ChartCard
                title="조정 사유별 분포"
                value={`${analysis.totalAdjustments}건`}
                subtitle="이번 달 총 조정"
                color="purple"
              >
                <div className="space-y-3 mt-4">
                  {Object.entries(analysis.reasonBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .map(([reason, percentage]) => (
                      <div key={reason} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{reason}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
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

              <ChartCard
                title="정확도 추이"
                value={`${analysis.accuracyRate}%`}
                subtitle="현재 정확도"
                color="teal"
                trend={{
                  value: 2.0,
                  type: 'increase'
                }}
              >
                <SimpleBarChart
                  data={analysis.accuracyTrend.map(item => ({
                    label: item.date.split('-')[1],
                    value: item.rate
                  }))}
                />
              </ChartCard>
            </div>

            {/* 문제 품목 테이블 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h3 className="font-semibold">빈번한 조정 품목 TOP 10</h3>
                <p className="text-sm text-gray-500">반복적으로 조정이 발생하는 품목</p>
              </div>
              <DataTable
                columns={[
                  { 
                    key: 'rank',
                    header: '순위',
                    render: (_: any, __: any, index: number) => (
                      <span className={`font-bold ${index < 3 ? 'text-red-500' : 'text-gray-500'}`}>
                        #{index + 1}
                      </span>
                    )
                  },
                  { key: 'productName', header: '제품명' },
                  { 
                    key: 'adjustmentCount', 
                    header: '조정 횟수',
                    align: 'center' as const,
                    render: (value: number) => (
                      <span className="font-medium">{value}회</span>
                    )
                  },
                  { 
                    key: 'totalQuantity', 
                    header: '총 조정량',
                    align: 'center' as const,
                    render: (value: number) => (
                      <span className={`font-bold ${value < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {value > 0 ? '+' : ''}{value}개
                      </span>
                    )
                  },
                  {
                    key: 'lossAmount',
                    header: '손실액',
                    align: 'right' as const,
                    render: (value: number) => (
                      <span className="text-red-600">
                        ₩{Math.abs(value || 0).toLocaleString('ko-KR')}
                      </span>
                    )
                  },
                  {
                    key: 'actions',
                    header: '조치',
                    align: 'center' as const,
                    render: () => (
                      <Button size="sm" variant="outline">
                        상세보기
                      </Button>
                    )
                  }
                ]}
                data={analysis.topAdjustedProducts.map((p, idx) => ({
                  ...p,
                  rank: idx + 1,
                  lossAmount: Math.abs(p.totalQuantity) * 35000
                }))}
              />
            </div>

            {/* 개선 제안 */}
            <div className="mt-6 bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                AI 개선 제안
              </h3>
              <div className="space-y-2">
                <Alert
                  type="info"
                  message="'비타민C' 제품의 조정이 3회 이상 발생했습니다. 안전재고 수준을 현재 50개에서 80개로 상향 조정을 권장합니다."
                />
                <Alert
                  type="info"
                  message="오후 2-4시 사이 조정 빈도가 높습니다. 해당 시간대 재고 관리 프로세스 점검이 필요합니다."
                />
                <Alert
                  type="info"
                  message="'실사 차이' 사유가 45%를 차지합니다. 주간 실사 주기를 일일 실사로 변경하면 정확도를 2% 개선할 수 있습니다."
                />
              </div>
            </div>
          </>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-center py-8">
              {titles[type]} 기능을 준비 중입니다.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title={titles[type] || '분석'}
        icon={BarChart3}
      />
      {renderContent()}
      
      {/* 커스텀 리포트 빌더 모달 */}
      {showReportBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">커스텀 리포트 빌더</h2>
              <button 
                onClick={() => setShowReportBuilder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-6">
              {/* 위젯 선택 패널 */}
              <div className="border-r pr-6">
                <h3 className="font-semibold mb-4">위젯 선택</h3>
                <div className="space-y-3">
                  <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3">
                    <BarChart3 className="text-blue-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">막대 차트</p>
                      <p className="text-xs text-gray-500">데이터를 막대로 시각화</p>
                    </div>
                  </button>
                  <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3">
                    <LineChart className="text-green-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">라인 차트</p>
                      <p className="text-xs text-gray-500">추이 분석용 차트</p>
                    </div>
                  </button>
                  <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3">
                    <PieChart className="text-purple-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">파이 차트</p>
                      <p className="text-xs text-gray-500">비율 분석용 차트</p>
                    </div>
                  </button>
                  <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3">
                    <Table className="text-orange-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">데이터 테이블</p>
                      <p className="text-xs text-gray-500">상세 데이터 표시</p>
                    </div>
                  </button>
                  <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center gap-3">
                    <FileText className="text-gray-500" size={20} />
                    <div className="text-left">
                      <p className="font-medium">텍스트 블록</p>
                      <p className="text-xs text-gray-500">설명 텍스트 추가</p>
                    </div>
                  </button>
                </div>
              </div>
              
              {/* 리포트 미리보기 */}
              <div className="col-span-2">
                <div className="mb-4">
                  <TextField
                    label="리포트 이름"
                    name="reportName"
                    placeholder="리포트 이름을 입력하세요"
                    value={newReport.name}
                    onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  />
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[400px]">
                  {newReport.widgets?.length === 0 ? (
                    <div className="text-center text-gray-400">
                      <Plus size={48} className="mx-auto mb-4" />
                      <p>왼쪽에서 위젯을 선택하여 추가하세요</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {/* 위젯 렌더링 */}
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowReportBuilder(false)}>
                    취소
                  </Button>
                  <Button icon={Save}>
                    리포트 저장
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 스케줄 설정 모달 */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">리포트 스케줄 설정</h2>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <SelectField
                label="리포트 선택"
                name="reportType"
                placeholder="리포트를 선택하세요"
                options={[
                  { value: "adjustment", label: "조정 이력 분석 리포트" },
                  { value: "inventory", label: "재고 현황 리포트" },
                  { value: "custom", label: "커스텀 리포트" }
                ]}
              />
              
              <SelectField
                label="전송 주기"
                name="frequency"
                value={schedule.frequency}
                onChange={(e) => setSchedule({ 
                  ...schedule, 
                  frequency: e.target.value as ReportSchedule['frequency']
                })}
                options={[
                  { value: "daily", label: "매일" },
                  { value: "weekly", label: "매주" },
                  { value: "monthly", label: "매월" }
                ]}
              />
              
              {schedule.frequency === 'weekly' && (
                <SelectField
                  label="요일 선택"
                  name="dayOfWeek"
                  value={schedule.dayOfWeek?.toString()}
                  onChange={(e) => setSchedule({ ...schedule, dayOfWeek: parseInt(e.target.value) })}
                  options={[
                    { value: "1", label: "월요일" },
                    { value: "2", label: "화요일" },
                    { value: "3", label: "수요일" },
                    { value: "4", label: "목요일" },
                    { value: "5", label: "금요일" }
                  ]}
                />
              )}
              
              <TextField
                label="전송 시간"
                name="time"
                type="time"
                value={schedule.time}
                onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
              />
              
              <TextField
                label="수신자 이메일"
                name="recipients"
                placeholder="이메일 주소를 입력하세요 (여러 개는 쉼표로 구분)"
                value={newReport.recipients?.join(', ')}
                onChange={(e) => setNewReport({ 
                  ...newReport, 
                  recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                })}
              />
              
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="enabled"
                  checked={schedule.enabled}
                  onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
                />
                <label htmlFor="enabled" className="text-sm">스케줄 활성화</label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
                취소
              </Button>
              <Button icon={Send}>
                스케줄 설정
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analysis;