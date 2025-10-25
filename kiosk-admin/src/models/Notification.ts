export interface Notification {
  id: number;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'LOW_STOCK_WARNING' | 'ORDER_CONFIRMATION' | 'DELIVERY_PROMPT' | 'DELIVERY_REMINDER';
  storeId: string;
}
