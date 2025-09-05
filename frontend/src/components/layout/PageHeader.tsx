import React from 'react';
import { LucideIcon, HelpCircle, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  showHelp?: boolean;
  onHelpClick?: () => void;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs,
  actions,
  showHelp = false,
  onHelpClick,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {/* 브레드크럼 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight size={16} className="mx-2 text-gray-400" />
                )}
                {item.href || item.onClick ? (
                  <a
                    href={item.href}
                    onClick={item.onClick}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-gray-700 font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      
      {/* 헤더 메인 */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon size={24} className="text-blue-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              {title}
              {showHelp && (
                <button
                  onClick={onHelpClick}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="도움말"
                >
                  <HelpCircle size={20} className="text-gray-400" />
                </button>
              )}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// 탭 헤더 컴포넌트
interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabHeaderProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
  actions?: React.ReactNode;
}

export function TabHeader({
  tabs,
  activeTab,
  onTabChange,
  actions
}: TabHeaderProps) {
  return (
    <div className="border-b bg-white">
      <div className="flex items-center justify-between">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                px-6 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {actions && (
          <div className="px-4 py-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

// 섹션 헤더 컴포넌트
interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function SectionHeader({
  title,
  description,
  actions,
  size = 'md'
}: SectionHeaderProps) {
  const sizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };
  
  const titleStyles = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };
  
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className={`font-semibold text-gray-900 ${titleStyles[size]}`}>
          {title}
        </h2>
        {description && (
          <p className={`mt-1 text-gray-500 ${sizeStyles[size]}`}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}