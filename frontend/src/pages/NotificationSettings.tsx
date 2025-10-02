import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationAPI } from '../services/api';

interface NotificationSettings {
  low_stock_alert: boolean;
  order_status_change: boolean;
  daily_report: boolean;
  system_error: boolean;
}

export function NotificationSettings() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationSettings>({
    low_stock_alert: false,
    order_status_change: false,
    daily_report: false,
    system_error: false
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 알림 설정 불러오기
  useEffect(() => {
    if (user?.group?.id) {
      setLoading(true);
      notificationAPI.getByGroup(user.group.id)
        .then(response => {
          if (response.settings) {
            setNotifications(response.settings);
          }
        })
        .catch(error => {
          console.error('알림 설정 로드 실패:', error);
          setErrorMessage('알림 설정을 불러오는데 실패했습니다.');
        })
        .finally(() => setLoading(false));
    }
  }, [user]);

  // 알림 설정 저장
  const handleSaveNotifications = async () => {
    try {
      const groupId = user?.group?.id;
      if (!groupId) {
        setErrorMessage('그룹 정보가 없습니다.');
        return;
      }

      await notificationAPI.updateGroupSettings(groupId, notifications);

      setSuccessMessage('알림 설정이 저장되었습니다.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('알림 설정 저장 실패:', error);
      const errorDetail = typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : '알림 설정 저장에 실패했습니다.';
      setErrorMessage(errorDetail);
    }
  };

  // 알림 테스트
  const handleTestNotification = async () => {
    try {
      const groupId = user?.group?.id;
      if (!groupId) {
        setErrorMessage('그룹 정보가 없습니다.');
        return;
      }

      // 활성화된 알림 타입 중 첫 번째를 테스트
      const enabledType = Object.entries(notifications).find(([_, enabled]) => enabled)?.[0];
      if (!enabledType) {
        setErrorMessage('활성화된 알림이 없습니다.');
        return;
      }

      await notificationAPI.testNotification(groupId, enabledType);

      setSuccessMessage('테스트 알림이 전송되었습니다.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('알림 테스트 실패:', error);
      const errorDetail = typeof error.response?.data?.detail === 'string'
        ? error.response.data.detail
        : '테스트 알림 전송에 실패했습니다.';
      setErrorMessage(errorDetail);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell size={20} />
          알림 설정
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* 성공/에러 메시지 */}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {errorMessage}
          </div>
        )}

        {/* 알림 타입별 설정 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">알림 받을 이벤트</h4>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">재고 부족 알림</span>
                <p className="text-xs text-gray-500 mt-1">제품 재고가 최소 수준 이하로 떨어졌을 때</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.low_stock_alert}
                onChange={(e) =>
                  setNotifications({ ...notifications, low_stock_alert: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">발주 상태 변경</span>
                <p className="text-xs text-gray-500 mt-1">발주 상태가 변경되었을 때</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.order_status_change}
                onChange={(e) =>
                  setNotifications({ ...notifications, order_status_change: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">일일 보고서</span>
                <p className="text-xs text-gray-500 mt-1">일일 재고 및 거래 보고서</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.daily_report}
                onChange={(e) =>
                  setNotifications({ ...notifications, daily_report: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <span className="text-sm font-medium text-gray-700">시스템 오류</span>
                <p className="text-xs text-gray-500 mt-1">시스템에 오류가 발생했을 때</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.system_error}
                onChange={(e) =>
                  setNotifications({ ...notifications, system_error: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* 알림 테스트 및 저장 버튼 */}
        <div className="flex justify-between pt-6 border-t">
          <button
            onClick={handleTestNotification}
            disabled={!Object.values(notifications).some(v => v)}
            className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            알림 테스트
          </button>
          <button
            onClick={handleSaveNotifications}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}