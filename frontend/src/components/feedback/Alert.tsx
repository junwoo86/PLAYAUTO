import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info, X } from 'lucide-react';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  closable?: boolean;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const alertStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
    text: 'text-blue-900',
    action: 'text-blue-600 hover:text-blue-700'
  },
  success: {
    container: 'bg-green-50 border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    text: 'text-green-900',
    action: 'text-green-600 hover:text-green-700'
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    icon: AlertCircle,
    iconColor: 'text-yellow-500',
    text: 'text-yellow-900',
    action: 'text-yellow-600 hover:text-yellow-700'
  },
  error: {
    container: 'bg-red-50 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
    text: 'text-red-900',
    action: 'text-red-600 hover:text-red-700'
  }
};

export function Alert({
  type = 'info',
  title,
  message,
  closable = false,
  onClose,
  action,
  className = ''
}: AlertProps) {
  const styles = alertStyles[type];
  const Icon = styles.icon;
  
  return (
    <div className={`p-4 border rounded-lg ${styles.container} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${styles.text} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${styles.text}`}>
            <p>{message}</p>
            {action && (
              <button
                onClick={action.onClick}
                className={`mt-2 text-sm font-medium ${styles.action} underline`}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
        {closable && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${styles.text} hover:bg-white hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-white`}
            >
              <span className="sr-only">닫기</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 토스트 알림 컴포넌트
interface ToastProps extends AlertProps {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function Toast({
  type = 'info',
  title,
  message,
  duration = 5000,
  position = 'top-right',
  onClose,
  className = ''
}: ToastProps) {
  const [visible, setVisible] = React.useState(true);
  
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  if (!visible) return null;
  
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };
  
  const styles = alertStyles[type];
  const Icon = styles.icon;
  
  return (
    <div className={`fixed ${positionStyles[position]} z-50 ${className}`}>
      <div className={`p-4 rounded-lg shadow-lg border ${styles.container} min-w-[300px] max-w-md animate-slide-in`}>
        <div className="flex items-start">
          <Icon className={`h-5 w-5 ${styles.iconColor} mt-0.5`} />
          <div className="ml-3 flex-1">
            {title && (
              <p className={`text-sm font-medium ${styles.text}`}>
                {title}
              </p>
            )}
            <p className={`text-sm ${styles.text} ${title ? 'mt-1' : ''}`}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              onClose?.();
            }}
            className={`ml-4 inline-flex ${styles.text} hover:bg-white hover:bg-opacity-20 rounded-md p-1`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 인라인 알림 컴포넌트 (폼 필드용)
interface InlineAlertProps {
  type?: 'error' | 'warning' | 'success';
  message: string;
}

export function InlineAlert({ 
  type = 'error', 
  message 
}: InlineAlertProps) {
  const styles = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
    success: 'text-green-600'
  };
  
  const icons = {
    error: XCircle,
    warning: AlertCircle,
    success: CheckCircle
  };
  
  const Icon = icons[type];
  
  return (
    <div className={`flex items-center gap-1 mt-1 text-sm ${styles[type]}`}>
      <Icon size={14} />
      <span>{message}</span>
    </div>
  );
}