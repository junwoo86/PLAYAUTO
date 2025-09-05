import api from '../axios';

export interface BatchTransaction {
  product_code: string;
  product_name?: string;
  transaction_type: 'IN' | 'OUT' | 'ADJUST';
  quantity: number;
  date: string;
  reason?: string;
  memo?: string;
}

export interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export const batchProcessAPI = {
  // 일괄 트랜잭션 처리
  processBatch: (transactions: BatchTransaction[]) => {
    return api.post<BatchResult>('/batch/process', { transactions });
  },

  // CSV 파일 업로드 처리
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<BatchResult>('/batch/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 템플릿 다운로드
  downloadTemplate: () => {
    return api.get('/batch/template', {
      responseType: 'blob',
    });
  }
};