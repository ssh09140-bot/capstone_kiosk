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

// 응답 인터셉터: 에러 처리
api.interceptors.response.use(
  response => response,
  error => {
    // Rate limit 에러 (429) 처리
    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retryAfter || 60;
      console.warn(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
      // 로그아웃하지 않고 에러만 반환
      return Promise.reject(error);
    }
    
    // 인증 에러 (401, 403) 처리 - 토큰이 만료되었거나 유효하지 않은 경우
    if (error.response?.status === 401 || error.response?.status === 403) {
      // 로그인 페이지가 아닌 경우에만 로그아웃 처리
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('authToken');
        // 로그인 페이지로 리다이렉트하지 않고 에러만 반환
        // (각 컴포넌트에서 필요시 처리하도록)
      }
    }
    
    return Promise.reject(error);
  }
);

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

export const createBatchPurchaseOrdersFromRecommendations = async (items: Array<{
  inventoryId: number;
  supplierId: number;
  quantity: number;
}>) => {
  const response = await api.post('/purchase-orders/batch-from-recommendations', { items });
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
  confidence?: 'high' | 'low'; // 신뢰도 추가
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
  salesByHour?: SalesByHour[];
}

export const getAnalyticsReport = async (params: { startDate?: string; endDate?: string }): Promise<ReportResponse> => {
  const response = await api.get<ReportResponse>('/analytics/reports', { params });
  return response.data;
};