import React, { useState } from 'react';
import { ShoppingCart, Package, RotateCcw } from 'lucide-react';
import {
  PageHeader,
  DataTable,
  SearchBar,
  SelectField,
  Button,
  EmptyState
} from '../components';

interface PurchaseSalesProps {
  type: 'purchase' | 'sales' | 'return';
}

function PurchaseSales({ type }: PurchaseSalesProps) {
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState('all');
  
  const titles = {
    purchase: '구매 관리',
    sales: '판매 관리',
    return: '반품 관리'
  };
  
  const icons = {
    purchase: ShoppingCart,
    sales: Package,
    return: RotateCcw
  };

  const columns = [
    { key: 'date', header: '날짜' },
    { key: 'orderNumber', header: '주문번호' },
    { key: 'customer', header: type === 'purchase' ? '공급처' : '고객명' },
    { key: 'product', header: '제품명' },
    { key: 'quantity', header: '수량', align: 'center' as const },
    { key: 'amount', header: '금액', align: 'right' as const },
    { key: 'status', header: '상태', align: 'center' as const }
  ];

  const data: any[] = [];

  return (
    <div className="p-8">
      <PageHeader
        title={titles[type]}
        icon={icons[type]}
        actions={
          <Button icon={icons[type]}>
            {type === 'purchase' ? '구매 등록' : type === 'sales' ? '판매 등록' : '반품 등록'}
          </Button>
        }
      />

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex gap-4">
            <SelectField
              label=""
              name="dateRange"
              options={[
                { value: 'all', label: '전체 기간' },
                { value: 'today', label: '오늘' },
                { value: 'week', label: '이번 주' },
                { value: 'month', label: '이번 달' }
              ]}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            />
            <SearchBar
              placeholder="주문번호, 고객명, 제품명 검색"
              value={searchValue}
              onChange={setSearchValue}
              className="flex-1"
            />
          </div>
        </div>

        {data.length > 0 ? (
          <DataTable columns={columns} data={data} />
        ) : (
          <EmptyState
            icon={icons[type]}
            title={`${titles[type]} 내역이 없습니다`}
            description="새로운 거래를 등록해보세요"
            action={{
              label: `${type === 'purchase' ? '구매' : type === 'sales' ? '판매' : '반품'} 등록`,
              onClick: () => {}
            }}
          />
        )}
      </div>
    </div>
  );
}

export default PurchaseSales;