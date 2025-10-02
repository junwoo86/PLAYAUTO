import api from '../api';

export interface DailyLedger {
  id: string;
  ledger_date: string;
  product_code: string;
  beginning_stock: number;
  total_inbound: number;
  total_outbound: number;
  adjustments: number;
  ending_stock: number;
  created_at: string;
  product?: {
    product_code: string;
    product_name: string;
    unit: string;
  };
}

export interface LedgerSummary {
  date: string;
  total_products: number;
  total_inbound: number;
  total_outbound: number;
  total_adjustments: number;
}

export const dailyLedgerAPI = {
  // 일일 수불부 조회
  getAll: (params?: { ledger_date?: string; product_code?: string }) => {
    return api.get<DailyLedger[]>('/daily-ledgers', { params });
  },

  // 일일 수불부 생성
  generate: (targetDate: string) => {
    return api.post<{ message: string; ledgers_created: number }>('/daily-ledgers/generate', null, {
      params: { target_date: targetDate }
    });
  },

  // 일일 수불부 요약 조회
  getSummary: (targetDate: string) => {
    return api.get<LedgerSummary>('/daily-ledgers/summary', {
      params: { target_date: targetDate }
    });
  }
};