import React, { useState, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import { 
  Home, Package, Download, Upload, Settings, 
  History, RotateCcw, Plus, BarChart3, Menu, FileSpreadsheet, ShoppingCart,
  FileText, ClipboardEdit, MapPin, BookOpen, Bell
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
    { id: 'transfer', name: '제품 위치 이동', icon: MapPin },
    { id: 'daily-closing', name: '일일 수불부', icon: BookOpen },
    { id: 'stock-alert', name: '재고 부족 알림', icon: Bell },
    { id: 'purchase-order', name: '발주', icon: ShoppingCart },
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
        { id: 'settings-notifications', name: '알림' }
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
      case 'batch-process':
        return <BatchProcess />;
      case 'daily-closing':
        return <DailyClosing />;
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
      case 'purchase-order':
        return <PurchaseOrder resetKey={purchaseOrderResetKey} />;
      case 'return-management':
        return <ReturnManagement />;
      case 'stock-alert':
        return <StockAlert />;
      case 'analysis-summary':
      case 'past-quantity':
      case 'analysis-dashboard':
      case 'inventory-analysis':
      case 'sales-analysis':
      case 'data-management':
      case 'adjustment-analysis':
        return <Analysis type={activePage} />;
      case 'settings-general':
      case 'settings-users':
      case 'settings-notifications':
        return <SettingsPage type={activePage} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <BrowserRouter>
      <DataProvider>
        <ToastProvider>
          <AppContext.Provider value={{ activePage, setActivePage }}>
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
                  // 발주 메뉴를 클릭할 때마다 resetKey를 증가시켜 기본 페이지로 돌아가도록 함
                  if (item.id === 'purchase-order') {
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