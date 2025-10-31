// This file is manually synced with /kiosk-backend/prisma/schema.prisma
// TODO: Automate this synchronization

export type NotificationType = 'LOW_STOCK_WARNING' | 'ORDER_CONFIRMATION' | 'DELIVERY_PROMPT' | 'DELIVERY_REMINDER';

export type PurchaseOrderStatus = 'PENDING_CONFIRMATION' | 'ORDERED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: number;
  email: string;
  storeName: string;
  storeId: string;
  billingKey?: string | null;
  customerKey?: string | null;
  cardCompany?: string | null;
  cardNumber?: string | null;
}

export interface Category {
  id: number;
  name: string;
  storeId: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  stock: number;
  createdAt: string; // DateTime is serialized as string
  storeId: string;
  categoryId?: number | null;
  category?: Category | null;
  optionGroups: OptionGroup[];
  autoOrderEnabled: boolean;
  minStockThreshold?: number | null;
  orderQuantity?: number | null;
  estimatedDeliveryDays?: number | null;
  isEventProduct: boolean;
  eventPrice?: number | null;
}

export interface OptionGroup {
  id: number;
  name: string;
  storeId: string;
  options: Option[];
}

export interface Option {
  id: number;
  name: string;
  price: number;
  optionGroupId: number;
}

export interface Order {
  id: number;
  totalAmount: number;
  createdAt: string; // DateTime is serialized as string
  storeId: string;
  orderItems: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  product: Product;
  quantity: number;
  pricePerItem: number;
  selectedOptions?: any; // JSON
}

export interface PurchaseOrder {
  id: number;
  createdAt: string; // DateTime
  orderedAt?: string | null; // DateTime
  estimatedDeliveryAt?: string | null; // DateTime
  deliveredAt?: string | null; // DateTime
  status: PurchaseOrderStatus;
  storeId: string;
  purchaseOrderItems: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  purchaseOrderId: number;
  productId: number;
  product: Product;
  quantity: number;
  defectiveQuantity?: number | null;
}

export interface Notification {
  id: number;
  message: string;
  read: boolean;
  createdAt: string; // DateTime
  type: NotificationType;
  storeId: string;
}
