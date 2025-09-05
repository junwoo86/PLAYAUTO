import React, { useState, createContext, useContext } from 'react';
import { 
  Home, Package, Download, Upload, Settings, ArrowRightLeft, 
  History, ShoppingCart, Barcode, Plus, BarChart3,
  AlertCircle, ScanBarcode, FileSpreadsheet, Calendar,
  Search, Filter, ChevronLeft, ChevronRight, Link2, ClipboardCheck
} from 'lucide-react';

// 컴포넌트 라이브러리 임포트
import {
  Button,
  IconButton,
  StatsCard,
  MiniStatsCard,
  ChartCard,
  SimpleBarChart,
  TextField,
  SelectField,
  TextareaField,
  CheckboxField,
  RadioGroup,
  SearchBar,
  DataTable,
  TableColumn,
  PageHeader,
  TabHeader,
  SectionHeader,
  EmptyState,
  LoadingState,
  ErrorState,
  Alert,
  Toast,
  InlineAlert,
  Sidebar,
  Header,
  MenuItem
} from './components';

// Context for managing global state
const AppContext = createContext({
  activePage: 'dashboard',
  setActivePage: (page: string) => {}
});
const useAppContext = () => useContext(AppContext);

// Main App Component - 완전히 리팩토링된 버전
export default function InventoryManagementSystem() {
  const [activePage, setActivePage] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState(['purchase-sales', 'analysis']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // 메뉴 아이템 설정 - 컴포넌트 라이브러리 형식으로 변경
  const menuItems: MenuItem[] = [
    { id: 'dashboard', name: '대시보드', icon: Home },
    { id: 'products', name: '제품목록', icon: Package },
    { id: 'receive', name: '입고', icon: Download },
    { id: 'dispatch', name: '출고', icon: Upload },
    { id: 'adjustment', name: '조정', icon: Settings },
    { id: 'transfer', name: '이동', icon: ArrowRightLeft },
    { id: 'history', name: '히스토리', icon: History },
    { 
      id: 'purchase-sales',
      name: '구매 및 판매', 
      icon: ShoppingCart,
      submenu: [
        { id: 'purchase', name: '구매' },
        { id: 'sales', name: '판매' },
        { id: 'return', name: '반품' }
      ]
    },
    { 
      id: 'barcode',
      name: '바코드 인쇄', 
      icon: Barcode,
      submenu: [
        { id: 'barcode-product', name: '제품' },
        { id: 'barcode-bundle', name: '묶음제품' }
      ]
    },
    { 
      id: 'additional',
      name: '추가기능', 
      icon: Plus,
      submenu: [
        { id: 'stock-alert', name: '재고 부족 알림' },
        { id: 'stock-share', name: '재고 공유 링크' },
        { id: 'stock-survey', name: '재고 조사' }
      ]
    },
    { 
      id: 'analysis',
      name: '분석', 
      icon: BarChart3,
      submenu: [
        { id: 'analysis-summary', name: '입출고 요약' },
        { id: 'past-quantity', name: '과거 수량 조회' },
        { id: 'analysis-dashboard', name: '대시보드' },
        { id: 'inventory-analysis', name: '재고 분석' },
        { id: 'sales-analysis', name: '매출 분석' },
        { id: 'data-management', name: '데이터 관리' }
      ]
    },
    { 
      id: 'settings',
      name: '설정', 
      icon: Settings,
      submenu: [
        { id: 'settings-general', name: '일반' },
        { id: 'settings-users', name: '사용자' },
        { id: 'settings-notifications', name: '알림' }
      ]
    }
  ];

  return (
    <AppContext.Provider value={{ activePage, setActivePage }}>
      <div className="flex h-screen bg-gray-50">
        {/* 리팩토링된 사이드바 - 컴포넌트 라이브러리 사용 */}
        <Sidebar
          logo={{
            full: <h1 className="font-bold text-xl text-gray-800">바이오컴</h1>,
            collapsed: <h1 className="font-bold text-sm text-gray-800">BC</h1>
          }}
          menuItems={menuItems}
          activeItem={activePage}
          onItemClick={(item) => setActivePage(item.id)}
          collapsed={sidebarCollapsed}
          expandedMenus={expandedMenus}
          onToggleMenu={(menuId) => {
            setExpandedMenus(prev =>
              prev.includes(menuId)
                ? prev.filter(id => id !== menuId)
                : [...prev, menuId]
            );
          }}
          footer={<div className="text-xs text-gray-500">© 2025 Biocom</div>}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 리팩토링된 헤더 - 컴포넌트 라이브러리 사용 */}
          <Header
            title="바이오컴"
            user={{ name: '사용자' }}
            notifications={{ count: 0 }}
            onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            onHelpClick={() => {}}
            actions={<span className="text-gray-500">사용 가이드</span>}
          />
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <PageContent />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}

// 리팩토링된 Dashboard - 컴포넌트 라이브러리 사용
function Dashboard() {
  const statsData = [
    { 
      title: '총 재고', 
      value: '2,005', 
      color: 'blue' as const,
      subStats: [{ label: '어제 총 재고', value: '0' }]
    },
    { 
      title: '입고', 
      value: '0', 
      color: 'gray' as const,
      subStats: [{ label: '어제 입고', value: '0' }]
    },
    { 
      title: '출고', 
      value: '0', 
      color: 'gray' as const,
      subStats: [{ label: '어제 출고', value: '0' }]
    }
  ];

  const chartData = [
    { title: '재고 변동', value: '+2,005', color: 'teal' as const, hasData: true },
    { title: '입고 수', value: '0', color: 'gray' as const, hasData: false },
    { title: '출고 수', value: '0', color: 'gray' as const, hasData: false }
  ];

  return (
    <div className="p-8">
      {/* Alert 컴포넌트 사용 */}
      <Alert
        type="info"
        message="관리자 권한이 있는 경우 추가 리포트를 이메일로 받아볼 수 있습니다."
        action={{
          label: '알림 설정',
          onClick: () => {}
        }}
        className="mb-6"
      />

      {/* PageHeader 컴포넌트 사용 */}
      <PageHeader
        title="오늘"
        subtitle="2025-08-27"
        className="mb-8"
      />

      {/* StatsCard 컴포넌트 사용 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {statsData.map((stat, idx) => (
          <StatsCard key={idx} {...stat} />
        ))}
      </div>

      {/* ChartCard 컴포넌트 사용 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          최근 한 달 
          <span className="text-sm text-gray-500 ml-2">2025-07-29 ~ 2025-08-27</span>
        </h3>
        <div className="grid grid-cols-3 gap-6">
          {chartData.map((chart, idx) => (
            <ChartCard key={idx} {...chart}>
              {chart.hasData && (
                <SimpleBarChart
                  data={[
                    { label: '7/29', value: 20 },
                    { label: '8/5', value: 40 },
                    { label: '8/12', value: 60 },
                    { label: '8/19', value: 80 },
                    { label: '8/27', value: 100 }
                  ]}
                />
              )}
            </ChartCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// 리팩토링된 ProductList - 컴포넌트 라이브러리 사용
function ProductList() {
  const [searchValue, setSearchValue] = useState('');
  const [showOnlyWithStock, setShowOnlyWithStock] = useState(false);

  const products = [
    { id: '1', name: '바이오밸런스', category: '영양제 / 바이오컴', stock: 2005, totalStock: 2005 }
  ];

  const columns: TableColumn[] = [
    { key: 'name', header: '제품명' },
    { key: 'category', header: '카테고리' },
    { 
      key: 'stock', 
      header: '재고', 
      align: 'center',
      render: (value: number) => (
        <span className="text-2xl font-bold text-blue-600">{value.toLocaleString()}</span>
      )
    },
    { 
      key: 'totalStock', 
      header: '총 재고',
      align: 'center',
      render: (value: number) => `총 ${value.toLocaleString()}`
    }
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="제품목록"
        icon={Package}
        actions={
          <>
            <Button icon={Plus}>제품 추가</Button>
            <Button variant="outline" icon={FileSpreadsheet}>데이터 관리</Button>
          </>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <SelectField
              label=""
              name="location"
              options={[{ value: 'all', label: '모든 위치' }]}
              value="all"
              className="w-48"
            />
            <SearchBar
              placeholder="이름, 바코드, 속성 검색"
              value={searchValue}
              onChange={setSearchValue}
              className="flex-1"
            />
            <CheckboxField
              label="재고 보유"
              name="withStock"
              checked={showOnlyWithStock}
              onChange={(e) => setShowOnlyWithStock(e.target.checked)}
            />
          </div>
        </div>
        
        {products.length > 0 ? (
          <DataTable
            columns={columns}
            data={products}
          />
        ) : (
          <EmptyState
            icon={Package}
            title="제품이 없습니다"
            description="첫 제품을 추가해보세요"
            action={{
              label: '제품 추가',
              onClick: () => {},
              icon: Plus
            }}
          />
        )}
      </div>
    </div>
  );
}

// 리팩토링된 TransactionForm - 컴포넌트 라이브러리 사용
function TransactionForm({ type }: { type: string }) {
  const titles = {
    receive: '입고',
    dispatch: '출고',
    adjustment: '조정',
    transfer: '이동'
  };
  
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [memo, setMemo] = useState('');

  return (
    <div className="p-8">
      <PageHeader
        title={titles[type as keyof typeof titles]}
        icon={AlertCircle}
        actions={
          <button className="text-sm text-gray-600 hover:text-gray-800">초기화</button>
        }
      />
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Location Selection - 컴포넌트 라이브러리 사용 */}
          <div className="grid grid-cols-2 gap-4">
            {type === 'transfer' ? (
              <>
                <SelectField
                  label="출발 위치"
                  name="fromLocation"
                  required
                  options={[{ value: 'current', label: '현재 위치' }]}
                />
                <SelectField
                  label="도착 위치"
                  name="toLocation"
                  required
                  options={[{ value: 'new', label: '새 위치' }]}
                />
              </>
            ) : (
              <>
                <SelectField
                  label="위치"
                  name="location"
                  required
                  options={[{ value: 'default', label: '기본 위치' }]}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                {(type === 'receive' || type === 'dispatch') && (
                  <SelectField
                    label="거래처"
                    name="partner"
                    options={[{ value: '', label: '선택하세요' }]}
                  />
                )}
              </>
            )}
          </div>
          
          {/* Date Field - 컴포넌트 라이브러리 사용 */}
          <div className={type === 'transfer' ? 'w-1/2' : 'w-full'}>
            <TextField
              label="날짜"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              icon={Calendar}
            />
          </div>
          
          {/* Product List Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">제품 목록</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={Plus}>일괄 추가</Button>
                <Button size="sm" variant="outline" icon={FileSpreadsheet}>엑셀 가져오기</Button>
                <Button size="sm" variant="outline" icon={ScanBarcode}>바코드 스캔</Button>
              </div>
            </div>
            
            <EmptyState
              title="제품을 추가하세요"
              description="+ 제품 검색 버튼을 클릭하여 시작하세요"
              size="sm"
            />
          </div>
          
          {/* Memo - 컴포넌트 라이브러리 사용 */}
          <TextareaField
            label="메모 입력"
            name="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="TIP) #태그 입력 시 목록에서 '태그'로 검색할 수 있습니다."
            hint="파일을 끌어다 놓거나 붙여넣기로 첨부할 수 있습니다."
            rows={3}
          />
        </div>
        
        {/* Action Buttons - 컴포넌트 라이브러리 사용 */}
        <div className="flex justify-end gap-3 mt-8">
          {type !== 'adjustment' && (
            <Button variant="outline">임시 저장</Button>
          )}
          <Button>{titles[type as keyof typeof titles]} 완료</Button>
        </div>
      </div>
    </div>
  );
}

