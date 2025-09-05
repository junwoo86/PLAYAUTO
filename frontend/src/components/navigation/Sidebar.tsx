import React from 'react';
import { LucideIcon, ChevronDown } from 'lucide-react';

// 메뉴 아이템 타입 정의
export interface MenuItem {
  id: string;
  name: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: {
    text: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
  };
  progress?: number;
  submenu?: MenuItem[];
}

// 사이드바 Props
interface SidebarProps {
  logo?: {
    full: React.ReactNode;
    collapsed: React.ReactNode;
  };
  menuItems: MenuItem[];
  activeItem?: string;
  onItemClick?: (item: MenuItem) => void;
  collapsed?: boolean;
  expandedMenus?: string[];
  onToggleMenu?: (menuId: string) => void;
  footer?: React.ReactNode;
  className?: string;
}

const badgeColors = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  gray: 'bg-gray-100 text-gray-600'
};

export function Sidebar({
  logo,
  menuItems,
  activeItem,
  onItemClick,
  collapsed = false,
  expandedMenus = [],
  onToggleMenu,
  footer,
  className = ''
}: SidebarProps) {
  const handleItemClick = (item: MenuItem, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (item.submenu && onToggleMenu) {
      onToggleMenu(item.id);
    } else if (item.onClick) {
      item.onClick();
    } else if (onItemClick) {
      onItemClick(item);
    }
  };
  
  const isItemActive = (item: MenuItem): boolean => {
    if (item.id === activeItem) return true;
    if (item.submenu) {
      return item.submenu.some(subItem => subItem.id === activeItem);
    }
    return false;
  };
  
  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isActive = isItemActive(item);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    
    return (
      <div key={item.id}>
        <a
          href={item.href || '#'}
          onClick={(e) => handleItemClick(item, e)}
          className={`
            flex items-center justify-between
            ${level === 0 ? 'px-4 py-3' : 'px-12 py-2'}
            hover:bg-gray-100 cursor-pointer transition-colors
            ${isActive ? 'bg-teal-500 text-white hover:bg-teal-600' : 'text-gray-700'}
            ${collapsed && level === 0 ? 'justify-center' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            {item.icon && (
              <item.icon size={20} className={collapsed && level === 0 ? '' : ''} />
            )}
            {!collapsed && (
              <>
                <span className={`${level === 0 ? 'text-sm' : 'text-sm'}`}>
                  {item.name}
                </span>
                {item.badge && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-white bg-opacity-20 text-white' : badgeColors[item.badge.color || 'gray']
                  }`}>
                    {item.badge.text}
                  </span>
                )}
                {item.progress !== undefined && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-white text-teal-600' : 'bg-teal-100 text-teal-600'
                  }`}>
                    {item.progress}%
                  </span>
                )}
              </>
            )}
          </div>
          {!collapsed && hasSubmenu && (
            <ChevronDown
              size={16}
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          )}
        </a>
        
        {/* 서브메뉴 */}
        {!collapsed && hasSubmenu && isExpanded && (
          <div className="bg-gray-50">
            {item.submenu!.map(subItem => renderMenuItem(subItem, 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <aside className={`
      ${collapsed ? 'w-16' : 'w-64'}
      bg-white shadow-lg transition-all duration-300 flex flex-col
      ${className}
    `}>
      {/* 로고 영역 */}
      {logo && (
        <div className="p-4 border-b">
          {collapsed ? logo.collapsed : logo.full}
        </div>
      )}
      
      {/* 메뉴 영역 */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
      
      {/* 푸터 영역 */}
      {footer && (
        <div className="p-4 border-t">
          {footer}
        </div>
      )}
    </aside>
  );
}

// 미니 사이드바 아이템 (collapsed 상태용)
interface MiniSidebarItemProps {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}

export function MiniSidebarItem({ item, isActive, onClick }: MiniSidebarItemProps) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          w-full p-3 flex justify-center items-center rounded-lg transition-colors
          ${isActive ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}
        `}
      >
        {item.icon && <item.icon size={20} />}
      </button>
      
      {/* 툴팁 */}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 
                      hidden group-hover:block">
        <div className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap">
          {item.name}
          {item.badge && (
            <span className="ml-2 px-1.5 py-0.5 bg-white bg-opacity-20 rounded text-xs">
              {item.badge.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}