import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Package,
} from 'lucide-react';
import {
  warehouseService,
  Warehouse,
  WarehouseCreate,
  WarehouseUpdate,
} from '../services/api/warehouses';
import { showSuccess, showError, showWarning, showInfo } from '../utils/toast';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<WarehouseCreate>({
    name: '',
    description: '',
    location: '',
    is_active: true,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWarehouses();
  }, [currentPage, searchTerm]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await warehouseService.getWarehouses({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
      });
      setWarehouses(response.items);
      setTotalCount(response.total);
    } catch (error) {
      console.error('창고 목록 조회 실패:', error);
      showError('창고 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      showError('창고명을 입력해주세요.');
      return;
    }

    try {
      if (editingWarehouse) {
        await warehouseService.updateWarehouse(editingWarehouse.id, formData);
        showSuccess('창고 정보가 수정되었습니다.');
      } else {
        await warehouseService.createWarehouse(formData);
        showSuccess('새 창고가 추가되었습니다.');
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchWarehouses();
    } catch (error: any) {
      const message = error.response?.data?.detail || '작업 중 오류가 발생했습니다.';
      showError(message);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      description: warehouse.description || '',
      location: warehouse.location || '',
      is_active: warehouse.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (warehouse: Warehouse) => {
    if (warehouse.product_count && warehouse.product_count > 0) {
      showError(`해당 창고에 ${warehouse.product_count}개의 제품이 있습니다. 먼저 제품을 이동해주세요.`);
      return;
    }

    if (!confirm(`'${warehouse.name}' 창고를 비활성화하시겠습니까?`)) {
      return;
    }

    try {
      await warehouseService.deleteWarehouse(warehouse.id);
      showSuccess('창고가 비활성화되었습니다.');
      fetchWarehouses();
    } catch (error: any) {
      const message = error.response?.data?.detail || '삭제 중 오류가 발생했습니다.';
      showError(message);
    }
  };

  const resetForm = () => {
    setEditingWarehouse(null);
    setFormData({
      name: '',
      description: '',
      location: '',
      is_active: true,
    });
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          창고 관리
        </h1>
        <p className="text-gray-600 mt-1">창고 정보를 관리하고 제품을 할당합니다.</p>
      </div>

      {/* 검색 및 추가 버튼 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="창고명 또는 위치로 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openModal}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            새 창고 추가
          </button>
        </div>
      </div>

      {/* 창고 목록 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                창고명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                설명
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                위치
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                제품 수
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : warehouses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  등록된 창고가 없습니다.
                </td>
              </tr>
            ) : (
              warehouses.map((warehouse) => (
                <tr key={warehouse.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">{warehouse.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {warehouse.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1" />
                      {warehouse.location || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center">
                      <Package className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium text-gray-900">
                        {warehouse.product_count || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        warehouse.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {warehouse.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(warehouse)}
                        className="text-blue-600 hover:text-blue-800"
                        title="수정"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(warehouse)}
                        className="text-red-600 hover:text-red-800"
                        title="삭제"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalCount > 10 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                이전
              </button>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage * 10 >= totalCount}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  전체 <span className="font-medium">{totalCount}</span>개 중{' '}
                  <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> -{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, totalCount)}
                  </span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage * 10 >= totalCount}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    다음
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 창고 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {editingWarehouse ? '창고 수정' : '새 창고 추가'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    창고명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    위치
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">활성 상태</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingWarehouse ? '수정' : '추가'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;