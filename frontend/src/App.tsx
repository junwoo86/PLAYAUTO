import React, { useState, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from 'react-hot-toast';
import { api } from './services/api';
import { 
  Home, Package, Download, Upload, Settings, 
  History, RotateCcw, Plus, BarChart3, Menu, FileSpreadsheet, ShoppingCart,
  FileText, ClipboardEdit, MapPin, BookOpen, Bell, Building2
} from 'lucide-react';

// 컴포넌트 임포트
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

// 인증 관련 페이지
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

// 페이지 컴포넌트 레이지 로딩
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductList = lazy(() => import('./pages/ProductList'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const TransactionForm = lazy(() => import('./pages/TransactionForm'));
const PurchaseSales = lazy(() => import('./pages/PurchaseSales'));
const HistoryPage = lazy(() => import('./pages/History'));
const Analysis = lazy(() => import('./pages/Analysis'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const StockAlert = lazy(() => import('./pages/StockAlert'));
const BatchProcess = lazy(() => import('./pages/BatchProcess'));
const ReturnManagement = lazy(() => import('./pages/ReturnManagement'));
const PurchaseOrder = lazy(() => import('./pages/PurchaseOrder'));
const DailyClosing = lazy(() => import('./pages/DailyClosing'));
const DailyLedger = lazy(() => import('./pages/DailyLedger'));
const WarehouseManagement = lazy(() => import('./pages/WarehouseManagement'));

// 누락되었던 페이지들 추가
const IndividualProcess = lazy(() => import('./pages/IndividualProcess'));
const CancelReturn = lazy(() => import('./pages/CancelReturn'));
const ProductMove = lazy(() => import('./pages/ProductMove'));

// 스케줄러 모니터링 페이지
const SchedulerMonitoring = lazy(() => import('./pages/SchedulerMonitoring'));

// 분석 관련 페이지들
const TransactionSummary = lazy(() => import('./pages/TransactionSummary'));
const PastQuantityLookup = lazy(() => import('./pages/PastQuantityLookup'));
const InventoryAnalysis = lazy(() => import('./pages/InventoryAnalysis'));
const SalesAnalysis = lazy(() => import('./pages/SalesAnalysis'));

// 로딩 컴포넌트
const Loading = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="mt-2 text-gray-600">로딩 중...</p>
    </div>
  </div>
);

// Context 타입 정의
interface AppContextType {
  activePage: string;
  setActivePage: (page: string) => void;
  purchaseOrderData?: any;  // 발주 페이지로 전달할 데이터
  setPurchaseOrderData: (data: any) => void;
}

// Context 생성
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context Hook
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// 메인 레이아웃 컴포넌트
const MainLayout = () => {
  const { user, logout, hasPermission } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [purchaseOrderData, setPurchaseOrderData] = useState<any>(null);
  const [productListKey, setProductListKey] = useState(0); // 제품 목록 리렌더링용 key
  const [lowStockCount, setLowStockCount] = useState<number>(0); // 재고 부족 제품 수

  // 재고 부족 제품 수를 가져오는 함수
  const fetchLowStockCount = React.useCallback(async () => {
    try {
      const response = await api.get('/statistics/dashboard');
      const { inventory } = response.data.data || {};

      if (inventory && inventory.lowStockCount !== undefined) {
        setLowStockCount(inventory.lowStockCount);
        console.log('재고 부족 제품 수:', inventory.lowStockCount); // 디버깅용 로그
      }
    } catch (error) {
      console.error('재고 부족 제품 수 조회 실패:', error);
    }
  }, []);

  // URL 경로에 따른 초기 페이지 설정
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/daily-closing')) {
      setActivePage('daily-closing');
    } else if (path.includes('/settings')) {
      setActivePage('settings');
    } else if (path.includes('/products')) {
      setActivePage('products');
    } else if (path.includes('/batch-process')) {
      setActivePage('batch-process');
    }
  }, []);

  // 재고 부족 제품 수 조회 - user가 있을 때만 실행
  React.useEffect(() => {
    if (!user) return;

    fetchLowStockCount();

    // 5분마다 재고 부족 수 업데이트
    const interval = setInterval(fetchLowStockCount, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, fetchLowStockCount]);
  
  // 메뉴 아이템 설정 - 배지 제거 (이제 filteredMenuItems에서 처리)
  const menuItems: MenuItem[] = [
    { id: 'dashboard', name: '대시보드', icon: Home },
    { id: 'products', name: '제품 목록', icon: Package },
    { id: 'batch-process', name: '일괄 처리', icon: FileSpreadsheet },
    {
      id: 'individual-process',
      name: '개별 처리',
      icon: ClipboardEdit,
      submenu: [
        { id: 'receive', name: '입고' },
        { id: 'dispatch', name: '출고' },
        { id: 'adjustment', name: '재고 조정' }
      ]
    },
    { id: 'return-management', name: '취소 및 반품', icon: RotateCcw },
    { id: 'warehouses', name: '창고 관리', icon: Building2 },
    { id: 'daily-closing', name: '일일 수불부', icon: BookOpen },
    { id: 'stock-alert', name: '재고 부족 알림', icon: Bell },
    { id: 'purchase-order', name: '발주 상태 관리', icon: ShoppingCart },
    { id: 'history', name: '히스토리', icon: History },
    {
      id: 'analysis',
      name: '분석',
      icon: BarChart3,
      submenu: [
        { id: 'analysis-summary', name: '입출고 요약' },
        { id: 'past-quantity', name: '과거 수량 조회 (준비중)' },
        { id: 'analysis-dashboard', name: '대시보드 (준비중)' },
        { id: 'inventory-analysis', name: '재고 분석 (준비중)' },
        { id: 'adjustment-analysis', name: '조정 이력 분석 (준비중)' },
        { id: 'sales-analysis', name: '매출 분석 (준비중)' },
        { id: 'data-management', name: '데이터 관리 (준비중)' },
        { id: 'scheduler-monitoring', name: '스케줄러 모니터링 (준비중)' }
      ]
    },
    { id: 'settings', name: '설정', icon: Settings }
  ];

  // 페이지 컨텐츠 렌더링
  const renderPageContent = () => {
    switch(activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductList key={productListKey} />;
      case 'warehouses':
        return <WarehouseManagement />;
      case 'batch-process':
        return <BatchProcess />;
      case 'daily-closing':
        return <DailyLedger />;
      case 'receive':
        return <TransactionForm type="receive" />;
      case 'dispatch':
        return <TransactionForm type="dispatch" />;
      case 'adjustment':
        return <TransactionForm type="adjustment" />;
      case 'transfer':
        return <ProductMove />;
      case 'history':
        return <HistoryPage />;
      case 'purchase-order':
        return <PurchaseOrder initialData={purchaseOrderData} />;
      case 'return-management':
        return <CancelReturn />;
      case 'stock-alert':
        return <StockAlert />;
      case 'analysis-summary':
        return <TransactionSummary />;
      case 'past-quantity':
        return <PastQuantityLookup />;
      case 'inventory-analysis':
        return <InventoryAnalysis />;
      case 'sales-analysis':
        return <SalesAnalysis />;
      case 'analysis-dashboard':
      case 'data-management':
      case 'adjustment-analysis':
        return <Analysis type={activePage} />;
      case 'scheduler-monitoring':
        return <SchedulerMonitoring />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  // 사용자가 그룹이 없는지 확인 (권한 대기 중)
  const isPendingApproval = user && !user.group;

  // 권한에 따른 메뉴 필터링
  const filteredMenuItems = React.useMemo(() => {
    if (!user || !user.group) return [];

    return menuItems.reduce((acc: MenuItem[], item) => {
      // 아이템 복사본 생성
      const itemCopy = { ...item };

      // 재고 부족 알림 메뉴에 배지 추가
      if (itemCopy.id === 'stock-alert' && lowStockCount > 0) {
        itemCopy.badge = { text: String(lowStockCount), color: 'red' };
      }

      // 서브메뉴가 있는 경우
      if (itemCopy.submenu) {
        // 권한이 있는 서브메뉴만 필터링
        const filteredSubmenu = itemCopy.submenu.filter(subItem =>
          hasPermission(subItem.id)
        );

        // 권한이 있는 서브메뉴가 하나도 없으면 메인 메뉴도 숨김
        if (filteredSubmenu.length === 0) {
          return acc;
        }

        // 필터링된 서브메뉴로 교체
        itemCopy.submenu = filteredSubmenu;

        // 서브메뉴가 있는 경우, 자식 권한이 있으면 부모 메뉴 표시
        acc.push(itemCopy);
      } else {
        // 서브메뉴가 없는 일반 메뉴는 기존대로 권한 체크
        if (!hasPermission(item.id)) {
          return acc;
        }
        acc.push(itemCopy);
      }

      return acc;
    }, []);
  }, [user, hasPermission, lowStockCount]);

  // 권한 대기 중인 사용자에게 보여줄 페이지
  if (isPendingApproval) {
    return (
      <Suspense fallback={<Loading />}>
        <PendingApproval />
      </Suspense>
    );
  }

  return (
    <AppContext.Provider value={{ activePage, setActivePage, purchaseOrderData, setPurchaseOrderData }}>
            <div className="flex h-screen bg-gray-50">
              {/* 사이드바 */}
              <Sidebar
                logo={{
                  full: <h1 className="font-bold text-xl text-gray-800">BIOCOM</h1>,
                  collapsed: <h1 className="font-bold text-sm text-gray-800">BC</h1>
                }}
                menuItems={filteredMenuItems}
                activeItem={activePage}
                onItemClick={(item) => {
                  // 발주 메뉴를 직접 클릭했을 때만 데이터 초기화
                  if (item.id === 'purchase-order') {
                    // 메뉴를 직접 클릭하면 데이터 초기화하고 목록 페이지로 이동
                    setPurchaseOrderData(null);
                  }
                  // 제품 목록 클릭 시 리렌더링
                  if (item.id === 'products') {
                    setProductListKey(prev => prev + 1);
                  }
                  setActivePage(item.id);
                }}
                collapsed={sidebarCollapsed}
                expandedMenus={expandedMenus}
                onToggleMenu={(menuId) => {
                  setExpandedMenus(prev =>
                    prev.includes(menuId)
                      ? prev.filter(id => id !== menuId)
                      : [...prev, menuId]
                  );
                }}
                footer={<div className="text-xs text-gray-500">© 2025 BIOCOM</div>}
              />
              
              {/* 메인 컨텐츠 */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 헤더 */}
                <Header
                  title="물류 통합 관리 시스템"
                  user={{
                    name: user?.name || '사용자',
                    email: user?.email,
                    group: user?.group?.name
                  }}
                  notifications={{ count: 0 }}
                  onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  onSettingsClick={() => setActivePage('settings')}
                  onLogout={logout}
                />
                
                {/* 페이지 컨텐츠 */}
                <main className="flex-1 overflow-auto">
                  <Suspense fallback={<Loading />}>
                    {renderPageContent()}
                  </Suspense>
                </main>
              </div>
            </div>
    </AppContext.Provider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            {/* 중앙화된 토스트 설정 */}
            <Toaster
              position="top-center"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  maxWidth: '500px',
                },
                success: {
                  style: {
                    background: '#10B981',
                    color: '#fff',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#10B981',
                  },
                },
                error: {
                  style: {
                    background: '#EF4444',
                    color: '#fff',
                  },
                  iconTheme: {
                    primary: '#fff',
                    secondary: '#EF4444',
                  },
                },
              }}
            />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;