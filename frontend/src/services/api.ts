import axios from 'axios';

// API 기본 URL 설정
// 프로덕션 환경에서는 HTTPS URL을 사용합니다 (.env.production 참조)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 토큰이 있다면 헤더에 추가
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 토큰 갱신 플래그 (중복 갱신 방지)
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // originalRequest가 없으면 에러 반환
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // 401 에러이고 로그인/리프레시 API가 아닌 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 로그인 페이지 요청이면 바로 리다이렉트
      if (originalRequest.url && (originalRequest.url.includes('/auth/login') ||
          originalRequest.url.includes('/auth/refresh'))) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // 이미 갱신 중이면 대기
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // 리프레시 토큰이 없으면 로그인 페이지로
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // 토큰 갱신 시도
        const response = await api.post('/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('authToken', access_token);

        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        return api(originalRequest);
      } catch (refreshError) {
        // 갱신 실패 시 로그인 페이지로
        processQueue(refreshError, null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Product API
export const productAPI = {
  // 모든 제품 조회
  getAll: async (skip = 0, limit = 200, searchTerm?: string, category?: string, warehouseId?: string, isActive?: boolean) => {
    const params: any = { skip, limit };
    if (searchTerm) params.search = searchTerm;
    if (category) params.category = category;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (isActive !== undefined) params.is_active = isActive;

    const response = await api.get('/products', { params });
    return response.data;
  },

  // 특정 제품 조회
  getById: async (id: string) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // 제품 코드로 제품 조회
  getByCode: async (productCode: string) => {
    const response = await api.get(`/products/${productCode}`);
    return response.data;
  },

  // 제품 생성
  create: async (product: any) => {
    const response = await api.post('/products', product);
    return response.data;
  },

  // 제품 업데이트
  update: async (id: string, product: any) => {
    const response = await api.put(`/products/${id}`, product);
    return response.data;
  },

  // 제품 삭제
  delete: async (id: string) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // 재고 부족 제품 조회
  getLowStock: async () => {
    const response = await api.get('/products/low-stock');
    return response.data;
  },

  // 제품 코드 중복 검사
  checkDuplicate: async (productCode: string, currentCode?: string) => {
    const response = await api.get(`/products/check-duplicate/${productCode}`, {
      params: currentCode ? { current_code: currentCode } : {}
    });
    return response.data;
  }
};

// Transaction API
export const transactionAPI = {
  // 거래 생성
  create: async (transaction: any) => {
    const response = await api.post('/transactions', transaction);
    return response.data;
  },

  // 거래 목록 조회
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    product_id?: string;
    transaction_type?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  // 특정 거래 조회
  getById: async (id: string) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  // 일괄 거래 생성
  batchCreate: async (transactions: any[]) => {
    const response = await api.post('/transactions/batch', {
      transactions
    });
    return response.data;
  },

  // 재고 실사
  stockCount: async (counts: any[]) => {
    const response = await api.post('/transactions/stock-count', {
      counts
    });
    return response.data;
  },

  // 거래 삭제
  delete: async (id: string) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  }
};

// Purchase Order API
export const purchaseOrderAPI = {
  // 구매 주문 생성
  create: async (order: any) => {
    const response = await api.post('/purchase-orders', order);
    return response.data;
  },

  // 구매 주문 목록 조회
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }) => {
    const response = await api.get('/purchase-orders', { params });
    return response.data;
  },

  // 특정 구매 주문 조회
  getById: async (id: string) => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  // 구매 주문 상태 업데이트
  updateStatus: async (id: string, status: string) => {
    const response = await api.patch(`/purchase-orders/${id}/status`, {
      status
    });
    return response.data;
  },

  // 구매 주문 수령
  receive: async (id: string, receivedQuantities: any) => {
    const response = await api.post(`/purchase-orders/${id}/receive`, 
      receivedQuantities
    );
    return response.data;
  },

  // 구매 주문 업데이트
  update: async (id: string, order: any) => {
    const response = await api.put(`/purchase-orders/${id}`, order);
    return response.data;
  },

  // 구매 주문 삭제
  delete: async (id: string) => {
    const response = await api.delete(`/purchase-orders/${id}`);
    return response.data;
  }
};

