# 📚 PLAYAUTO 컴포넌트 라이브러리 가이드

> **⚠️ 중요**: 프로젝트에서 새로운 화면을 개발할 때는 **반드시** 이 문서에 정의된 컴포넌트를 사용해주세요.  
> 일관된 UI/UX를 유지하고 개발 생산성을 높이기 위해 제작된 표준 컴포넌트입니다.

## 📋 목차

1. [시작하기](#시작하기)
2. [버튼 컴포넌트](#버튼-컴포넌트)
3. [카드 컴포넌트](#카드-컴포넌트)
4. [폼 컴포넌트](#폼-컴포넌트)
5. [테이블 컴포넌트](#테이블-컴포넌트)
6. [레이아웃 컴포넌트](#레이아웃-컴포넌트)
7. [피드백 컴포넌트](#피드백-컴포넌트)
8. [네비게이션 컴포넌트](#네비게이션-컴포넌트)

---

## 시작하기

### 설치 및 임포트

```tsx
// 개별 컴포넌트 임포트
import { Button, StatsCard, DataTable } from './components';

// 또는 필요한 컴포넌트만 선택적으로 임포트
import { Button } from './components/buttons/Button';
import { StatsCard } from './components/cards/StatsCard';
```

### 데모 페이지

모든 컴포넌트의 실제 동작을 확인하려면 `/components/Demo.tsx` 파일을 실행하세요.

---

## 버튼 컴포넌트

### Button

다양한 스타일과 크기를 지원하는 기본 버튼 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger'` | `'primary'` | 버튼 스타일 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 버튼 크기 |
| `icon` | `LucideIcon` | - | 아이콘 컴포넌트 |
| `iconPosition` | `'left' \| 'right'` | `'left'` | 아이콘 위치 |
| `loading` | `boolean` | `false` | 로딩 상태 |
| `fullWidth` | `boolean` | `false` | 전체 너비 사용 |
| `disabled` | `boolean` | `false` | 비활성화 상태 |

#### 사용 예시

```tsx
// 기본 버튼
<Button>저장</Button>

// 아이콘 포함 버튼
<Button icon={Plus} variant="primary">
  새 항목 추가
</Button>

// 로딩 상태
<Button loading>처리 중...</Button>

// 전체 너비 버튼
<Button fullWidth variant="outline">
  전체 너비 버튼
</Button>
```

### IconButton

아이콘만 표시하는 버튼 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | **required** | 아이콘 컴포넌트 |
| `label` | `string` | **required** | 접근성을 위한 레이블 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 버튼 크기 |
| `variant` | `ButtonVariant` | `'ghost'` | 버튼 스타일 |

#### 사용 예시

```tsx
<IconButton icon={Settings} label="설정" />
<IconButton icon={Bell} label="알림" variant="outline" />
```

---

## 카드 컴포넌트

### StatsCard

통계 정보를 표시하는 카드 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | 카드 제목 |
| `value` | `string \| number` | **required** | 메인 값 |
| `icon` | `LucideIcon` | - | 아이콘 |
| `color` | `'blue' \| 'green' \| 'red' \| 'yellow' \| 'purple' \| 'gray' \| 'teal'` | `'blue'` | 색상 테마 |
| `trend` | `{ value: number, label: string }` | - | 추세 정보 |
| `subStats` | `StatItem[]` | `[]` | 하위 통계 목록 |
| `loading` | `boolean` | `false` | 로딩 상태 |

#### 사용 예시

```tsx
<StatsCard
  title="총 매출"
  value="₩125.4M"
  color="green"
  icon={ShoppingCart}
  trend={{ value: 15.2, label: "지난 달 대비" }}
  subStats={[
    { label: "오늘", value: "₩5.2M" },
    { label: "이번 주", value: "₩28.1M" }
  ]}
/>
```

### ChartCard

차트를 포함할 수 있는 카드 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | 카드 제목 |
| `value` | `string \| number` | **required** | 메인 값 |
| `subtitle` | `string` | - | 부제목 |
| `icon` | `LucideIcon` | - | 아이콘 |
| `color` | `ColorType` | `'blue'` | 색상 테마 |
| `trend` | `TrendType` | - | 추세 정보 |
| `children` | `ReactNode` | - | 차트 컴포넌트 |
| `actions` | `ReactNode` | - | 액션 버튼들 |

#### 사용 예시

```tsx
<ChartCard
  title="월별 판매량"
  value="1,234"
  subtitle="2025년 총 판매"
  color="teal"
  trend={{ value: 12, type: 'increase' }}
>
  <SimpleBarChart data={chartData} />
</ChartCard>
```

---

## 폼 컴포넌트

### TextField

텍스트 입력 필드 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | **required** | 필드 레이블 |
| `name` | `string` | **required** | 필드 이름 |
| `required` | `boolean` | `false` | 필수 필드 여부 |
| `error` | `string` | - | 에러 메시지 |
| `hint` | `string` | - | 도움말 텍스트 |
| `icon` | `LucideIcon` | - | 입력 필드 아이콘 |
| `disabled` | `boolean` | `false` | 비활성화 상태 |

#### 사용 예시

```tsx
<TextField
  label="이메일"
  name="email"
  type="email"
  required
  placeholder="example@email.com"
  icon={Mail}
  error={errors.email}
/>
```

### SelectField

드롭다운 선택 필드 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | **required** | 필드 레이블 |
| `name` | `string` | **required** | 필드 이름 |
| `options` | `SelectOption[]` | **required** | 선택 옵션 목록 |
| `placeholder` | `string` | `'선택하세요'` | 플레이스홀더 |
| `required` | `boolean` | `false` | 필수 필드 여부 |

#### 사용 예시

```tsx
<SelectField
  label="카테고리"
  name="category"
  required
  options={[
    { value: 'electronics', label: '전자제품' },
    { value: 'clothing', label: '의류' },
    { value: 'food', label: '식품' }
  ]}
/>
```

### TextareaField

여러 줄 텍스트 입력 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | **required** | 필드 레이블 |
| `name` | `string` | **required** | 필드 이름 |
| `rows` | `number` | `4` | 표시할 줄 수 |
| `hint` | `string` | - | 도움말 텍스트 |

#### 사용 예시

```tsx
<TextareaField
  label="상품 설명"
  name="description"
  rows={5}
  placeholder="상품에 대한 자세한 설명을 입력하세요"
  hint="최대 500자까지 입력 가능합니다"
/>
```

### CheckboxField & RadioGroup

체크박스와 라디오 버튼 컴포넌트

#### 사용 예시

```tsx
// 체크박스
<CheckboxField
  label="이용약관에 동의합니다"
  name="terms"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
/>

// 라디오 그룹
<RadioGroup
  label="배송 방법"
  name="shipping"
  required
  options={[
    { value: 'standard', label: '일반 배송', description: '3-5일 소요' },
    { value: 'express', label: '특급 배송', description: '1일 소요' }
  ]}
  value={shipping}
  onChange={setShipping}
/>
```

### SearchBar

검색 바 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placeholder` | `string` | `'검색...'` | 플레이스홀더 |
| `showFilter` | `boolean` | `false` | 필터 버튼 표시 |
| `showBarcode` | `boolean` | `false` | 바코드 스캔 버튼 표시 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 크기 |

#### 사용 예시

```tsx
<SearchBar
  placeholder="상품명, 바코드로 검색"
  showFilter
  showBarcode
  onSearch={(value) => handleSearch(value)}
/>
```

---

## 테이블 컴포넌트

### DataTable

데이터를 표 형식으로 표시하는 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `TableColumn[]` | **required** | 컬럼 정의 |
| `data` | `T[]` | **required** | 표시할 데이터 |
| `loading` | `boolean` | `false` | 로딩 상태 |
| `selectable` | `boolean` | `false` | 행 선택 가능 여부 |
| `pagination` | `PaginationType` | - | 페이지네이션 설정 |
| `onRowClick` | `(row, index) => void` | - | 행 클릭 핸들러 |
| `emptyMessage` | `string` | `'데이터가 없습니다.'` | 빈 상태 메시지 |

#### 컬럼 정의

```tsx
const columns: TableColumn[] = [
  { 
    key: 'name', 
    header: '상품명',
    sortable: true 
  },
  { 
    key: 'price', 
    header: '가격',
    align: 'right',
    render: (value) => `₩${value.toLocaleString()}`
  },
  {
    key: 'status',
    header: '상태',
    render: (value) => (
      <span className={`badge ${value === 'active' ? 'badge-success' : 'badge-gray'}`}>
        {value}
      </span>
    )
  }
];
```

#### 사용 예시

```tsx
<DataTable
  columns={columns}
  data={products}
  selectable
  loading={isLoading}
  pagination={{
    currentPage: page,
    totalPages: Math.ceil(total / pageSize),
    pageSize: pageSize,
    totalItems: total,
    onPageChange: setPage,
    onPageSizeChange: setPageSize
  }}
  onRowClick={(row) => handleRowClick(row)}
  actions={
    <Button size="sm" icon={Plus}>추가</Button>
  }
/>
```

---

## 레이아웃 컴포넌트

### PageHeader

페이지 상단 헤더 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | 페이지 제목 |
| `subtitle` | `string` | - | 부제목 |
| `icon` | `LucideIcon` | - | 아이콘 |
| `breadcrumbs` | `BreadcrumbItem[]` | - | 브레드크럼 |
| `actions` | `ReactNode` | - | 액션 버튼들 |
| `showHelp` | `boolean` | `false` | 도움말 버튼 표시 |

#### 사용 예시

```tsx
<PageHeader
  title="상품 관리"
  subtitle="등록된 상품을 관리합니다"
  icon={Package}
  breadcrumbs={[
    { label: '홈', href: '/' },
    { label: '상품', href: '/products' },
    { label: '목록' }
  ]}
  actions={
    <>
      <Button variant="outline" icon={Download}>내보내기</Button>
      <Button icon={Plus}>상품 추가</Button>
    </>
  }
  showHelp
/>
```

### EmptyState

데이터가 없을 때 표시하는 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | - | 아이콘 |
| `title` | `string` | **required** | 제목 |
| `description` | `string` | - | 설명 |
| `action` | `ActionType` | - | 주요 액션 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 크기 |

#### 사용 예시

```tsx
<EmptyState
  icon={Package}
  title="등록된 상품이 없습니다"
  description="첫 번째 상품을 등록해보세요"
  action={{
    label: '상품 등록',
    onClick: () => navigate('/products/new'),
    icon: Plus
  }}
/>
```

### LoadingState & ErrorState

로딩 및 에러 상태 컴포넌트

#### 사용 예시

```tsx
// 로딩 상태
<LoadingState message="데이터를 불러오는 중..." />

// 에러 상태
<ErrorState
  title="오류가 발생했습니다"
  message="데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요."
  onRetry={() => refetch()}
/>
```

---

## 피드백 컴포넌트

### Alert

알림 메시지 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | 알림 타입 |
| `title` | `string` | - | 제목 |
| `message` | `string` | **required** | 메시지 |
| `closable` | `boolean` | `false` | 닫기 버튼 표시 |
| `action` | `ActionType` | - | 액션 링크 |

#### 사용 예시

```tsx
<Alert
  type="warning"
  title="재고 부족"
  message="일부 상품의 재고가 부족합니다."
  action={{
    label: '재고 확인',
    onClick: () => navigate('/inventory')
  }}
  closable
/>
```

### Toast

토스트 알림 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `AlertType` | `'info'` | 알림 타입 |
| `title` | `string` | - | 제목 |
| `message` | `string` | **required** | 메시지 |
| `duration` | `number` | `5000` | 표시 시간(ms) |
| `position` | `PositionType` | `'top-right'` | 표시 위치 |

#### 사용 예시

```tsx
// 토스트 표시 함수
const showToast = () => {
  setToasts([...toasts, {
    id: Date.now(),
    type: 'success',
    title: '저장 완료',
    message: '변경사항이 저장되었습니다.'
  }]);
};

// 컴포넌트
{showToast && (
  <Toast
    type="success"
    title="저장 완료"
    message="변경사항이 저장되었습니다."
    onClose={() => setShowToast(false)}
  />
)}
```

---

## 네비게이션 컴포넌트

### Sidebar

사이드바 네비게이션 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logo` | `{ full: ReactNode, collapsed: ReactNode }` | - | 로고 |
| `menuItems` | `MenuItem[]` | **required** | 메뉴 아이템 |
| `activeItem` | `string` | - | 현재 활성 아이템 |
| `collapsed` | `boolean` | `false` | 축소 상태 |
| `expandedMenus` | `string[]` | `[]` | 확장된 서브메뉴 |
| `footer` | `ReactNode` | - | 푸터 컨텐츠 |

#### MenuItem 타입

```tsx
interface MenuItem {
  id: string;
  name: string;
  icon?: LucideIcon;
  href?: string;
  badge?: {
    text: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
  };
  submenu?: MenuItem[];
}
```

#### 사용 예시

```tsx
const menuItems: MenuItem[] = [
  { id: 'dashboard', name: '대시보드', icon: Home },
  { 
    id: 'products',
    name: '상품 관리',
    icon: Package,
    submenu: [
      { id: 'product-list', name: '상품 목록' },
      { id: 'product-add', name: '상품 등록' }
    ]
  },
  { 
    id: 'orders',
    name: '주문 관리',
    icon: ShoppingCart,
    badge: { text: '12', color: 'red' }
  }
];

<Sidebar
  logo={{
    full: <Logo />,
    collapsed: <LogoSmall />
  }}
  menuItems={menuItems}
  activeItem={currentPage}
  collapsed={isSidebarCollapsed}
  onItemClick={(item) => navigate(item.href)}
/>
```

### Header

상단 헤더 컴포넌트

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | 타이틀 |
| `user` | `UserType` | - | 사용자 정보 |
| `notifications` | `NotificationType` | - | 알림 정보 |
| `onMenuClick` | `() => void` | - | 메뉴 토글 핸들러 |
| `showSearch` | `boolean` | `false` | 검색창 표시 |
| `actions` | `ReactNode` | - | 추가 액션 |

#### 사용 예시

```tsx
<Header
  title="PLAYAUTO"
  user={{
    name: '홍길동',
    email: 'hong@example.com',
    avatar: '/avatar.jpg'
  }}
  notifications={{
    count: 5,
    items: notificationList
  }}
  onMenuClick={toggleSidebar}
  showSearch
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
/>
```

---

## 🎨 디자인 가이드라인

### 색상 팔레트

- **Primary**: Blue (`blue-600`)
- **Secondary**: Gray (`gray-600`)
- **Success**: Green (`green-600`)
- **Warning**: Yellow (`yellow-600`)
- **Danger**: Red (`red-600`)
- **Info**: Teal (`teal-600`)

### 간격 시스템

- **xs**: 0.5rem (8px)
- **sm**: 1rem (16px)
- **md**: 1.5rem (24px)
- **lg**: 2rem (32px)
- **xl**: 3rem (48px)

### 그림자

- **sm**: `shadow-sm`
- **default**: `shadow`
- **lg**: `shadow-lg`

---

## 📝 베스트 프랙티스

### ✅ DO

1. **항상 정의된 컴포넌트 사용하기**
   ```tsx
   // Good
   <Button variant="primary" icon={Plus}>추가</Button>
   ```

2. **일관된 Props 패턴 따르기**
   ```tsx
   // Good
   <StatsCard
     title="매출"
     value={revenue}
     color="green"
   />
   ```

3. **접근성 고려하기**
   ```tsx
   // Good
   <IconButton icon={Settings} label="설정 열기" />
   ```

### ❌ DON'T

1. **커스텀 스타일 직접 작성 피하기**
   ```tsx
   // Bad
   <button className="px-4 py-2 bg-blue-500">클릭</button>
   
   // Good
   <Button>클릭</Button>
   ```

2. **컴포넌트 외부에서 스타일 오버라이드 피하기**
   ```tsx
   // Bad
   <Button className="!bg-red-500">삭제</Button>
   
   // Good
   <Button variant="danger">삭제</Button>
   ```

3. **인라인 스타일 사용 피하기**
   ```tsx
   // Bad
   <div style={{ padding: '20px' }}>...</div>
   
   // Good - 레이아웃 컴포넌트 사용
   <Card>...</Card>
   ```

---

## 🔧 확장 가이드

### 새 컴포넌트 추가 시

1. `/components` 폴더 내 적절한 카테고리에 파일 생성
2. TypeScript 타입 정의 포함
3. Props 인터페이스 명확히 정의
4. 기본값 설정
5. `/components/index.tsx`에 export 추가
6. 이 문서에 사용법 추가
7. Demo 페이지에 예제 추가

### 컴포넌트 수정 시

1. 기존 Props와의 호환성 유지
2. Breaking Change 발생 시 마이그레이션 가이드 제공
3. 변경사항 문서화
4. Demo 페이지 업데이트

---

## 📞 지원

컴포넌트 관련 문의사항이나 개선 제안은 다음 채널을 통해 연락주세요:

- **Slack**: #frontend-components
- **Email**: frontend-team@playauto.com
- **GitHub Issues**: [PLAYAUTO/components](https://github.com/playauto/components)

---

*Last Updated: 2025-01-09*
*Version: 1.0.0*