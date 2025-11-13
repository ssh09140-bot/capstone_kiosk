// src/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// 요청을 보내기 전에 가로채서 토큰을 헤더에 추가하는 로직
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;

// --- Inventory API ---

export interface Inventory {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  threshold: number | null;
  createdAt: string;
  updatedAt: string;
  storeId: string;
}

export interface CreateInventoryItemDto {
  name: string;
  quantity: number;
  unit: string;
  threshold?: number;
}

export interface UpdateInventoryItemDto {
  name?: string;
  quantity?: number;
  unit?: string;
  threshold?: number;
}

export const getInventory = async (): Promise<Inventory[]> => {
  const response = await api.get<Inventory[]>('/inventory');
  return response.data;
};

export const getInventoryItem = async (id: number): Promise<Inventory> => {
  const response = await api.get<Inventory>(`/inventory/${id}`);
  return response.data;
};

export const createInventoryItem = async (data: CreateInventoryItemDto): Promise<Inventory> => {
  const response = await api.post<Inventory>('/inventory', data);
  return response.data;
};

export const updateInventoryItem = async (id: number, data: UpdateInventoryItemDto): Promise<Inventory> => {
  const response = await api.put<Inventory>(`/inventory/${id}`, data);
  return response.data;
};

export const deleteInventoryItem = async (id: number): Promise<void> => {
  await api.delete(`/inventory/${id}`);
};

// --- Supplier API ---

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
}

export type SupplierDto = Omit<Supplier, 'id'>;

export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await api.get<Supplier[]>('/suppliers');
  return response.data;
};

export const getSupplier = async (id: number): Promise<Supplier> => {
  const response = await api.get<Supplier>(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (data: SupplierDto): Promise<Supplier> => {
  const response = await api.post<Supplier>('/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id: number, data: SupplierDto): Promise<Supplier> => {
  const response = await api.put<Supplier>(`/suppliers/${id}`, data);
  return response.data;
};

export const deleteSupplier = async (id: number): Promise<void> => {
  await api.delete(`/suppliers/${id}`);
};

// --- Inventory Log API ---

export interface InventoryLog {
  id: number;
  inventory: Inventory; // Nested inventory item
  inventoryId: number;
  change: number;
  reason: string;
  orderId: number | null;
  createdAt: string;
}

export const getInventoryLogs = async (): Promise<InventoryLog[]> => {
  const response = await api.get<InventoryLog[]>('/inventory-logs');
  return response.data;
};