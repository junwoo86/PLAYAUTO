import React, { useState, useEffect } from 'react';
import { Settings, Users, Bell, Shield, UserPlus, Key, UserCheck, X, AlertCircle, Edit2 } from 'lucide-react';
import { NotificationSettings } from './NotificationSettings';
import {
  PageHeader,
  Button,
  TextField,
  SelectField,
  SwitchField,
  Alert
} from '../components';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// 권한 코드를 한글 이름으로 매핑
const permissionNameMap: { [key: string]: string } = {
  // 메인 메뉴
  'dashboard': '대시보드',
  'products': '제품 목록',
  'batch-process': '일괄 처리',
  'individual-process': '개별 처리',
  'return-management': '취소 및 반품',
  'warehouses': '창고 관리',
  'daily-closing': '일일 수불부',
  'stock-alert': '재고 부족 알림',
  'purchase-order': '발주 상태 관리',
  'history': '히스토리',
  'analysis': '분석',
  'settings': '설정',

  // 서브 메뉴 - 개별 처리
  'receive': '입고',
  'dispatch': '출고',
  'adjustment': '재고 조정',

  // 서브 메뉴 - 분석
  'analysis-summary': '입출고 요약',
  'past-quantity': '과거 수량 조회',
  'analysis-dashboard': '대시보드',
  'inventory-analysis': '재고 분석',
  'adjustment-analysis': '조정 이력 분석',
  'sales-analysis': '매출 분석',
  'data-management': '데이터 관리',
  'scheduler-monitoring': '스케줄러 모니터링'
};

// 권한 코드를 한글 이름으로 변환하는 함수
const getPermissionName = (code: string): string => {
  return permissionNameMap[code] || code;
};

// 권한 계층 구조 정의 (네비게이션바 순서와 동일)
const permissionHierarchy = [
  { code: 'dashboard', children: [] },
  { code: 'products', children: [] },
  { code: 'batch-process', children: [] },
  {
    code: 'individual-process',
    children: ['receive', 'dispatch', 'adjustment']
  },
  { code: 'return-management', children: [] },
  { code: 'warehouses', children: [] },
  { code: 'daily-closing', children: [] },
  { code: 'stock-alert', children: [] },
  { code: 'purchase-order', children: [] },
  { code: 'history', children: [] },
  {
    code: 'analysis',
    children: [
      'analysis-summary',
      'past-quantity',
      'analysis-dashboard',
      'inventory-analysis',
      'adjustment-analysis',
      'sales-analysis',
      'data-management',
      'scheduler-monitoring'
    ]
  },
  { code: 'settings', children: [] }
];

interface User {
  id: number;
  name: string;
  email: string;
  group?: {
    id: number;
    name: string;
  };
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  created_at: string;
  member_count?: number;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
}

