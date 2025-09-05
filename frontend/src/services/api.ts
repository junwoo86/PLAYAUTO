import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 인증 실패 시 처리
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Product API
export const productAPI = {
  // 모든 제품 조회
  getAll: async (skip = 0, limit = 100) => {
    const response = await api.get('/products', {
      params: { skip, limit }
    });
    return response.data;
  },

  // 특정 제품 조회
  getById: async (id: string) => {
    const response = await api.get(`/products/${id}`);
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

export default api;