// Statistics API
export const statisticsAPI = {
  // 대시보드 통계
  getDashboard: async () => {
    const response = await api.get('/statistics/dashboard');
    return response.data;
  },

  // 재고 추이
  getStockTrend: async (productId?: string, days = 30) => {
    const response = await api.get('/statistics/stock-trend', {
      params: { product_id: productId, days }
    });
    return response.data;
  },

  // 거래 통계
  getTransactionStats: async (startDate: string, endDate: string) => {
    const response = await api.get('/statistics/transactions', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  // 입출고 요약 분석
  getTransactionSummary: async (days: number = 30) => {
    const response = await api.get('/transactions/summary', {
      params: { days }
    });
    return response.data;
  },

  // 재고 분석
  getInventoryAnalysis: async () => {
    const response = await api.get('/inventory/analysis');
    return response.data;
  },

  // 과거 수량 조회
  getPastQuantityAnalysis: async (productId?: string, days: number = 30) => {
    const response = await api.get('/products/past-quantity', {
      params: { product_id: productId, days }
    });
    return response.data;
  },

  // 매출 분석
  getSalesAnalysis: async (days: number = 30) => {
    const response = await api.get('/sales/analysis', {
      params: { days }
    });
    return response.data;
  }
};

// Product BOM API
export const productBOMAPI = {
  // BOM 목록 조회
  getAll: async (parentProductCode?: string) => {
    const params: any = {};
    if (parentProductCode) params.parent_product_code = parentProductCode;

    const response = await api.get('/product-bom/', { params });
    return response.data;
  },

  // BOM 일괄 생성/업데이트
  bulkCreate: async (parentProductCode: string, boms: any[]) => {
    // 먼저 기존 BOM 삭제
    const existingBoms = await productBOMAPI.getAll(parentProductCode);
    if (existingBoms.items && existingBoms.items.length > 0) {
      for (const bom of existingBoms.items) {
        await api.delete(`/product-bom/${bom.id}`);
      }
    }

    // 새로운 BOM 생성 (개별적으로 생성)
    const createdBoms = [];
    if (boms.length > 0) {
      for (const item of boms) {
        const bomData = {
          parent_product_code: parentProductCode,
          child_product_code: item.childProductCode,
          quantity: item.quantity
        };

        try {
          const response = await api.post('/product-bom/', bomData);
          createdBoms.push(response.data);
        } catch (error) {
          console.error('BOM 생성 실패:', error);
          throw error;
        }
      }
    }

    return createdBoms;
  },

  // 세트 조립 가능 수량 조회
  getSetProductStock: async (productCode: string) => {
    const response = await api.get(`/product-bom/set-product-stock/${productCode}`);
    return response.data;
  },

  // 세트 제품 조립
  assemble: async (productCode: string, quantity: number) => {
    const response = await api.post('/product-bom/assemble', {
      product_code: productCode,
      quantity: quantity
    });
    return response.data;
  },

  // 세트 제품 해체
  disassemble: async (productCode: string, quantity: number) => {
    const response = await api.post('/product-bom/disassemble', {
      product_code: productCode,
      quantity: quantity
    });
    return response.data;
  }
};

// Daily Ledger API
export const dailyLedgerAPI = {
  // 일일 원장 조회
  getByDate: async (date: string) => {
    const response = await api.get('/daily-ledgers/by-date', {
      params: { date }
    });
    return response.data;
  },

  // 일일 마감
  closeDay: async (date: string) => {
    const response = await api.post('/daily-ledgers/close', {
      date
    });
    return response.data;
  }
};

// Stock Checkpoint API
export const stockCheckpointAPI = {
  // 체크포인트 생성
  create: async (checkpoint: any) => {
    const response = await api.post('/stock-checkpoints', checkpoint);
    return response.data;
  },

  // 체크포인트 목록 조회
  getAll: async (params?: {
    product_code?: string;
    checkpoint_type?: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }) => {
    const response = await api.get('/stock-checkpoints', { params });
    return response.data;
  },

  // 특정 체크포인트 조회
  getById: async (id: string) => {
    const response = await api.get(`/stock-checkpoints/${id}`);
    return response.data;
  },

  // 거래 검증 (체크포인트 확인)
  validateTransaction: async (productCode: string, transactionDate: string) => {
    const response = await api.post('/stock-checkpoints/validate-transaction', {
      product_code: productCode,
      transaction_date: transactionDate
    });
    return response.data;
  },

  // 체크포인트 수정
  update: async (id: string, data: any) => {
    const response = await api.put(`/stock-checkpoints/${id}`, data);
    return response.data;
  },

  // 체크포인트 삭제 (비활성화)
  delete: async (id: string) => {
    const response = await api.delete(`/stock-checkpoints/${id}`);
    return response.data;
  }
};

// Export/Import API
export const dataAPI = {
  // 데이터 내보내기
  export: async (type: 'products' | 'transactions' | 'all', format: 'csv' | 'excel') => {
    const response = await api.get('/data/export', {
      params: { type, format },
      responseType: 'blob'
    });
    return response.data;
  },

  // 데이터 가져오기
  import: async (file: File, type: 'products' | 'transactions') => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/data/import/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Auth API
export const authAPI = {
  // 로그인
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', {
      username,
      password
    });
    return response.data;
  },

  // 회원가입
  signup: async (data: { email: string; password: string; name: string }) => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  // 로그아웃
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  // 현재 사용자 정보 조회
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // 토큰 갱신
  refresh: async (refreshToken: string) => {
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken
    });
    return response.data;
  }
};

