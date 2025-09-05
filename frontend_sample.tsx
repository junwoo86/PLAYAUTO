import React, { useState, createContext, useContext } from 'react';
import { 
  Home, Package, Download, Upload, Settings, ArrowRightLeft, 
  History, ShoppingCart, Barcode, Plus, BarChart3, ChevronDown,
  HelpCircle, Bell, User, Search, Calendar, Filter, Menu,
  FileSpreadsheet, AlertCircle, Link2, ClipboardCheck, X,
  ChevronLeft, ChevronRight, ScanBarcode
} from 'lucide-react';

// Context for managing global state
const AppContext = createContext();
const useAppContext = () => useContext(AppContext);

// Main App Component
export default function InventoryManagementSystem() {
  const [activePage, setActivePage] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState(['purchase-sales', 'analysis']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const toggleMenu = (menuName) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(m => m !== menuName)
        : [...prev, menuName]
    );
  };

  return (
    <AppContext.Provider value={{ activePage, setActivePage }}>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar 
          expandedMenus={expandedMenus} 
          toggleMenu={toggleMenu}
          collapsed={sidebarCollapsed}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
          
          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <PageContent />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}

// Sidebar Component
function Sidebar({ expandedMenus, toggleMenu, collapsed }) {
  const { activePage, setActivePage } = useAppContext();
  
  const menuItems = [
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
      hasSubmenu: true,
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
      hasSubmenu: true,
      submenu: [
        { id: 'barcode-product', name: '제품' },
        { id: 'barcode-bundle', name: '묶음제품' }
      ]
    },
    { 
      id: 'additional',
      name: '추가기능', 
      icon: Plus,
      hasSubmenu: true,
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
      hasSubmenu: true,
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
      hasSubmenu: true,
      submenu: [
        { id: 'settings-general', name: '일반' },
        { id: 'settings-users', name: '사용자' },
        { id: 'settings-notifications', name: '알림' }
      ]
    }
  ];

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
      <div className="p-4 border-b">
        <h1 className={`font-bold text-gray-800 ${collapsed ? 'text-center text-sm' : 'text-xl'}`}>
          {collapsed ? 'BC' : '바이오컴'}
        </h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto pb-16">
        {menuItems.map((item) => (
          <div key={item.id}>
            <div 
              className={`flex items-center justify-between px-4 py-3 hover:bg-gray-100 cursor-pointer ${
                activePage === item.id || (item.submenu?.some(sub => sub.id === activePage)) 
                  ? 'bg-teal-500 text-white hover:bg-teal-600' 
                  : 'text-gray-700'
              }`}
              onClick={() => {
                if (item.hasSubmenu) {
                  toggleMenu(item.id);
                } else {
                  setActivePage(item.id);
                }
              }}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                {!collapsed && (
                  <>
                    <span className="text-sm">{item.name}</span>
                    {item.progress && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        activePage === item.id ? 'bg-white text-teal-600' : 'bg-teal-100 text-teal-600'
                      }`}>
                        {item.progress}%
                      </span>
                    )}
                  </>
                )}
              </div>
              {!collapsed && item.hasSubmenu && (
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${
                    expandedMenus.includes(item.id) ? 'rotate-180' : ''
                  }`}
                />
              )}
            </div>
            
            {/* Submenu */}
            {!collapsed && item.hasSubmenu && item.submenu && expandedMenus.includes(item.id) && (
              <div className="bg-gray-50">
                {item.submenu.map((subItem) => (
                  <div 
                    key={subItem.id}
                    className={`px-12 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                      activePage === subItem.id ? 'bg-teal-100 text-teal-700' : 'text-gray-600'
                    }`}
                    onClick={() => setActivePage(subItem.id)}
                  >
                    {subItem.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 text-xs text-gray-500 bg-white border-t">
        © 2025 Biocom
      </div>
    </aside>
  );
}

// Header Component
function Header({ toggleSidebar }) {
  return (
    <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="text-gray-600 hover:text-gray-800">
          <Menu size={24} />
        </button>
        <span className="text-gray-600">바이오컴</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <HelpCircle size={20} className="text-gray-600" />
        </button>
        <span className="text-gray-500">사용 가이드</span>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Bell size={20} className="text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <User size={20} className="text-gray-600" />
        </button>
      </div>
    </header>
  );
}

// Page Content Router
function PageContent() {
  const { activePage } = useAppContext();
  
  switch(activePage) {
    case 'dashboard': return <Dashboard />;
    case 'products': return <ProductList />;
    case 'receive': return <Receive />;
    case 'dispatch': return <Dispatch />;
    case 'adjustment': return <Adjustment />;
    case 'transfer': return <Transfer />;
    case 'history': return <HistoryPage />;
    case 'purchase': return <Purchase />;
    case 'sales': return <Sales />;
    case 'return': return <Return />;
    case 'barcode-product': return <BarcodeProduct />;
    case 'barcode-bundle': return <BarcodeBundle />;
    case 'stock-alert': return <StockAlert />;
    case 'stock-share': return <StockShareLink />;
    case 'stock-survey': return <StockSurvey />;
    case 'analysis-summary': return <AnalysisSummary />;
    case 'past-quantity': return <PastQuantity />;
    case 'analysis-dashboard': return <Dashboard />;
    case 'inventory-analysis': return <InventoryAnalysis />;
    case 'sales-analysis': return <SalesAnalysis />;
    case 'data-management': return <DataManagement />;
    default: return <Dashboard />;
  }
}

// Dashboard Component
function Dashboard() {
  return (
    <div className="p-8">
      {/* Alert Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-blue-500 mt-0.5" size={20} />
        <p className="text-sm text-gray-700">
          관리자 권한이 있는 경우 추가 리포트를 이메일로 받아볼 수 있습니다. 
          <a href="#" className="text-blue-600 hover:underline ml-1">알림 설정</a>에서 수신 여부를 확인해 주세요.
        </p>
      </div>

      {/* Today Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800">오늘</h2>
        <p className="text-gray-500 mt-1">2025-08-27</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <StatsCard title="총 재고" value="2,005" color="blue" subStats={[{ label: "어제 총 재고", value: "0" }]} />
        <StatsCard title="입고" value="0" color="gray" subStats={[{ label: "어제 입고", value: "0" }]} />
        <StatsCard title="출고" value="0" color="gray" subStats={[{ label: "어제 출고", value: "0" }]} />
      </div>

      {/* Charts Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          최근 한 달 
          <span className="text-sm text-gray-500 ml-2">2025-07-29 ~ 2025-08-27</span>
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <ChartCard title="재고 변동" value="+2,005" color="teal" hasData={true} />
          <ChartCard title="입고 수" value="0" color="gray" hasData={false} />
          <ChartCard title="출고 수" value="0" color="gray" hasData={false} />
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, color, subStats }) {
  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-400',
    teal: 'text-teal-500'
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm text-gray-500 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
      <div className="mt-4 space-y-2 text-sm">
        {subStats.map((stat, idx) => (
          <div key={idx} className="flex justify-between">
            <span className="text-gray-500">{stat.label}</span>
            <span className="text-gray-700">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, value, color, hasData }) {
  const colorClasses = {
    teal: 'text-teal-500',
    gray: 'text-gray-400'
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h4 className="text-sm font-medium text-gray-700 mb-1">{title}</h4>
      <p className={`text-2xl font-bold ${colorClasses[color]} mb-4`}>{value}</p>
      <div className="h-40 flex items-end justify-around">
        {hasData ? (
          <svg className="w-full h-full">
            <path
              d="M 10 130 L 240 130 L 240 20"
              fill="none"
              stroke="#14B8A6"
              strokeWidth="2"
            />
            <path
              d="M 10 130 L 240 130 L 240 20 L 10 130"
              fill="#14B8A6"
              fillOpacity="0.1"
            />
          </svg>
        ) : (
          [...Array(30)].map((_, i) => (
            <div key={i} className="w-1.5 bg-gray-200 h-1"></div>
          ))
        )}
      </div>
    </div>
  );
}

// Product List Component
function ProductList() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          제품목록
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={20} />
            제품 추가
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <FileSpreadsheet size={20} />
            데이터 관리
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <select className="px-4 py-2 border rounded-lg">
            <option>모든 위치</option>
          </select>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="이름, 바코드, 속성 검색" 
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Search size={20} />
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">재고 보유</span>
          </label>
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">1개 품목</span>
            <select className="px-3 py-1 border rounded text-sm">
              <option>뭐어보기</option>
            </select>
          </div>
          
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">바이오밸런스</h3>
                <p className="text-sm text-gray-500">영양제 / 바이오컴</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">2,005</p>
                <p className="text-sm text-gray-500">총 2,005</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-gray-500">
            <p>현재 목록에서 제품을 숨성별로 묶거나</p>
            <p>선택한 수 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Receive Component
function Receive() {
  return <TransactionForm type="receive" />;
}

// Dispatch Component  
function Dispatch() {
  return <TransactionForm type="dispatch" />;
}

// Adjustment Component
function Adjustment() {
  return <TransactionForm type="adjustment" />;
}

// Transfer Component
function Transfer() {
  return <TransactionForm type="transfer" />;
}

// Shared Transaction Form Component
function TransactionForm({ type }) {
  const titles = {
    receive: '입고',
    dispatch: '출고',
    adjustment: '조정',
    transfer: '이동'
  };
  
  const colors = {
    receive: 'text-blue-600',
    dispatch: 'text-red-600',
    adjustment: 'text-green-600', 
    transfer: 'text-orange-600'
  };
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-semibold ${colors[type]}`}>
          {titles[type]}
          <AlertCircle size={20} className="inline ml-2 text-gray-400" />
        </h1>
        <button className="text-sm text-gray-600 hover:text-gray-800">초기화</button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Location Selection */}
          <div className="grid grid-cols-2 gap-4">
            {type === 'transfer' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">출발 위치*</label>
                  <select className="w-full px-4 py-2 border rounded-lg">
                    <option>현재 위치</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">도착 위치*</label>
                  <select className="w-full px-4 py-2 border rounded-lg">
                    <option>새 위치</option>
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">위치*</label>
                <select className="w-full px-4 py-2 border rounded-lg">
                  <option>기본 위치</option>
                </select>
              </div>
            )}
            
            {(type === 'receive' || type === 'dispatch') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">거래처</label>
                <select className="w-full px-4 py-2 border rounded-lg">
                  <option>선택하세요</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Date */}
          <div className={type === 'transfer' ? 'w-1/2' : 'w-full'}>
            <label className="block text-sm font-medium text-gray-700 mb-2">날짜</label>
            <div className="flex gap-2">
              <input type="date" className="flex-1 px-4 py-2 border rounded-lg" />
              <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                <Calendar size={20} />
              </button>
            </div>
          </div>
          
          {/* Product List Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">제품 목록</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1">
                  <Plus size={16} />
                  일괄 추가
                </button>
                <button className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1">
                  <FileSpreadsheet size={16} />
                  엑셀 가져오기
                </button>
                <button className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 flex items-center gap-1">
                  <ScanBarcode size={16} />
                  바코드 스캔
                </button>
              </div>
            </div>
            
            <table className="w-full border-t">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 text-sm font-medium">제품</th>
                  <th className="text-center p-3 text-sm font-medium">현재고</th>
                  <th className="text-center p-3 text-sm font-medium">{titles[type]} 수량*</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="text-center p-8">
                    <button className="px-6 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-500 hover:text-gray-700">
                      + 제품 검색
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div className="text-right mt-4 text-sm">
              총 수량: <span className="font-bold text-lg">0</span>
            </div>
          </div>
          
          {/* Memo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">메모 입력</label>
            <textarea 
              className="w-full px-4 py-3 border rounded-lg resize-none"
              rows={3}
              placeholder="TIP) #태그 입력 시 목록에서 '태그'로 검색할 수 있습니다."
            />
            <p className="text-sm text-gray-500 mt-1">
              파일을 끌어다 놓거나 불여넣기로 첨부할 수 있습니다.
            </p>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          {type !== 'adjustment' && (
            <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              임시 저장
            </button>
          )}
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            {titles[type]} 완료
          </button>
        </div>
      </div>
    </div>
  );
}

// History Page Component
function HistoryPage() {
  const historyItems = [
    {
      type: '조정',
      date: '2025-08-27 11:52',
      user: 'junwoo',
      items: '바이오밸런스',
      count: '1개 품목 / 5개',
      note: '조정 실사재고 5개 추가'
    },
    {
      type: '조정', 
      date: '2025-08-27 11:51',
      user: 'junwoo',
      items: '바이오밸런스',
      count: '1개 품목 / 75개',
      note: ''
    },
    {
      type: '조정',
      date: '2025-08-27 11:50', 
      user: 'junwoo',
      items: '바이오밸런스',
      count: '1개 품목 / 1,925개',
      note: '초기 수량'
    }
  ];
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          히스토리
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <FileSpreadsheet size={20} />
          엑셀 내보내기
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <select className="px-4 py-2 border rounded-lg">
            <option>전체 기간</option>
            <option>오늘</option>
            <option>어제</option>
            <option>이번 주</option>
            <option>지난 주</option>
            <option>이번 달</option>
            <option>지난 달</option>
          </select>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Plus size={16} />
            필터 추가
          </button>
        </div>
        
        <div className="divide-y">
          {historyItems.map((item, idx) => (
            <div key={idx} className="p-6 hover:bg-gray-50">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <ArrowRightLeft size={20} className="text-teal-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-gray-900">{item.type}</span>
                    <span className="text-sm text-gray-500">{item.date}</span>
                    <span className="text-xs text-gray-400">{item.user}</span>
                  </div>
                  <div className="text-gray-700">
                    <span className="font-medium">{item.count}</span>
                    <span className="text-gray-600 ml-2">{item.items}</span>
                  </div>
                  {item.note && (
                    <div className="mt-2 text-sm text-gray-600">
                      • {item.note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-6 text-center text-gray-500 border-t">
          더 이상 불러올 내역이 없습니다.
        </div>
      </div>
    </div>
  );
}

// Purchase Component
function Purchase() {
  return <PurchaseSalesTemplate type="purchase" />;
}

// Sales Component
function Sales() {
  return <PurchaseSalesTemplate type="sales" />;
}

// Return Component
function Return() {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        구매 및 판매 / 반품
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          반품 목록
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus size={20} />
          반품 추가
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            {['반품 전체', '입고 대기', '부분 입고', '입고 완료'].map((tab, idx) => (
              <button 
                key={idx} 
                className={`px-6 py-3 border-b-2 ${idx === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-b flex gap-4">
          <select className="px-4 py-2 border rounded-lg">
            <option>전체 기간</option>
          </select>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">필터 추가</button>
          <div className="ml-auto flex gap-2">
            <button className="p-2 border rounded-lg hover:bg-gray-50">
              <Settings size={16} />
            </button>
          </div>
        </div>
        
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">상태</th>
              <th className="text-left p-3 text-sm font-medium">반품일</th>
              <th className="text-left p-3 text-sm font-medium">반품 번호</th>
              <th className="text-left p-3 text-sm font-medium">고객</th>
              <th className="text-left p-3 text-sm font-medium">품목 수</th>
              <th className="text-left p-3 text-sm font-medium">환불액</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center py-12 text-gray-500">
                조회된 결과가 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
        
        <div className="p-4 border-t flex justify-between items-center">
          <select className="px-3 py-1 border rounded text-sm">
            <option>10</option>
            <option>20</option>
            <option>50</option>
            <option>100</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">0 - 0 / 0</span>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared Purchase/Sales Template
function PurchaseSalesTemplate({ type }) {
  const titles = {
    purchase: { list: '발주서 목록', create: '발주서 작성', columns: ['발주일', '주문 번호', '공급자', '품목 수', '입고 현황'] },
    sales: { list: '판매서 목록', create: '판매서 작성', columns: ['판매일', '주문 번호', '고객', '품목 수', '출고 현황'] }
  };
  
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        구매 및 판매 / {type === 'purchase' ? '구매' : '판매'}
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          {titles[type].list}
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus size={20} />
          {titles[type].create}
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            {['주문 전체', '임시 저장', type === 'purchase' ? '입고 대기' : '출고 대기', 
              type === 'purchase' ? '부분 입고' : '부분 출고', 
              type === 'purchase' ? '입고 완료' : '출고 완료'].map((tab, idx) => (
              <button 
                key={idx} 
                className={`px-6 py-3 border-b-2 ${idx === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-b flex gap-4">
          <select className="px-4 py-2 border rounded-lg">
            <option>전체 기간</option>
          </select>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">필터 추가</button>
          <div className="ml-auto flex gap-2">
            <button className="p-2 border rounded-lg hover:bg-gray-50">컬럼 설정</button>
          </div>
        </div>
        
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">상태</th>
              {titles[type].columns.map((col, idx) => (
                <th key={idx} className="text-left p-3 text-sm font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center py-12 text-gray-500">
                조회된 결과가 없습니다.
              </td>
            </tr>
          </tbody>
        </table>
        
        <div className="p-4 border-t flex justify-between items-center">
          <select className="px-3 py-1 border rounded text-sm">
            <option>10</option>
            <option>20</option>
            <option>50</option>
            <option>100</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">0 - 0 / 0</span>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Barcode Product Component
function BarcodeProduct() {
  return <BarcodeTemplate type="product" />;
}

// Barcode Bundle Component
function BarcodeBundle() {
  return <BarcodeTemplate type="bundle" />;
}

// Shared Barcode Template
function BarcodeTemplate({ type }) {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        바코드 인쇄 / {type === 'product' ? '제품' : '묶음제품'}
      </div>
      
      <div className="flex gap-8">
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">템플릿 추가</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-3">용지 설정</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="radio" name="paper" checked readOnly className="text-blue-600" />
                  <span>라벨 용지</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="paper" className="text-blue-600" />
                  <span>감열지</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="paper" className="text-blue-600" />
                  <span>사용자 정의</span>
                </label>
              </div>
            </div>
            
            <div>
              <select className="w-full px-4 py-2 border rounded-lg">
                <option>Formtec 3100 (A4)</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-between mt-8">
            <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              이전으로
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              다음
            </button>
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

// Stock Alert Component
function StockAlert() {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        추가기능
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          재고 부족 알림
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            엑셀 내보내기
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            수량 설정
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8">
        <div className="mb-6 flex gap-4">
          <select className="px-4 py-2 border rounded-lg">
            <option>함산 재고</option>
          </select>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="이름, 바코드, 속성 검색" 
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Search size={20} />
            </button>
          </div>
        </div>
        
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">안전 재고를 설정하고 재고 부족 알림을 받아보세요.</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto">
            <Plus size={20} />
            안전 재고 설정
          </button>
        </div>
      </div>
    </div>
  );
}

// Stock Share Link Component
function StockShareLink() {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        추가기능
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          재고 공유 링크
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus size={20} />
          추가
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 text-sm font-medium">제목</th>
              <th className="text-left p-4 text-sm font-medium">링크 URL</th>
              <th className="text-left p-4 text-sm font-medium">위치</th>
              <th className="text-left p-4 text-sm font-medium">생성일</th>
              <th className="text-left p-4 text-sm font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="text-center py-12">
                <p className="text-gray-500 mb-4">재고 정보를 안전하게 공유해 보세요.</p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto">
                  <Plus size={20} />
                  재고 공유 링크 생성
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Stock Survey Component
function StockSurvey() {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        추가기능
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          재고 조사
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus size={20} />
          추가
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 text-sm font-medium">제목</th>
              <th className="text-left p-4 text-sm font-medium">위치</th>
              <th className="text-left p-4 text-sm font-medium">상태</th>
              <th className="text-left p-4 text-sm font-medium">제품</th>
              <th className="text-left p-4 text-sm font-medium">시작일</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-4">2025-08-27 재고 조사</td>
              <td className="p-4">기본 위치</td>
              <td className="p-4">
                <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-sm">진행 중</span>
              </td>
              <td className="p-4">1개 품목</td>
              <td className="p-4">2025-08-27</td>
            </tr>
          </tbody>
        </table>
        
        <div className="p-4 border-t flex justify-between items-center">
          <select className="px-3 py-1 border rounded text-sm">
            <option>100</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">1 - 1</span>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Analysis Summary Component
function AnalysisSummary() {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        분석
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          입출고 요약
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          엑셀 내보내기
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded">2025-07-28 - 2025-08-27</span>
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="이름, 바코드, 속성 검색" 
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Search size={20} />
            </button>
          </div>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Plus size={16} />
            필터 추가
          </button>
        </div>
        
        <div className="border-b">
          <div className="flex">
            <button className="px-6 py-3 border-b-2 border-blue-600 text-blue-600">요약</button>
            <button className="px-6 py-3 border-b-2 border-transparent">날짜별</button>
          </div>
        </div>
        
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">제품명 ↑</th>
              <th className="text-center p-3 text-sm font-medium">입고량</th>
              <th className="text-center p-3 text-sm font-medium">출고량</th>
              <th className="text-center p-3 text-sm font-medium">조정 변동량</th>
              <th className="text-center p-3 text-sm font-medium">이동 변동량</th>
              <th className="text-center p-3 text-sm font-medium">총량 재고</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-3">
                <div>바이오밸런스</div>
                <div className="text-sm text-gray-500">영양제 / 바이오컴</div>
              </td>
              <td className="text-center p-3">0</td>
              <td className="text-center p-3">0</td>
              <td className="text-center p-3 text-green-600">+2,005</td>
              <td className="text-center p-3">0</td>
              <td className="text-center p-3 font-medium">2,005</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="p-3 font-medium">1개 항목</td>
              <td className="text-center p-3 font-medium">0</td>
              <td className="text-center p-3 font-medium">0</td>
              <td className="text-center p-3 font-medium text-green-600">+2,005</td>
              <td className="text-center p-3 font-medium">0</td>
              <td className="text-center p-3 font-medium">2,005</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Past Quantity Component
function PastQuantity() {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        분석
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          과거 수량 조회
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          엑셀 내보내기
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8">
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} />
            </button>
            <input 
              type="text" 
              placeholder="e.g. 2025-08-27" 
              className="px-4 py-2 border rounded-lg"
            />
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="이름, 바코드, 속성 검색" 
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Search size={20} />
            </button>
          </div>
        </div>
        
        <div className="text-center py-12 text-gray-500">
          <p>원하는 일자를 선택한 후 조회 버튼을 눌러주세요.</p>
          <p className="text-sm mt-2">예) 2020-04-28 → 2020-04-28 23:59:59</p>
        </div>
      </div>
    </div>
  );
}

// Inventory Analysis Component
function InventoryAnalysis() {
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        분석
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          재고 분석
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            엑셀 내보내기
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            수식 추가 및 설정
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8">
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded">2025-07-29 - 2025-08-27</span>
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={20} />
            </button>
          </div>
          <select className="px-4 py-2 border rounded-lg">
            <option>🏠 기본 위치</option>
          </select>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="이름, 바코드, 속성 검색" 
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Search size={20} />
            </button>
          </div>
        </div>
        
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">데이터 기반으로 재고를 분석해 보세요.</p>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto">
            <Plus size={20} />
            재고 분석 시작
          </button>
        </div>
      </div>
    </div>
  );
}

// Sales Analysis Component
function SalesAnalysis() {
  return (
    <div className="p-8">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <AlertCircle className="text-blue-500 mt-0.5" size={20} />
        <p className="text-sm text-gray-700">
          매출 분석은 구매 및 판매에서 작성된 데이터만 포함됩니다.
        </p>
      </div>
      
      <div className="mb-4 text-sm text-gray-500">
        분석
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          매출 분석
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          엑셀 내보내기
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 py-2 bg-gray-100 rounded">2025-07-29 - 2025-08-27</span>
            <button className="p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="제품명, 바코드, 구매가, 판매가, 속성 검색" 
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Search size={20} />
            </button>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">거래처별 묶어보기</span>
          </label>
        </div>
        
        <div className="border-b">
          <div className="flex">
            <button className="px-6 py-3 border-b-2 border-blue-600 text-blue-600">손익 분석</button>
            <button className="px-6 py-3 border-b-2 border-transparent">매입매출 분석</button>
          </div>
        </div>
        
        <div className="p-12 text-center text-gray-500">
          조회된 결과가 없습니다.
        </div>
      </div>
    </div>
  );
}

// Data Management Component
function DataManagement() {
  const [activeTab, setActiveTab] = useState('products');
  
  return (
    <div className="p-8">
      <div className="mb-4 text-sm text-gray-500">
        데이터 관리
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          제품
          <AlertCircle size={20} className="text-gray-400" />
        </h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Plus size={20} />
            제품 추가
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            엑셀 가져오기
          </button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex gap-4">
          <div className="flex-1 flex gap-2">
            <input 
              type="text" 
              placeholder="이름, 바코드, 속성 검색" 
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              <ScanBarcode size={20} />
            </button>
          </div>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            엑셀 내보내기
          </button>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            컬럼 설정
          </button>
        </div>
        
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 p-3">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="text-left p-3 text-sm font-medium">제품명 ↑</th>
              <th className="text-left p-3 text-sm font-medium">SKU</th>
              <th className="text-left p-3 text-sm font-medium">바코드</th>
              <th className="text-center p-3 text-sm font-medium">구매가</th>
              <th className="text-center p-3 text-sm font-medium">판매</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50">
              <td className="p-3">
                <input type="checkbox" className="rounded" />
              </td>
              <td className="p-3">바이오밸런스</td>
              <td className="p-3">SKU-E26V069R</td>
              <td className="p-3">1234</td>
              <td className="text-center p-3">0</td>
              <td className="text-center p-3">38,500</td>
            </tr>
          </tbody>
        </table>
        
        <div className="p-4 border-t flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">보기</span>
            <select className="px-3 py-1 border rounded text-sm">
              <option>100</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">1 - 1 / 1</span>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronLeft size={16} />
            </button>
            <button className="p-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}