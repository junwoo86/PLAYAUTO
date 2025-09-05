import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className = ''
}: EmptyStateProps) {
  const sizeStyles = {
    sm: {
      icon: 40,
      title: 'text-base',
      description: 'text-sm',
      padding: 'py-8'
    },
    md: {
      icon: 48,
      title: 'text-lg',
      description: 'text-base',
      padding: 'py-12'
    },
    lg: {
      icon: 56,
      title: 'text-xl',
      description: 'text-lg',
      padding: 'py-16'
    }
  };
  
  const styles = sizeStyles[size];
  
  return (
    <div className={`text-center ${styles.padding} ${className}`}>
      {Icon && (
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Icon size={styles.icon} className="text-gray-400" />
          </div>
        </div>
      )}
      
      <h3 className={`font-medium text-gray-900 mb-2 ${styles.title}`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-gray-500 mb-6 max-w-md mx-auto ${styles.description}`}>
          {description}
        </p>
      )}
      
      <div className="flex items-center justify-center gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {action.icon && <action.icon size={20} />}
            {action.label}
          </button>
        )}
        
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}

// 로딩 상태 컴포넌트
interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ 
  message = '로딩 중...', 
  size = 'md' 
}: LoadingStateProps) {
  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };
  
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizeStyles[size]} animate-spin rounded-full border-b-2 border-blue-600`}></div>
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );
}

// 에러 상태 컴포넌트
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function ErrorState({
  title = '오류가 발생했습니다',
  message,
  onRetry,
  size = 'md'
}: ErrorStateProps) {
  const sizeStyles = {
    sm: {
      title: 'text-base',
      message: 'text-sm',
      padding: 'py-8'
    },
    md: {
      title: 'text-lg',
      message: 'text-base',
      padding: 'py-12'
    },
    lg: {
      title: 'text-xl',
      message: 'text-lg',
      padding: 'py-16'
    }
  };
  
  const styles = sizeStyles[size];
  
  return (
    <div className={`text-center ${styles.padding}`}>
      <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h3 className={`font-medium text-gray-900 mb-2 ${styles.title}`}>
        {title}
      </h3>
      
      <p className={`text-gray-500 mb-6 ${styles.message}`}>
        {message}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}