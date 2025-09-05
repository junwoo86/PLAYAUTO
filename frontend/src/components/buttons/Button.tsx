import React from 'react';
import { LucideIcon } from 'lucide-react';

// 버튼 변형 타입
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const widthStyle = fullWidth ? 'w-full' : '';
  
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          처리 중...
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon size={iconSize} className="mr-2" />
          )}
          {children}
          {Icon && iconPosition === 'right' && (
            <Icon size={iconSize} className="ml-2" />
          )}
        </>
      )}
    </button>
  );
}

// 아이콘 버튼 컴포넌트
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon;
  label: string; // 접근성을 위한 aria-label
}

export function IconButton({
  icon: Icon,
  label,
  size = 'md',
  variant = 'ghost',
  ...props
}: IconButtonProps) {
  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
  const paddingStyles = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3'
  };
  
  return (
    <button
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${paddingStyles[size]}`}
      {...props}
    >
      <Icon size={iconSize} />
    </button>
  );
}