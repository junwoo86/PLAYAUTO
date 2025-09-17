import React, { useState } from 'react';
import { Search, X, Filter, ScanBarcode } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  showFilter?: boolean;
  onFilterClick?: () => void;
  showBarcode?: boolean;
  onBarcodeClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg'
};

export function SearchBar({
  placeholder = '검색...',
  value: controlledValue,
  onChange,
  onSearch,
  onClear,
  onFocus,
  showFilter = false,
  onFilterClick,
  showBarcode = false,
  onBarcodeClick,
  size = 'md',
  className = ''
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };
  
  const handleSearch = () => {
    onSearch?.(value);
  };
  
  const handleClear = () => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onChange?.('');
    onClear?.();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} className="text-gray-400" />
        </div>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`
            w-full border border-gray-300 rounded-lg
            ${size === 'sm' ? 'pl-8 pr-8' : size === 'md' ? 'pl-10 pr-10' : 'pl-12 pr-12'}
            ${sizeStyles[size]}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          `}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} className="text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>
      
      <button
        onClick={handleSearch}
        className={`
          ${sizeStyles[size]}
          px-4 border border-gray-300 rounded-lg hover:bg-gray-50
          focus:outline-none focus:ring-2 focus:ring-blue-500
        `}
      >
        <Search size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
      </button>
      
      {showBarcode && (
        <button
          onClick={onBarcodeClick}
          className={`
            ${sizeStyles[size]}
            px-4 border border-gray-300 rounded-lg hover:bg-gray-50
            focus:outline-none focus:ring-2 focus:ring-blue-500
          `}
        >
          <ScanBarcode size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
        </button>
      )}
      
      {showFilter && (
        <button
          onClick={onFilterClick}
          className={`
            ${sizeStyles[size]}
            px-4 border border-gray-300 rounded-lg hover:bg-gray-50
            focus:outline-none focus:ring-2 focus:ring-blue-500
            flex items-center gap-2
          `}
        >
          <Filter size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
          <span>필터</span>
        </button>
      )}
    </div>
  );
}

// 고급 검색 바 (필터 옵션 포함)
interface AdvancedSearchBarProps extends SearchBarProps {
  filters?: Array<{
    label: string;
    value: string;
    count?: number;
  }>;
  activeFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
}

export function AdvancedSearchBar({
  filters = [],
  activeFilters = [],
  onFilterChange,
  ...searchBarProps
}: AdvancedSearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  
  const handleFilterToggle = (filterValue: string) => {
    const newFilters = activeFilters.includes(filterValue)
      ? activeFilters.filter(f => f !== filterValue)
      : [...activeFilters, filterValue];
    onFilterChange?.(newFilters);
  };
  
  return (
    <div>
      <SearchBar
        {...searchBarProps}
        showFilter={filters.length > 0}
        onFilterClick={() => setShowFilters(!showFilters)}
      />
      
      {showFilters && filters.length > 0 && (
        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleFilterToggle(filter.value)}
                className={`
                  px-3 py-1.5 rounded-full text-sm border transition-colors
                  ${activeFilters.includes(filter.value)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                {filter.label}
                {filter.count !== undefined && (
                  <span className="ml-1 opacity-75">({filter.count})</span>
                )}
              </button>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <button
              onClick={() => onFilterChange?.([])}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}