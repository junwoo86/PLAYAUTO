import React from 'react';
import { LucideIcon, AlertCircle, Check } from 'lucide-react';

// 기본 입력 필드 Props
interface BaseFieldProps {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

// Text Input Component
interface TextFieldProps extends BaseFieldProps, 
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'disabled'> {
  action?: React.ReactNode;
}

export function TextField({
  label,
  name,
  required = false,
  error,
  hint,
  icon: Icon,
  disabled = false,
  className = '',
  action,
  ...props
}: TextFieldProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {action && <div>{action}</div>}
      </div>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon size={20} className="text-gray-400" />
          </div>
        )}
        <input
          id={name}
          name={name}
          disabled={disabled}
          className={`
            w-full px-4 py-2 border rounded-lg
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 
              'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            focus:outline-none focus:ring-2
            ${className}
          `}
          {...props}
        />
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle size={20} className="text-red-500" />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

// Select Field Component
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps extends BaseFieldProps {
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: string;
}

export function SelectField({
  label,
  name,
  required = false,
  error,
  hint,
  icon: Icon,
  disabled = false,
  options,
  value,
  onChange,
  placeholder = ''
}: SelectFieldProps) {
  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon size={20} className="text-gray-400" />
          </div>
        )}
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`
            w-full px-4 py-2 border rounded-lg appearance-none
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 
              'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            focus:outline-none focus:ring-2
          `}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

// Textarea Component
interface TextareaFieldProps extends BaseFieldProps,
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name' | 'disabled'> {}

export function TextareaField({
  label,
  name,
  required = false,
  error,
  hint,
  disabled = false,
  className = '',
  rows = 4,
  ...props
}: TextareaFieldProps) {
  return (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        disabled={disabled}
        className={`
          w-full px-4 py-3 border rounded-lg resize-none
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 
            'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          focus:outline-none focus:ring-2
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
}

// Checkbox Component
interface CheckboxFieldProps {
  label: string;
  name: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
}

export function CheckboxField({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
  error
}: CheckboxFieldProps) {
  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            h-4 w-4 rounded
            ${error ? 'border-red-300 text-red-600 focus:ring-red-500' : 
              'border-gray-300 text-blue-600 focus:ring-blue-500'}
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor={name} className={`font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {label}
        </label>
        {error && (
          <p className="text-red-600 text-xs mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

// Radio Field Component (Alias for RadioGroup)
export const RadioField = RadioGroup;

// Switch Field Component
interface SwitchFieldProps {
  label: string;
  name: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
}

export function SwitchField({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
  description
}: SwitchFieldProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-grow">
        <label htmlFor={name} className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
          {label}
        </label>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked ? 'bg-blue-600' : 'bg-gray-200'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

// Radio Group Component
interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  label: string;
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function RadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  required = false,
  error,
  disabled = false
}: RadioGroupProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
              value === option.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              disabled={disabled}
              className="mt-0.5 text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{option.label}</div>
              {option.description && (
                <div className="text-sm text-gray-500">{option.description}</div>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}