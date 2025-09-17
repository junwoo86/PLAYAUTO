import React, { useState, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { Toaster } from 'react-hot-toast';
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

// 페이지 컴포넌트 레이지 로딩
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProductList = lazy(() => import('./pages/ProductList'));
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

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['analysis']);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [purchaseOrderResetKey, setPurchaseOrderResetKey] = useState(0);
  const [purchaseOrderData, setPurchaseOrderData] = useState<any>(null);
  
  // URL 경로에 따른 초기 페이지 설정
  React.useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/daily-closing')) {
      setActivePage('daily-closing');
    }
  }, []);
  
  // 메뉴 아이템 설정
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
    { id: 'transfer', name: '제품 위치 이동', icon: MapPin },
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
        { id: 'past-quantity', name: '과거 수량 조회' },
        { id: 'analysis-dashboard', name: '대시보드' },
        { id: 'inventory-analysis', name: '재고 분석' },
        { id: 'adjustment-analysis', name: '조정 이력 분석' },
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
        { id: 'settings-notifications', name: '알림' },
        { id: 'scheduler-monitoring', name: '스케줄러 모니터링' }
      ]
    }
  ];

  // 페이지 컨텐츠 렌더링
  const renderPageContent = () => {
    switch(activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductList />;
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
        return <PurchaseOrder resetKey={purchaseOrderResetKey} initialData={purchaseOrderData} />;
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
      case 'settings-general':
      case 'settings-users':
      case 'settings-notifications':
        return <SettingsPage type={activePage} />;
      case 'scheduler-monitoring':
        return <SchedulerMonitoring />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <BrowserRouter>
      <DataProvider>
        <ToastProvider>
          <AppContext.Provider value={{ activePage, setActivePage, purchaseOrderData, setPurchaseOrderData }}>
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
            <div className="flex h-screen bg-gray-50">
              {/* 사이드바 */}
              <Sidebar
                logo={{
                  full: <h1 className="font-bold text-xl text-gray-800">BIOCOM</h1>,
                  collapsed: <h1 className="font-bold text-sm text-gray-800">BC</h1>
                }}
                menuItems={menuItems}
                activeItem={activePage}
                onItemClick={(item) => {
                  setActivePage(item.id);
                  // 발주 메뉴를 직접 클릭했을 때만 resetKey 증가 (purchaseOrderData가 없을 때만)
                  if (item.id === 'purchase-order' && !purchaseOrderData) {
                    setPurchaseOrderResetKey(prev => prev + 1);
                  }
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
                  user={{ name: '사용자' }}
                  notifications={{ count: 0 }}
                  onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  onHelpClick={() => {}}
                  actions={
                    <button className="text-gray-500 hover:text-gray-700">
                      사용 가이드
                    </button>
                  }
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
        </ToastProvider>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;