function SettingsPage() {
  const { refreshUser, user } = useAuth();
  const isAdmin = user?.group?.name === '시스템 관리자';
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'notifications'>(
    isAdmin ? 'users' : 'notifications'
  );
  const [saved, setSaved] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '' });
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingGroupPermissions, setEditingGroupPermissions] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUserData, setEditingUserData] = useState<{
    name: string;
    group_id: number | null;
    status: 'active' | 'inactive' | 'pending';
  }>({ name: '', group_id: null, status: 'active' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 실제 데이터
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 사용자 목록 불러오기
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
      setError('사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 그룹 목록 불러오기
  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      // 각 그룹의 멤버 수 계산
      const groupsWithMemberCount = await Promise.all(
        response.data.map(async (group: Group) => {
          const usersResponse = await api.get('/users');
          const memberCount = usersResponse.data.filter((user: User) =>
            user.group?.id === group.id
          ).length;
          return { ...group, member_count: memberCount };
        })
      );
      setGroups(groupsWithMemberCount);
    } catch (error) {
      console.error('그룹 목록 조회 실패:', error);
    }
  };

  // 전체 권한 목록 불러오기
  const fetchAllPermissions = async () => {
    try {
      const response = await api.get('/groups/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('권한 목록 조회 실패:', error);
    }
  };

  // 알림 설정은 NotificationSettings 컴포넌트에서 직접 처리

  // 데이터 로드
  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      fetchUsers();
      fetchGroups(); // 사용자 탭에서도 그룹 목록 필요 (그룹 할당 모달용)
    } else if (activeTab === 'groups' && isAdmin) {
      fetchGroups();
      fetchAllPermissions();
    }
    // 알림 설정은 NotificationSettings 컴포넌트에서 직접 처리
  }, [activeTab, isAdmin]);

  // 사용자 승인 처리
  const handleApproveUser = async (userId: number) => {
    try {
      await api.put(`/users/${userId}/status`, { status: 'active' });
      await fetchUsers();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('사용자 승인 실패:', error);
      setError('사용자 승인에 실패했습니다.');
    }
  };

  // 사용자 거부 처리
  const handleRejectUser = async (userId: number) => {
    try {
      await api.delete(`/users/${userId}`);
      await fetchUsers();
    } catch (error) {
      console.error('사용자 거부 실패:', error);
      setError('사용자 거부에 실패했습니다.');
    }
  };

  // 그룹 할당
  const handleAssignGroup = async (userId: number, groupId: number) => {
    try {
      await api.put(`/users/${userId}/group`, { group_id: groupId });
      await api.put(`/users/${userId}/status`, { status: 'active' });
      await fetchUsers();
      setShowAssignGroupModal(false);
      setSelectedUser(null);
      setSelectedGroupId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('그룹 할당 실패:', error);
      setError('그룹 할당에 실패했습니다.');
    }
  };

  // 사용자 상태 변경
  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await api.put(`/users/${userId}/status`, { status: newStatus });
      await fetchUsers();
    } catch (error) {
      console.error('상태 변경 실패:', error);
      setError('상태 변경에 실패했습니다.');
    }
  };

  // 그룹 생성
  const handleCreateGroup = async () => {
    if (!newGroupData.name.trim()) {
      setErrorMessage('그룹 이름을 입력하세요.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    try {
      await api.post('/groups', {
        name: newGroupData.name.trim(),
        description: newGroupData.description.trim() || null
      });

      await fetchGroups();
      setShowAddGroupModal(false);
      setNewGroupData({ name: '', description: '' });
      setSuccessMessage('새 그룹이 생성되었습니다.');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('그룹 생성 실패:', error);
      setErrorMessage(error.response?.data?.detail || '그룹 생성에 실패했습니다.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  // 사용자 정보 업데이트
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      // 사용자 이름 업데이트
      if (editingUserData.name !== selectedUser.name) {
        await api.put(`/users/${selectedUser.id}`, {
          name: editingUserData.name
        });
      }

      // 그룹 업데이트
      if (editingUserData.group_id !== selectedUser.group?.id) {
        if (editingUserData.group_id) {
          await api.put(`/users/${selectedUser.id}/group`, {
            group_id: editingUserData.group_id
          });
        }
      }

      // 상태 업데이트 (pending → active 포함)
      if (editingUserData.status !== selectedUser.status) {
        await api.put(`/users/${selectedUser.id}/status`, {
          status: editingUserData.status
        });
      }

      await fetchUsers();
      setShowEditUserModal(false);
      setSelectedUser(null);
      setEditingUserData({ name: '', group_id: null, status: 'active' });
      setSuccessMessage('사용자 정보가 업데이트되었습니다.');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('사용자 정보 업데이트 실패:', error);
      setErrorMessage('사용자 정보 업데이트에 실패했습니다.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };



  // 알림 설정 저장
  const handleSaveNotifications = async () => {
    try {
      const groupId = user?.group?.id;
      if (!groupId) {
        setErrorMessage('그룹 정보가 없습니다.');
        setShowError(true);
        return;
      }

      await api.put(`/notifications/group/${groupId}`, {
        enabled: notifications.enabled,
        email_enabled: notifications.email,
        webhook_enabled: notifications.webhook,
        webhook_url: notifications.webhookUrl,
        event_types: Object.entries(notifications.events)
          .filter(([_, enabled]) => enabled)
          .map(([type]) => type)
      });

      setSuccessMessage('알림 설정이 저장되었습니다.');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('알림 설정 저장 실패:', error);
      setErrorMessage(error.response?.data?.detail || '알림 설정 저장에 실패했습니다.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  // 알림 테스트
  const handleTestNotification = async () => {
    try {
      const groupId = user?.group?.id;
      if (!groupId) {
        setErrorMessage('그룹 정보가 없습니다.');
        setShowError(true);
        return;
      }

      // 활성화된 이벤트 중 첫 번째로 테스트
      const activeEvents = Object.entries(notifications.events)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => type);

      if (activeEvents.length === 0) {
        setErrorMessage('활성화된 이벤트가 없습니다.');
        setShowError(true);
        setTimeout(() => setShowError(false), 3000);
        return;
      }

      await api.post('/notifications/test', null, {
        params: {
          group_id: groupId,
          event_type: activeEvents[0]
        }
      });

      setSuccessMessage('테스트 알림이 전송되었습니다.');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error: any) {
      console.error('알림 테스트 실패:', error);
      setErrorMessage(error.response?.data?.detail || '알림 테스트에 실패했습니다.');
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'users':
        if (!isAdmin) return null;
        return (
          <div className="space-y-6">
            {/* 에러 메시지 */}
            {error && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </Alert>
            )}

            {/* 사용자 목록 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users size={20} />
                    사용자 목록
                  </h3>
                  <div className="flex items-center gap-2">
                    {users.filter(u => u.status === 'pending').length > 0 && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        승인 대기: {users.filter(u => u.status === 'pending').length}명
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사용자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이메일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        그룹
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          로딩 중...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                          사용자가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      users.map((currentUser) => (
                        <tr key={currentUser.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {currentUser.name.charAt(0)}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {currentUser.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{currentUser.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              currentUser.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : currentUser.group
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {currentUser.status === 'pending' ? '승인 대기' : currentUser.group?.name || '미할당'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              currentUser.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : currentUser.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {currentUser.status === 'active' ? '활성' : currentUser.status === 'pending' ? '승인 대기' : '비활성'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                setSelectedUser(currentUser);
                                setEditingUserData({
                                  name: currentUser.name,
                                  group_id: currentUser.group?.id || null,
                                  status: currentUser.status
                                });
                                setShowEditUserModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Edit2 size={14} />
                              편집
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'groups':
        if (!isAdmin) return null;
        return (
          <div className="space-y-6">
            {/* 그룹 목록 */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield size={20} />
                    그룹 및 권한 관리
                  </h3>
                  <button
                    onClick={() => setShowAddGroupModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <UserPlus size={20} />
                    그룹 추가
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid gap-4">
                  {groups.map((group) => (
                    <div key={group.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{group.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {group.member_count || 0}명
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm text-gray-600">권한:</div>
                        <div className="flex flex-wrap gap-2">
                          {group.permissions
                            .filter((permission) => permission !== 'transfer')
                            .map((permission, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {getPermissionName(permission)}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingGroup(group);
                            // 현재 그룹의 권한을 permission ID 배열로 변환
                            const currentPermissionIds = permissions
                              .filter(p => group.permissions.includes(p.code))
                              .map(p => p.id);
                            setEditingGroupPermissions(currentPermissionIds);
                            setShowEditGroupModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm flex items-center gap-1"
                        >
                          <Edit2 size={14} />
                          편집
                        </button>
                        {group.member_count === 0 && (
                          <button className="text-red-600 hover:text-red-900 text-sm">
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <NotificationSettings />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        </div>
      </div>

      {/* Success Alert */}
      {(saved || showSuccess) && (
        <Alert className="mb-4">
          <UserCheck className="h-4 w-4" />
          <span>{successMessage || '설정이 저장되었습니다.'}</span>
        </Alert>
      )}

      {/* Error Alert */}
      {showError && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-800">{errorMessage}</span>
        </Alert>
      )}

      {/* Tabs */}
      <nav className="flex space-x-8 mb-6 border-b">
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={18} />
              사용자 관리
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'groups'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Shield size={18} />
              그룹 및 권한
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Bell size={18} />
          알림 설정
        </button>
      </nav>

      {/* Tab Content */}
      {renderTabContent()}

      {/* 그룹 편집 모달 */}
      {showEditGroupModal && editingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield size={20} />
                그룹 권한 편집
              </h3>
              <button
                onClick={() => {
                  setShowEditGroupModal(false);
                  setEditingGroup(null);
                  setEditingGroupPermissions([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900">{editingGroup.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{editingGroup.description}</p>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">권한 선택</h4>
              <div className="space-y-1 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                {permissionHierarchy.map((parent) => {
                  const parentPermission = permissions.find(p => p.code === parent.code);
                  if (!parentPermission) return null;

                  const childPermissions = parent.children
                    .map(childCode => permissions.find(p => p.code === childCode))
                    .filter(Boolean) as Permission[];

                  const isParentChecked = editingGroupPermissions.includes(parentPermission.id);
                  const checkedChildrenCount = childPermissions.filter(child =>
                    editingGroupPermissions.includes(child.id)
                  ).length;
                  const isIndeterminate = checkedChildrenCount > 0 && checkedChildrenCount < childPermissions.length;

                  return (
                    <div key={parentPermission.id}>
                      {/* 부모 권한 */}
                      <label className="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isParentChecked}
                          ref={input => {
                            if (input) {
                              input.indeterminate = isIndeterminate;
                            }
                          }}
                          onChange={(e) => {
                            const newPermissions = [...editingGroupPermissions];

                            if (e.target.checked) {
                              // 부모와 모든 자식 추가
                              if (!newPermissions.includes(parentPermission.id)) {
                                newPermissions.push(parentPermission.id);
                              }
                              childPermissions.forEach(child => {
                                if (!newPermissions.includes(child.id)) {
                                  newPermissions.push(child.id);
                                }
                              });
                            } else {
                              // 부모와 모든 자식 제거
                              const idsToRemove = [parentPermission.id, ...childPermissions.map(c => c.id)];
                              setEditingGroupPermissions(newPermissions.filter(id => !idsToRemove.includes(id)));
                              return;
                            }

                            setEditingGroupPermissions(newPermissions);
                          }}
                          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">
                              {getPermissionName(parentPermission.code)}
                            </span>
                            {parent.children.length > 0 && (
                              <span className="text-xs text-gray-500">
                                ({checkedChildrenCount}/{childPermissions.length})
                              </span>
                            )}
                          </div>
                        </div>
                      </label>

                      {/* 자식 권한들 */}
                      {childPermissions.length > 0 && (
                        <div className="ml-8 space-y-1">
                          {childPermissions.map(childPermission => (
                            <label
                              key={childPermission.id}
                              className="flex items-start p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={editingGroupPermissions.includes(childPermission.id)}
                                onChange={(e) => {
                                  const newPermissions = [...editingGroupPermissions];

                                  if (e.target.checked) {
                                    newPermissions.push(childPermission.id);

                                    // 모든 자식이 선택되면 부모도 선택
                                    const allChildrenChecked = childPermissions.every(c =>
                                      c.id === childPermission.id || newPermissions.includes(c.id)
                                    );
                                    if (allChildrenChecked && !newPermissions.includes(parentPermission.id)) {
                                      newPermissions.push(parentPermission.id);
                                    }
                                  } else {
                                    // 자식 제거
                                    const index = newPermissions.indexOf(childPermission.id);
                                    if (index > -1) {
                                      newPermissions.splice(index, 1);
                                    }

                                    // 부모도 제거 (자식이 하나라도 해제되면)
                                    const parentIndex = newPermissions.indexOf(parentPermission.id);
                                    if (parentIndex > -1) {
                                      newPermissions.splice(parentIndex, 1);
                                    }
                                  }

                                  setEditingGroupPermissions(newPermissions);
                                }}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="ml-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-700">
                                    {getPermissionName(childPermission.code)}
                                  </span>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {editingGroupPermissions.length}개 권한 선택됨
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEditGroupModal(false);
                    setEditingGroup(null);
                    setEditingGroupPermissions([]);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    try {
                      await api.put(`/groups/${editingGroup.id}/permissions`, {
                        permission_ids: editingGroupPermissions
                      });
                      await fetchGroups();
                      await refreshUser(); // 사용자 정보 새로고침하여 네비게이션 업데이트
                      setShowEditGroupModal(false);
                      setEditingGroup(null);
                      setEditingGroupPermissions([]);
                      setSuccessMessage('그룹 권한이 업데이트되었습니다.');
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 3000);
                    } catch (error: any) {
                      console.error('권한 업데이트 실패:', error);
                      setErrorMessage(error.response?.data?.detail || '권한 업데이트에 실패했습니다.');
                      setShowError(true);
                      setTimeout(() => setShowError(false), 3000);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사용자 편집 모달 */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users size={20} />
                사용자 정보 편집
              </h3>
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setSelectedUser(null);
                  setEditingUserData({ name: '', group_id: null, status: 'active' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 이름 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={editingUserData.name}
                  onChange={(e) => setEditingUserData({ ...editingUserData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="사용자 이름"
                />
              </div>

              {/* 이메일 (읽기 전용) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이메일
                </label>
                <input
                  type="text"
                  value={selectedUser.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              {/* 그룹 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  그룹
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingUserData.group_id || ''}
                  onChange={(e) => setEditingUserData({ ...editingUserData, group_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">그룹 없음</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 상태 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  상태
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingUserData.status}
                  onChange={(e) => setEditingUserData({ ...editingUserData, status: e.target.value as 'active' | 'inactive' | 'pending' })}
                  disabled={selectedUser.id === user?.id} // 자기 자신의 상태는 변경 불가
                >
                  {selectedUser.status === 'pending' && (
                    <option value="pending">승인 대기</option>
                  )}
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </select>
                {selectedUser.id === user?.id && (
                  <p className="text-xs text-gray-500 mt-1">
                    자신의 상태는 변경할 수 없습니다.
                  </p>
                )}
              </div>

              {/* 승인 대기 상태 알림 */}
              {selectedUser.status === 'pending' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    이 사용자는 현재 승인 대기 상태입니다. 그룹을 할당하고 활성 상태로 변경하면 로그인할 수 있습니다.
                  </p>
                </div>
              )}

            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditUserModal(false);
                  setSelectedUser(null);
                  setEditingUserData({ name: '', group_id: null, status: 'active' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 그룹 추가 모달 */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus size={20} />
                새 그룹 추가
              </h3>
              <button
                onClick={() => {
                  setShowAddGroupModal(false);
                  setNewGroupData({ name: '', description: '' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 그룹 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  그룹 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newGroupData.name}
                  onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 재고 관리팀"
                  autoFocus
                />
              </div>

              {/* 그룹 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  그룹 설명
                </label>
                <textarea
                  value={newGroupData.description}
                  onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="그룹에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              {/* 안내 메시지 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  그룹을 생성한 후 '편집' 버튼을 통해 권한을 설정할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddGroupModal(false);
                  setNewGroupData({ name: '', description: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 할당 모달 */}
      {showAssignGroupModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">그룹 할당</h3>
              <button
                onClick={() => {
                  setShowAssignGroupModal(false);
                  setSelectedUser(null);
                  setSelectedGroupId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {selectedUser.name} ({selectedUser.email})님에게 그룹을 할당합니다.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                그룹 선택
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(Number(e.target.value))}
              >
                <option value="">그룹을 선택하세요</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} - {group.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAssignGroupModal(false);
                  setSelectedUser(null);
                  setSelectedGroupId(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (selectedGroupId && selectedUser) {
                    handleAssignGroup(selectedUser.id, selectedGroupId);
                  }
                }}
                disabled={!selectedGroupId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                할당
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;