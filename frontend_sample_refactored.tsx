import React, { useState, createContext, useContext } from 'react';
import { 
  Home, Package, Download, Upload, Settings, ArrowRightLeft, 
  History, ShoppingCart, Barcode, Plus, BarChart3,
  AlertCircle, ScanBarcode, FileSpreadsheet, Calendar
} from 'lucide-react';

// 컴포넌트 라이브러리 임포트
import {
  Button,
  StatsCard,
  ChartCard,
  SimpleBarChart,
  TextField,
  SelectField,
  TextareaField,
  CheckboxField,
  SearchBar,
  DataTable,
  PageHeader,
  EmptyState,
  Alert,
  Sidebar,
  Header,
  MenuItem
} from './components';

// Context for managing global state
const AppContext = createContext();
const useAppContext = () => useContext(AppContext);

// Main App Component - 리팩토링된 버전
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

  const columns = [
    { key: 'name', header: '제품명' },
    { key: 'category', header: '카테고리' },
    { 
      key: 'stock', 
      header: '재고', 
      align: 'center' as const,
      render: (value: number) => (
        <span className="text-2xl font-bold text-blue-600">{value.toLocaleString()}</span>
      )
    },
    { 
      key: 'totalStock', 
      header: '총 재고',
      align: 'center' as const,
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

// Page Content Router
function PageContent() {
  const { activePage } = useAppContext();
  
  switch(activePage) {
    case 'dashboard': return <Dashboard />;
    case 'products': return <ProductList />;
    case 'receive': return <TransactionForm type="receive" />;
    case 'dispatch': return <TransactionForm type="dispatch" />;
    case 'adjustment': return <TransactionForm type="adjustment" />;
    case 'transfer': return <TransactionForm type="transfer" />;
    // 나머지 페이지들도 동일하게 컴포넌트 라이브러리를 활용하여 리팩토링 가능
    default: return <Dashboard />;
  }
}