// 리팩토링된 HistoryPage - 컴포넌트 라이브러리 사용
function HistoryPage() {
  const historyData = [
    {
      id: '1',
      type: '조정',
      date: '2025-08-27 11:52',
      user: 'junwoo',
      items: '바이오밸런스',
      count: '1개 품목 / 5개',
      note: '조정 실사재고 5개 추가'
    },
    {
      id: '2',
      type: '조정',
      date: '2025-08-27 11:51',
      user: 'junwoo',
      items: '바이오밸런스',
      count: '1개 품목 / 75개',
      note: ''
    },
    {
      id: '3',
      type: '조정',
      date: '2025-08-27 11:50',
      user: 'junwoo',
      items: '바이오밸런스',
      count: '1개 품목 / 1,925개',
      note: '초기 수량'
    }
  ];

  const columns: TableColumn[] = [
    {
      key: 'type',
      header: '유형',
      render: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <ArrowRightLeft size={16} className="text-teal-600" />
          </div>
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    { key: 'date', header: '일시' },
    { key: 'user', header: '작업자' },
    { key: 'items', header: '품목' },
    { key: 'count', header: '수량' },
    { key: 'note', header: '메모' }
  ];

  return (
    <div className="p-8">
      <PageHeader
        title="히스토리"
        icon={History}
        actions={
          <Button variant="outline" icon={FileSpreadsheet}>엑셀 내보내기</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <SelectField
            label=""
            name="period"
            options={[
              { value: 'all', label: '전체 기간' },
              { value: 'today', label: '오늘' },
              { value: 'yesterday', label: '어제' },
              { value: 'week', label: '이번 주' },
              { value: 'month', label: '이번 달' }
            ]}
            value="all"
            className="w-48"
          />
          <Button variant="outline" icon={Plus}>필터 추가</Button>
        </div>
        
        <DataTable
          columns={columns}
          data={historyData}
        />
      </div>
    </div>
  );
}

// 리팩토링된 StockAlert - 컴포넌트 라이브러리 사용
function StockAlert() {
  return (
    <div className="p-8">
      <SectionHeader
        title="추가기능"
        className="mb-4"
      />
      
      <PageHeader
        title="재고 부족 알림"
        icon={AlertCircle}
        actions={
          <>
            <Button variant="outline">엑셀 내보내기</Button>
            <Button variant="outline">수량 설정</Button>
            <IconButton icon={Settings} label="설정" />
          </>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow p-8">
        <div className="mb-6 flex gap-4">
          <SelectField
            label=""
            name="location"
            options={[{ value: 'all', label: '전체 재고' }]}
            value="all"
            className="w-48"
          />
          <SearchBar
            placeholder="이름, 바코드, 속성 검색"
            className="flex-1"
          />
        </div>
        
        <EmptyState
          title="안전 재고를 설정하고 재고 부족 알림을 받아보세요"
          action={{
            label: '안전 재고 설정',
            onClick: () => {},
            icon: Plus
          }}
        />
      </div>
    </div>
  );
}

// 리팩토링된 StockShareLink - 컴포넌트 라이브러리 사용
function StockShareLink() {
  return (
    <div className="p-8">
      <SectionHeader
        title="추가기능"
        className="mb-4"
      />
      
      <PageHeader
        title="재고 공유 링크"
        icon={Link2}
        actions={
          <Button icon={Plus}>추가</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <EmptyState
          title="재고 정보를 안전하게 공유해 보세요"
          action={{
            label: '재고 공유 링크 생성',
            onClick: () => {},
            icon: Plus
          }}
        />
      </div>
    </div>
  );
}

// 리팩토링된 StockSurvey - 컴포넌트 라이브러리 사용
function StockSurvey() {
  const surveyData = [
    {
      id: '1',
      title: '2025-08-27 재고 조사',
      location: '기본 위치',
      status: '진행 중',
      items: '1개 품목',
      startDate: '2025-08-27'
    }
  ];

  const columns: TableColumn[] = [
    { key: 'title', header: '제목' },
    { key: 'location', header: '위치' },
    {
      key: 'status',
      header: '상태',
      render: (value) => (
        <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-sm">
          {value}
        </span>
      )
    },
    { key: 'items', header: '제품' },
    { key: 'startDate', header: '시작일' }
  ];

  return (
    <div className="p-8">
      <SectionHeader
        title="추가기능"
        className="mb-4"
      />
      
      <PageHeader
        title="재고 조사"
        icon={ClipboardCheck}
        actions={
          <Button icon={Plus}>추가</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={surveyData}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            pageSize: 100,
            totalItems: 1,
            onPageChange: () => {}
          }}
        />
      </div>
    </div>
  );
}

// 리팩토링된 AnalysisSummary - 컴포넌트 라이브러리 사용
function AnalysisSummary() {
  const [activeTab, setActiveTab] = useState('summary');
  
  const summaryData = [
    {
      id: '1',
      productName: '바이오밸런스',
      category: '영양제 / 바이오컴',
      inQuantity: 0,
      outQuantity: 0,
      adjustmentChange: 2005,
      moveChange: 0,
      totalStock: 2005
    }
  ];

  const columns: TableColumn[] = [
    {
      key: 'productName',
      header: '제품명 ↑',
      render: (value, row) => (
        <div>
          <div>{value}</div>
          <div className="text-sm text-gray-500">{row.category}</div>
        </div>
      )
    },
    { key: 'inQuantity', header: '입고량', align: 'center' },
    { key: 'outQuantity', header: '출고량', align: 'center' },
    {
      key: 'adjustmentChange',
      header: '조정 변동량',
      align: 'center',
      render: (value) => (
        <span className="text-green-600">+{value.toLocaleString()}</span>
      )
    },
    { key: 'moveChange', header: '이동 변동량', align: 'center' },
    {
      key: 'totalStock',
      header: '총량 재고',
      align: 'center',
      render: (value) => <span className="font-medium">{value.toLocaleString()}</span>
    }
  ];

  return (
    <div className="p-8">
      <SectionHeader
        title="분석"
        className="mb-4"
      />
      
      <PageHeader
        title="입출고 요약"
        icon={BarChart3}
        actions={
          <Button variant="outline">엑셀 내보내기</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <IconButton icon={ChevronLeft} label="이전" size="sm" />
            <span className="px-4 py-2 bg-gray-100 rounded">2025-07-28 - 2025-08-27</span>
            <IconButton icon={ChevronRight} label="다음" size="sm" />
          </div>
          <SearchBar
            placeholder="이름, 바코드, 속성 검색"
            className="flex-1"
          />
          <Button variant="outline" icon={Plus}>필터 추가</Button>
        </div>
        
        <TabHeader
          tabs={[
            { id: 'summary', label: '요약' },
            { id: 'daily', label: '날짜별' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <DataTable
          columns={columns}
          data={summaryData}
        />
      </div>
    </div>
  );
}

// 리팩토링된 DataManagement - 컴포넌트 라이브러리 사용
function DataManagement() {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  const productData = [
    {
      id: '1',
      name: '바이오밸런스',
      sku: 'SKU-E26V069R',
      barcode: '1234',
      purchasePrice: 0,
      sellingPrice: 38500
    }
  ];

  const columns: TableColumn[] = [
    { key: 'name', header: '제품명 ↑', sortable: true },
    { key: 'sku', header: 'SKU' },
    { key: 'barcode', header: '바코드' },
    {
      key: 'purchasePrice',
      header: '구매가',
      align: 'center',
      render: (value) => value.toLocaleString()
    },
    {
      key: 'sellingPrice',
      header: '판매가',
      align: 'center',
      render: (value) => `₩${value.toLocaleString()}`
    }
  ];

  return (
    <div className="p-8">
      <SectionHeader
        title="데이터 관리"
        className="mb-4"
      />
      
      <PageHeader
        title="제품"
        icon={Package}
        actions={
          <>
            <Button icon={Plus}>제품 추가</Button>
            <Button variant="outline">엑셀 가져오기</Button>
            <IconButton icon={Settings} label="설정" />
          </>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <SearchBar
            placeholder="이름, 바코드, 속성 검색"
            showBarcode
            className="flex-1"
          />
          <Button variant="outline">엑셀 내보내기</Button>
          <Button variant="outline">컬럼 설정</Button>
        </div>
        
        <DataTable
          columns={columns}
          data={productData}
          selectable
          selectedRows={selectedProducts}
          onSelectionChange={setSelectedProducts}
          pagination={{
            currentPage: 1,
            totalPages: 1,
            pageSize: 100,
            totalItems: 1,
            onPageChange: () => {}
          }}
        />
      </div>
    </div>
  );
}

// Page Content Router
function PageContent() {
  const { activePage } = useAppContext();
  
  switch(activePage) {
    case 'dashboard':
    case 'analysis-dashboard':
      return <Dashboard />;
    case 'products':
      return <ProductList />;
    case 'receive':
      return <TransactionForm type="receive" />;
    case 'dispatch':
      return <TransactionForm type="dispatch" />;
    case 'adjustment':
      return <TransactionForm type="adjustment" />;
    case 'transfer':
      return <TransactionForm type="transfer" />;
    case 'history':
      return <HistoryPage />;
    case 'purchase':
      return <PurchaseSalesPage type="purchase" />;
    case 'sales':
      return <PurchaseSalesPage type="sales" />;
    case 'return':
      return <ReturnPage />;
    case 'barcode-product':
    case 'barcode-bundle':
      return <BarcodePage type={activePage === 'barcode-product' ? 'product' : 'bundle'} />;
    case 'stock-alert':
      return <StockAlert />;
    case 'stock-share':
      return <StockShareLink />;
    case 'stock-survey':
      return <StockSurvey />;
    case 'analysis-summary':
      return <AnalysisSummary />;
    case 'past-quantity':
      return <PastQuantityPage />;
    case 'inventory-analysis':
      return <InventoryAnalysisPage />;
    case 'sales-analysis':
      return <SalesAnalysisPage />;
    case 'data-management':
      return <DataManagement />;
    default:
      return <Dashboard />;
  }
}

// 리팩토링된 PurchaseSalesPage - 컴포넌트 라이브러리 사용
function PurchaseSalesPage({ type }: { type: 'purchase' | 'sales' }) {
  const [activeTab, setActiveTab] = useState('all');
  
  const titles = {
    purchase: { list: '발주서 목록', create: '발주서 작성' },
    sales: { list: '판매서 목록', create: '판매서 작성' }
  };

  const tabs = [
    { id: 'all', label: '주문 전체' },
    { id: 'draft', label: '임시 저장' },
    { id: 'waiting', label: type === 'purchase' ? '입고 대기' : '출고 대기' },
    { id: 'partial', label: type === 'purchase' ? '부분 입고' : '부분 출고' },
    { id: 'complete', label: type === 'purchase' ? '입고 완료' : '출고 완료' }
  ];

  return (
    <div className="p-8">
      <SectionHeader
        title={`구매 및 판매 / ${type === 'purchase' ? '구매' : '판매'}`}
        className="mb-4"
      />
      
      <PageHeader
        title={titles[type].list}
        icon={ShoppingCart}
        actions={
          <Button icon={Plus}>{titles[type].create}</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <TabHeader
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <div className="p-4 border-b flex gap-4">
          <SelectField
            label=""
            name="period"
            options={[{ value: 'all', label: '전체 기간' }]}
            value="all"
            className="w-48"
          />
          <Button variant="outline">필터 추가</Button>
          <div className="ml-auto">
            <Button variant="outline">컬럼 설정</Button>
          </div>
        </div>
        
        <EmptyState
          title="조회된 결과가 없습니다"
          size="sm"
        />
      </div>
    </div>
  );
}

// 리팩토링된 ReturnPage - 컴포넌트 라이브러리 사용
function ReturnPage() {
  const [activeTab, setActiveTab] = useState('all');
  
  const tabs = [
    { id: 'all', label: '반품 전체' },
    { id: 'waiting', label: '입고 대기' },
    { id: 'partial', label: '부분 입고' },
    { id: 'complete', label: '입고 완료' }
  ];

  return (
    <div className="p-8">
      <SectionHeader
        title="구매 및 판매 / 반품"
        className="mb-4"
      />
      
      <PageHeader
        title="반품 목록"
        icon={ShoppingCart}
        actions={
          <Button icon={Plus}>반품 추가</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <TabHeader
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <div className="p-4 border-b flex gap-4">
          <SelectField
            label=""
            name="period"
            options={[{ value: 'all', label: '전체 기간' }]}
            value="all"
            className="w-48"
          />
          <Button variant="outline">필터 추가</Button>
          <div className="ml-auto">
            <IconButton icon={Settings} label="설정" />
          </div>
        </div>
        
        <EmptyState
          title="조회된 결과가 없습니다"
          size="sm"
        />
      </div>
    </div>
  );
}

// 리팩토링된 BarcodePage - 컴포넌트 라이브러리 사용
function BarcodePage({ type }: { type: 'product' | 'bundle' }) {
  const [paperType, setPaperType] = useState('label');
  
  return (
    <div className="p-8">
      <SectionHeader
        title={`바코드 인쇄 / ${type === 'product' ? '제품' : '묶음제품'}`}
        className="mb-4"
      />
      
      <div className="flex gap-8">
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">템플릿 추가</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-3">용지 설정</h3>
              <RadioGroup
                label=""
                name="paper"
                options={[
                  { value: 'label', label: '라벨 용지' },
                  { value: 'thermal', label: '감열지' },
                  { value: 'custom', label: '사용자 정의' }
                ]}
                value={paperType}
                onChange={setPaperType}
              />
            </div>
            
            <SelectField
              label=""
              name="template"
              options={[{ value: 'formtec3100', label: 'Formtec 3100 (A4)' }]}
              value="formtec3100"
            />
          </div>
          
          <div className="flex justify-between mt-8">
            <Button variant="outline">이전으로</Button>
            <Button>다음</Button>
          </div>
        </div>
        
        <div className="flex-1 bg-gray-100 rounded-lg p-8">
          <div className="bg-white aspect-[210/297] shadow-lg mx-auto max-w-md">
            {/* A4 Paper Preview */}
          </div>
        </div>
      </div>
    </div>
  );
}

// 리팩토링된 PastQuantityPage - 컴포넌트 라이브러리 사용
function PastQuantityPage() {
  const [date, setDate] = useState('');
  
  return (
    <div className="p-8">
      <SectionHeader
        title="분석"
        className="mb-4"
      />
      
      <PageHeader
        title="과거 수량 조회"
        icon={BarChart3}
        actions={
          <Button variant="outline">엑셀 내보내기</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow p-8">
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <IconButton icon={ChevronLeft} label="이전" size="sm" />
            <TextField
              label=""
              name="date"
              type="text"
              placeholder="e.g. 2025-08-27"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-48"
            />
            <IconButton icon={ChevronRight} label="다음" size="sm" />
          </div>
          <SearchBar
            placeholder="이름, 바코드, 속성 검색"
            className="flex-1"
          />
        </div>
        
        <EmptyState
          title="원하는 일자를 선택한 후 조회 버튼을 눌러주세요"
          description="예) 2020-04-28 → 2020-04-28 23:59:59"
        />
      </div>
    </div>
  );
}

// 리팩토링된 InventoryAnalysisPage - 컴포넌트 라이브러리 사용
function InventoryAnalysisPage() {
  return (
    <div className="p-8">
      <SectionHeader
        title="분석"
        className="mb-4"
      />
      
      <PageHeader
        title="재고 분석"
        icon={BarChart3}
        actions={
          <>
            <Button variant="outline">엑셀 내보내기</Button>
            <Button>수식 추가 및 설정</Button>
          </>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow p-8">
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <IconButton icon={ChevronLeft} label="이전" size="sm" />
            <span className="px-4 py-2 bg-gray-100 rounded">2025-07-29 - 2025-08-27</span>
            <IconButton icon={ChevronRight} label="다음" size="sm" />
          </div>
          <SelectField
            label=""
            name="location"
            options={[{ value: 'default', label: '🏠 기본 위치' }]}
            value="default"
            className="w-48"
          />
          <SearchBar
            placeholder="이름, 바코드, 속성 검색"
            className="flex-1"
          />
        </div>
        
        <EmptyState
          title="데이터 기반으로 재고를 분석해 보세요"
          action={{
            label: '재고 분석 시작',
            onClick: () => {},
            icon: Plus
          }}
        />
      </div>
    </div>
  );
}

// 리팩토링된 SalesAnalysisPage - 컴포넌트 라이브러리 사용
function SalesAnalysisPage() {
  const [activeTab, setActiveTab] = useState('profit');
  const [groupByPartner, setGroupByPartner] = useState(false);
  
  const tabs = [
    { id: 'profit', label: '손익 분석' },
    { id: 'purchase-sales', label: '매입매출 분석' }
  ];

  return (
    <div className="p-8">
      <Alert
        type="info"
        message="매출 분석은 구매 및 판매에서 작성된 데이터만 포함됩니다."
        className="mb-6"
      />
      
      <SectionHeader
        title="분석"
        className="mb-4"
      />
      
      <PageHeader
        title="매출 분석"
        icon={BarChart3}
        actions={
          <Button variant="outline">엑셀 내보내기</Button>
        }
        showHelp
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <IconButton icon={ChevronLeft} label="이전" size="sm" />
            <span className="px-4 py-2 bg-gray-100 rounded">2025-07-29 - 2025-08-27</span>
            <IconButton icon={ChevronRight} label="다음" size="sm" />
          </div>
          <SearchBar
            placeholder="제품명, 바코드, 구매가, 판매가, 속성 검색"
            className="flex-1"
          />
          <CheckboxField
            label="거래처별 묶어보기"
            name="groupByPartner"
            checked={groupByPartner}
            onChange={(e) => setGroupByPartner(e.target.checked)}
          />
        </div>
        
        <TabHeader
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <EmptyState
          title="조회된 결과가 없습니다"
          size="sm"
        />
      </div>
    </div>
  );
}