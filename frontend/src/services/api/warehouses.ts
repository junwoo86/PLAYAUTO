import api from '../api';

export interface Warehouse {
  id: string;
  name: string;
  description?: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface WarehouseCreate {
  name: string;
  description?: string;
  location?: string;
  is_active?: boolean;
}

export interface WarehouseUpdate {
  name?: string;
  description?: string;
  location?: string;
  is_active?: boolean;
}

export interface WarehouseListResponse {
  items: Warehouse[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

class WarehouseService {
  // 창고 목록 조회
  async getWarehouses(params?: {
    page?: number;
    limit?: number;
    is_active?: boolean;
    search?: string;
  }): Promise<WarehouseListResponse> {
    const response = await api.get('/warehouses', { params });
    return response.data;
  }

  // 창고 상세 조회
  async getWarehouse(id: string): Promise<Warehouse> {
    const response = await api.get(`/warehouses/${id}`);
    return response.data;
  }

  // 창고 생성
  async createWarehouse(data: WarehouseCreate): Promise<Warehouse> {
    const response = await api.post('/warehouses', data);
    return response.data;
  }

  // 창고 수정
  async updateWarehouse(id: string, data: WarehouseUpdate): Promise<Warehouse> {
    const response = await api.put(`/warehouses/${id}`, data);
    return response.data;
  }

  // 창고 삭제 (비활성화)
  async deleteWarehouse(id: string): Promise<{ message: string; id: string }> {
    const response = await api.delete(`/warehouses/${id}`);
    return response.data;
  }
}

export const warehouseService = new WarehouseService();