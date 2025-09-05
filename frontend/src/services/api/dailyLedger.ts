import api from '../axios';

export interface DailyLedger {
  id: string;
  ledger_date: string;
  product_id: string;
  beginning_stock: number;
  total_inbound: number;
  total_outbound: number;
  adjustments: number;
  ending_stock: number;
  created_at: string;
  product?: {
    id: string;
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
  getAll: (params?: { ledger_date?: string; product_id?: string }) => {
    return api.get<DailyLedger[]>('/daily-ledger', { params });
  },

  // 일일 수불부 생성
  generate: (targetDate: string) => {
    return api.post<{ message: string; ledgers_created: number }>('/daily-ledger/generate', null, {
      params: { target_date: targetDate }
    });
  },

  // 일일 수불부 요약 조회
  getSummary: (targetDate: string) => {
    return api.get<LedgerSummary>('/daily-ledger/summary', {
      params: { target_date: targetDate }
    });
  }
};