// User API
export const userAPI = {
  // 전체 사용자 목록 조회
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // 승인 대기 사용자 목록 조회
  getPending: async () => {
    const response = await api.get('/users/pending');
    return response.data;
  },

  // 특정 사용자 조회
  getById: async (userId: number) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  // 사용자 상태 변경
  updateStatus: async (userId: number, status: string) => {
    const response = await api.put(`/users/${userId}/status`, {
      status
    });
    return response.data;
  },

  // 사용자 그룹 변경
  updateGroup: async (userId: number, groupId: number) => {
    const response = await api.put(`/users/${userId}/group`, {
      group_id: groupId
    });
    return response.data;
  },

  // 사용자 승인
  approve: async (userId: number, groupId: number) => {
    const response = await api.post(`/users/${userId}/approve`, {
      group_id: groupId
    });
    return response.data;
  },

  // 사용자 삭제 (비활성화)
  delete: async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  }
};

// Group API
export const groupAPI = {
  // 전체 그룹 목록 조회
  getAll: async () => {
    const response = await api.get('/groups');
    return response.data;
  },

  // 특정 그룹 조회
  getById: async (groupId: number) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  // 그룹 권한 조회
  getPermissions: async (groupId: number) => {
    const response = await api.get(`/groups/${groupId}/permissions`);
    return response.data;
  },

  // 전체 권한 목록 조회
  getAllPermissions: async () => {
    const response = await api.get('/groups/permissions');
    return response.data;
  },

  // 그룹 생성
  create: async (data: { name: string; description?: string }) => {
    const response = await api.post('/groups', data);
    return response.data;
  },

  // 그룹 수정
  update: async (groupId: number, data: { name?: string; description?: string }) => {
    const response = await api.put(`/groups/${groupId}`, data);
    return response.data;
  },

  // 그룹 권한 업데이트
  updatePermissions: async (groupId: number, permissionIds: number[]) => {
    const response = await api.put(`/groups/${groupId}/permissions`, {
      permission_ids: permissionIds
    });
    return response.data;
  },

  // 그룹 삭제
  delete: async (groupId: number) => {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data;
  }
};

// Notification API
export const notificationAPI = {
  // 전체 알림 설정 조회
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  // 특정 그룹의 알림 설정 조회
  getByGroup: async (groupId: number) => {
    const response = await api.get(`/notifications/group/${groupId}`);
    return response.data;
  },

  // 그룹의 알림 설정 업데이트 (settings는 {notification_type: is_enabled} 형태의 객체)
  updateGroupSettings: async (groupId: number, settings: {[key: string]: boolean}) => {
    const response = await api.put(`/notifications/group/${groupId}`, settings);
    return response.data;
  },

  // 사용 가능한 이벤트 타입 목록
  getEventTypes: async () => {
    const response = await api.get('/notifications/event-types');
    return response.data;
  },

  // 알림 테스트 전송
  testNotification: async (groupId: number, notificationType: string) => {
    const response = await api.post('/notifications/test', {
      group_id: groupId,
      notification_type: notificationType
    });
    return response.data;
  }
};

export { api };
export default api;