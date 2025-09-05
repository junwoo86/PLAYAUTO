import api from '../axios';

export interface PurchaseOrderItem {
  id?: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  ordered_quantity: number;
  received_quantity?: number;
  unit_price: number;
  subtotal?: number;
  status?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  status: string;
  total_amount: number;
  expected_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderRequest {
  supplier: string;
  expected_date?: string;
  notes?: string;
  items: Array<{
    product_id: string;
    ordered_quantity: number;
    unit_price: number;
  }>;
}

export const purchaseOrderAPI = {
  // 발주서 목록 조회
  getAll: (params?: { status?: string; supplier?: string }) => {
    return api.get<PurchaseOrder[]>('/purchase-orders', { params });
  },

  // 발주서 상세 조회
  getById: (id: string) => {
    return api.get<PurchaseOrder>(`/purchase-orders/${id}`);
  },

  // 발주서 생성
  create: (data: CreatePurchaseOrderRequest) => {
    return api.post<PurchaseOrder>('/purchase-orders', data);
  },

  // 발주서 상태 업데이트
  updateStatus: (id: string, status: string) => {
    return api.put(`/purchase-orders/${id}/status`, null, { params: { status } });
  },

  // 입고 처리
  receiveItems: (id: string, items: Array<{ item_id: string; quantity: number }>) => {
    return api.post(`/purchase-orders/${id}/receive`, items);
  }
};