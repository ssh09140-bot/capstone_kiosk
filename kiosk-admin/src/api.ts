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
  itemType: string;
  threshold: number | null;
  createdAt: string;
  updatedAt: string;
  storeId: string;
  autoOrderEnabled?: boolean;
  minStockThreshold?: number | null;
  orderQuantity?: number | null;
}

export interface CreateInventoryItemDto {
  name: string;
  quantity: number;
  unit: string;
  itemType: string; // Added
  threshold?: number | null;
  autoOrderEnabled?: boolean;
  minStockThreshold?: number | null;
  orderQuantity?: number | null;
  estimatedDeliveryDays?: number | null;
}

export interface UpdateInventoryItemDto {
  name?: string;
  quantity?: number;
  unit?: string;
  itemType?: string; // Added as optional
  threshold?: number | null;
  autoOrderEnabled?: boolean;
  minStockThreshold?: number | null;
  orderQuantity?: number | null;
  estimatedDeliveryDays?: number | null;
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

export interface SupplierInventory {
  id: number;
  inventoryId: number;
  price: number | null;
  leadTimeDays: number | null;
  inventory: Inventory;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  supplies: SupplierInventory[];
}

export type SupplierDto = Omit<Supplier, 'id' | 'supplies'> & {
  supplies?: Array<{
    inventoryId: number;
    price: number | null;
    leadTimeDays: number | null;
  }>;
};

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

// --- Purchase Order API ---
export const createPurchaseOrderFromRecommendation = async (data: {
  inventoryId: number;
  supplierId: number;
  quantity: number;
}) => {
  const response = await api.post('/purchase-orders/from-recommendation', data);
  return response.data;
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

// --- Recommendation API ---

export interface Recommendation {
  inventoryId: number;
  inventoryName: string;
  reason: string;
  currentStock: number;
  unit: string;
  predictedUsage: number;
  supplierId: number;
  supplierName: string;
  leadTimeDays: number;
  recommendedOrderAmount: number;
}

export interface RecommendationResponse {
  message: string;
  recommendations: Recommendation[];
}

export const getRecommendations = async (): Promise<RecommendationResponse> => {
  const response = await api.get<RecommendationResponse>('/recommendations');
  return response.data;
};

// --- Analytics API ---

export interface ReportSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface DailyTrend {
  date: string;
  sales: number;
}

export interface TopProduct {
  name: string;
  quantity: number;
}

export interface SalesByHour {
  hour: number;
  sales: number;
}

export interface ReportResponse {
  summary: ReportSummary;
  dailyTrends: DailyTrend[];
  topProducts?: TopProduct[];
  bottomProducts?: TopProduct[];
  salesByHour?: SalesByHour[];
}

export const getAnalyticsReport = async (params: { startDate?: string; endDate?: string }): Promise<ReportResponse> => {
  const response = await api.get<ReportResponse>('/analytics/reports', { params });
  return response.data;
};