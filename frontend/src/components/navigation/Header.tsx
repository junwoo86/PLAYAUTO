import React from 'react';
import { Menu, Bell, User, HelpCircle, Settings, Search, ChevronDown } from 'lucide-react';

interface HeaderProps {
  title?: string;
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  notifications?: {
    count: number;
    items?: Array<{
      id: string;
      title: string;
      time: string;
      read?: boolean;
    }>;
  };
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  onHelpClick?: () => void;
  onSettingsClick?: () => void;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
  className?: string;
}

export function Header({
  title,
  user,
  notifications,
  onMenuClick,
  onNotificationClick,
  onProfileClick,
  onHelpClick,
  onSettingsClick,
  showSearch = false,
  searchValue,
  onSearchChange,
  actions,
  className = ''
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  
  return (
    <header className={`bg-white shadow-sm px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* 좌측 영역 */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="메뉴 토글"
            >
              <Menu size={24} className="text-gray-600" />
            </button>
          )}
          
          {title && (
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          )}
          
          {showSearch && (
            <div className="relative ml-4">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="검색..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
        
        {/* 우측 영역 */}
        <div className="flex items-center gap-2">
          {actions}
          
          {onHelpClick && (
            <button
              onClick={onHelpClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="도움말"
            >
              <HelpCircle size={20} className="text-gray-600" />
            </button>
          )}
          
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="설정"
            >
              <Settings size={20} className="text-gray-600" />
            </button>
          )}
          
          {/* 알림 */}
          {notifications && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  onNotificationClick?.();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                aria-label="알림"
              >
                <Bell size={20} className="text-gray-600" />
                {notifications.count > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              {showNotifications && notifications.items && (
                <NotificationDropdown 
                  notifications={notifications.items}
                  onClose={() => setShowNotifications(false)}
                />
              )}
            </div>
          )}
          
          {/* 사용자 메뉴 */}
          {user && (
            <div className="relative ml-3">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  onProfileClick?.();
                }}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User size={16} className="text-gray-600" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">{user.name}</span>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              
              {showUserMenu && (
                <UserDropdown 
                  user={user}
                  onClose={() => setShowUserMenu(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// 알림 드롭다운
interface NotificationDropdownProps {
  notifications: Array<{
    id: string;
    title: string;
    time: string;
    read?: boolean;
  }>;
  onClose: () => void;
}

function NotificationDropdown({ notifications, onClose }: NotificationDropdownProps) {
  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">알림</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              새로운 알림이 없습니다
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 border-b last:border-b-0 ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <p className="text-sm text-gray-900">{notification.title}</p>
                <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t">
          <button className="text-sm text-blue-600 hover:text-blue-700">
            모든 알림 보기
          </button>
        </div>
      </div>
    </>
  );
}

// 사용자 드롭다운
interface UserDropdownProps {
  user: {
    name: string;
    email?: string;
  };
  onClose: () => void;
}

function UserDropdown({ user, onClose }: UserDropdownProps) {
  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4 border-b">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          {user.email && (
            <p className="text-xs text-gray-500 mt-1">{user.email}</p>
          )}
        </div>
        <div className="py-1">
          <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            프로필
          </a>
          <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            설정
          </a>
          <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            도움말
          </a>
        </div>
        <div className="border-t py-1">
          <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            로그아웃
          </a>
        </div>
      </div>
    </>
  );
}