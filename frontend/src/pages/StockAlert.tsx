import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Bell, Package, ShoppingCart, TrendingDown, RefreshCw, CheckCircle, X
} from 'lucide-react';
import { productAPI } from '../services/api/product';
import toast, { Toaster } from 'react-hot-toast';

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  current_stock: number;
  safety_stock: number;
  min_stock: number;
  max_stock: number;
  moq: number;
  supplier: string;
  supplier_email: string;
  location: string;
  unit: string;
  is_active: boolean;
}

interface StockAlert {
  product: Product;
  alertLevel: 'danger' | 'warning' | 'low';
  shortage: number;
  percentage: number;
  suggestedOrderQuantity: number;
}

const StockAlertPage: React.FC = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<'all' | 'danger' | 'warning' | 'low'>('all');
  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    fetchStockAlerts();
  }, []);

  const fetchStockAlerts = async () => {
    setIsLoading(true);
    try {
      const response = await productAPI.getAll();
      const products: Product[] = response.data;
      
      // 재고 부족 제품 필터링 및 알림 생성
      const stockAlerts: StockAlert[] = products
        .filter(product => product.is_active && product.current_stock <= product.safety_stock)
        .map(product => {
          const shortage = product.safety_stock - product.current_stock;
          const percentage = product.safety_stock > 0 
            ? (product.current_stock / product.safety_stock) * 100 
            : 0;
          
          // 알림 레벨 결정
          let alertLevel: 'danger' | 'warning' | 'low';
          if (product.current_stock <= product.min_stock) {
            alertLevel = 'danger';
          } else if (product.current_stock <= product.safety_stock * 0.5) {
            alertLevel = 'warning';
          } else {
            alertLevel = 'low';
          }
          
          // 권장 발주 수량 계산
          const targetStock = product.max_stock || product.safety_stock * 2;
          const suggestedQuantity = targetStock - product.current_stock;
          const suggestedOrderQuantity = Math.ceil(suggestedQuantity / product.moq) * product.moq;
          
          return {
            product,
            alertLevel,
            shortage,
            percentage,
            suggestedOrderQuantity
          };
        })
        .sort((a, b) => {
          // 위험도 순으로 정렬
          const levelOrder = { danger: 0, warning: 1, low: 2 };
          return levelOrder[a.alertLevel] - levelOrder[b.alertLevel];
        });
      
      setAlerts(stockAlerts);
      
      // 위험 수준 알림 표시
      const dangerCount = stockAlerts.filter(a => a.alertLevel === 'danger').length;
      const warningCount = stockAlerts.filter(a => a.alertLevel === 'warning').length;
      
      if (dangerCount > 0) {
        toast.error(`긴급: ${dangerCount}개 제품이 최소 재고 이하입니다!`);
      } else if (warningCount > 0) {
        toast.warning(`경고: ${warningCount}개 제품의 재고가 부족합니다`);
      }
    } catch (error) {
      console.error('재고 알림 조회 실패:', error);
      toast.error('재고 알림 데이터를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 필터링된 알림
  const filteredAlerts = filterLevel === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.alertLevel === filterLevel);

  // 알림 레벨별 스타일
  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-800'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-700',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'text-gray-600',
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // 발주 제안 모달
  const OrderSuggestionModal = ({ alert, onClose }: { alert: StockAlert; onClose: () => void }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">발주 제안</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700">제품 정보</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {alert.product.product_name}
              </p>
              <p className="text-sm text-gray-600">{alert.product.product_code}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">현재 재고</p>
                <p className="text-lg font-semibold text-red-600">
                  {alert.product.current_stock}{alert.product.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">안전 재고</p>
                <p className="text-lg font-semibold text-gray-900">
                  {alert.product.safety_stock}{alert.product.unit}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700">권장 발주 정보</p>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">권장 발주 수량:</span>
                  <span className="font-semibold text-blue-600">
                    {alert.suggestedOrderQuantity}{alert.product.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">최소 발주 단위:</span>
                  <span className="font-medium">{alert.product.moq}{alert.product.unit}</span>
                </div>
                {alert.product.supplier && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">공급업체:</span>
                    <span className="font-medium">{alert.product.supplier}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  toast.success('발주 페이지로 이동합니다');
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ShoppingCart className="inline h-4 w-4 mr-2" />
                발주 진행
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <Toaster position="top-right" />
      
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">재고 부족 알림</h1>
        <p className="mt-2 text-gray-600">안전 재고 이하 제품을 관리하고 발주를 제안합니다</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 알림</p>
              <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            </div>
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">긴급</p>
              <p className="text-2xl font-bold text-red-600">
                {alerts.filter(a => a.alertLevel === 'danger').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">경고</p>
              <p className="text-2xl font-bold text-yellow-600">
                {alerts.filter(a => a.alertLevel === 'warning').length}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">주의</p>
              <p className="text-2xl font-bold text-blue-600">
                {alerts.filter(a => a.alertLevel === 'low').length}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* 필터 및 새로고침 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">필터:</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 보기</option>
              <option value="danger">긴급</option>
              <option value="warning">경고</option>
              <option value="low">주의</option>
            </select>
          </div>
          
          <button
            onClick={fetchStockAlerts}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300"
          >
            {isLoading ? (
              <>
                <RefreshCw className="inline h-4 w-4 mr-2 animate-spin" />
                새로고침 중...
              </>
            ) : (
              <>
                <RefreshCw className="inline h-4 w-4 mr-2" />
                새로고침
              </>
            )}
          </button>
        </div>
      </div>

      {/* 알림 목록 */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">재고 알림을 확인하는 중...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">재고 부족 제품이 없습니다</p>
            <p className="text-sm text-gray-500 mt-1">모든 제품의 재고가 안전 수준입니다</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const style = getAlertStyle(alert.alertLevel);
            return (
              <div
                key={alert.product.id}
                className={`${style.bg} border ${style.border} rounded-lg p-4 transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${style.badge}`}>
                      {alert.alertLevel === 'danger' ? (
                        <AlertCircle className="h-6 w-6" />
                      ) : alert.alertLevel === 'warning' ? (
                        <TrendingDown className="h-6 w-6" />
                      ) : (
                        <Package className="h-6 w-6" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {alert.product.product_name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.badge}`}>
                          {alert.alertLevel === 'danger' ? '긴급' : 
                           alert.alertLevel === 'warning' ? '경고' : '주의'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        제품코드: {alert.product.product_code} | 위치: {alert.product.location}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">현재 재고</p>
                          <p className={`font-semibold ${style.text}`}>
                            {alert.product.current_stock}{alert.product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">안전 재고</p>
                          <p className="font-semibold text-gray-900">
                            {alert.product.safety_stock}{alert.product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">부족 수량</p>
                          <p className="font-semibold text-gray-900">
                            {alert.shortage}{alert.product.unit}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">재고율</p>
                          <p className={`font-semibold ${style.text}`}>
                            {alert.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      {alert.product.supplier && (
                        <p className="text-sm text-gray-600 mt-2">
                          공급업체: {alert.product.supplier}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedAlert(alert);
                      setShowOrderModal(true);
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ShoppingCart className="inline h-4 w-4 mr-2" />
                    발주 제안
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 발주 제안 모달 */}
      {showOrderModal && selectedAlert && (
        <OrderSuggestionModal
          alert={selectedAlert}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedAlert(null);
          }}
        />
      )}
    </div>
  );
};

export default StockAlertPage;