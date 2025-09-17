import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

// 테이블 컬럼 정의
export interface TableColumn<T = any> {
  key: string;
  header: string | React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

// 테이블 Props
interface DataTableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedRows: string[]) => void;
  getRowKey?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  actions?: React.ReactNode;
}

export function DataTable<T = any>({
  columns,
  data,
  loading = false,
  emptyMessage = '데이터가 없습니다.',
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowKey = (row, index) => index.toString(),
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  pagination,
  actions
}: DataTableProps<T>) {
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allKeys = data.map((row, index) => getRowKey(row, index));
      onSelectionChange?.(allKeys);
    } else {
      onSelectionChange?.([]);
    }
  };
  
  const handleSelectRow = (rowKey: string) => {
    if (selectedRows.includes(rowKey)) {
      onSelectionChange?.(selectedRows.filter(key => key !== rowKey));
    } else {
      onSelectionChange?.([...selectedRows, rowKey]);
    }
  };
  
  const isAllSelected = data.length > 0 && 
    data.every((row, index) => selectedRows.includes(getRowKey(row, index)));
  
  const isIndeterminate = selectedRows.length > 0 && !isAllSelected;
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b">
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 테이블 액션 영역 */}
      {actions && (
        <div className="p-4 border-b bg-gray-50">
          {actions}
        </div>
      )}
      
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    p-3 text-${column.align || 'left'} text-sm font-medium text-gray-900
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}
                    ${column.width || ''}
                  `}
                  onClick={() => column.sortable && onSort?.(column.key)}
                >
                  <div className={`flex items-center ${column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}`}>
                    {column.header}
                    {column.sortable && (
                      <span className="ml-2">
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? '↑' : '↓'
                        ) : (
                          <span className="text-gray-400">↕</span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)} 
                  className="text-center py-12 text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = getRowKey(row, rowIndex);
                const isSelected = selectedRows.includes(rowKey);
                
                return (
                  <tr
                    key={rowKey}
                    className={`
                      hover:bg-gray-50
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                    onClick={() => onRowClick?.(row, rowIndex)}
                  >
                    {selectable && (
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(rowKey)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const value = (row as any)[column.key];
                      const cellContent = column.render 
                        ? column.render(value, row, rowIndex)
                        : value;
                      
                      return (
                        <td
                          key={column.key}
                          className={`p-3 text-${column.align || 'left'} ${column.width || ''}`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* 페이지네이션 */}
      {pagination && (
        <TablePagination {...pagination} />
      )}
    </div>
  );
}

// 페이지네이션 컴포넌트
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}: TablePaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  return (
    <div className="px-4 py-3 border-t flex items-center justify-between">
      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">표시</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
        <span className="text-sm text-gray-700">
          {totalItems === 0 ? '0' : `${startItem} - ${endItem}`} / {totalItems}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsLeft size={20} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="px-3 py-1">
          <span className="text-sm text-gray-700">
            {currentPage} / {totalPages}
          </span>
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsRight size={20} />
        </button>
      </div>
    </div>
  );
}