import { jest } from '@jest/globals';
import {
  checkStockAndCreatePurchaseOrders,
  checkExpectedDeliveriesAndNotify,
} from '../services/autoOrderService';
import { PurchaseOrderStatus, NotificationType } from '@prisma/client';
import prisma from '../db';

// Mock the database
jest.mock('../db', () => ({
  __esModule: true,
  default: {
    inventory: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    purchaseOrder: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AutoOrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkStockAndCreatePurchaseOrders', () => {
    it('should not create orders when no inventory items need reordering', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([]);

      await checkStockAndCreatePurchaseOrders();

      expect(mockPrisma.inventory.findMany).toHaveBeenCalled();
      expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
    });

    it('should create purchase order when inventory is below threshold', async () => {
      const mockInventory = {
        id: 1,
        name: 'Coffee Beans',
        quantity: 5,
        unit: 'kg',
        minStockThreshold: 10,
        orderQuantity: 20,
        storeId: 'test-store-id',
        autoOrderEnabled: true,
        lastLowStockNotifiedAt: null,
        suppliedBy: [
          {
            supplierId: 1,
            leadTimeDays: 2,
            supplier: {
              id: 1,
              name: 'Test Supplier',
            },
          },
        ],
      };

      mockPrisma.inventory.findMany.mockResolvedValue([mockInventory]);
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      mockPrisma.purchaseOrder.create.mockResolvedValue({
        id: 1,
        storeId: 'test-store-id',
        status: PurchaseOrderStatus.PENDING_CONFIRMATION,
        createdAt: new Date(),
        orderedAt: null,
        estimatedDeliveryAt: null,
        deliveredAt: null,
        supplierId: 1,
      } as any);

      await checkStockAndCreatePurchaseOrders();

      expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith({
        data: {
          storeId: 'test-store-id',
          supplierId: 1,
          status: PurchaseOrderStatus.PENDING_CONFIRMATION,
          purchaseOrderItems: {
            create: [
              {
                inventoryId: 1,
                quantity: 20,
              },
            ],
          },
        },
      });
      expect(mockPrisma.notification.create).toHaveBeenCalled();
    });

    it('should skip creating order if pending order already exists', async () => {
      const mockInventory = {
        id: 1,
        name: 'Coffee Beans',
        quantity: 5,
        unit: 'kg',
        minStockThreshold: 10,
        orderQuantity: 20,
        storeId: 'test-store-id',
        autoOrderEnabled: true,
        lastLowStockNotifiedAt: null,
        suppliedBy: [
          {
            supplierId: 1,
            leadTimeDays: 2,
            supplier: {
              id: 1,
              name: 'Test Supplier',
            },
          },
        ],
      };

      mockPrisma.inventory.findMany.mockResolvedValue([mockInventory]);
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue({
        id: 1,
        status: PurchaseOrderStatus.PENDING_CONFIRMATION,
      } as any);

      await checkStockAndCreatePurchaseOrders();

      expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
    });

    it('should skip if no supplier is available', async () => {
      const mockInventory = {
        id: 1,
        name: 'Coffee Beans',
        quantity: 5,
        unit: 'kg',
        minStockThreshold: 10,
        orderQuantity: 20,
        storeId: 'test-store-id',
        autoOrderEnabled: true,
        lastLowStockNotifiedAt: null,
        suppliedBy: [],
      };

      mockPrisma.inventory.findMany.mockResolvedValue([mockInventory]);
      mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);

      await checkStockAndCreatePurchaseOrders();

      expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
    });
  });

  describe('checkExpectedDeliveriesAndNotify', () => {
    it('should not send notifications when no overdue orders exist', async () => {
      mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);

      await checkExpectedDeliveriesAndNotify();

      expect(mockPrisma.purchaseOrder.findMany).toHaveBeenCalled();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });

    it('should send notification for overdue orders', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockOrder = {
        id: 1,
        storeId: 'test-store-id',
        status: PurchaseOrderStatus.ORDERED,
        estimatedDeliveryAt: pastDate,
        purchaseOrderItems: [
          {
            inventory: {
              name: 'Coffee Beans',
            },
            product: null,
          },
        ],
        store: {
          storeId: 'test-store-id',
          storeName: 'Test Store',
        },
      };

      mockPrisma.purchaseOrder.findMany.mockResolvedValue([mockOrder] as any);
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await checkExpectedDeliveriesAndNotify();

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          storeId: 'test-store-id',
          message: expect.stringContaining('발주 #1'),
          type: NotificationType.DELIVERY_PROMPT,
        },
      });
    });

    it('should skip notification if recent notification already exists', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockOrder = {
        id: 1,
        storeId: 'test-store-id',
        status: PurchaseOrderStatus.ORDERED,
        estimatedDeliveryAt: pastDate,
        purchaseOrderItems: [
          {
            inventory: {
              name: 'Coffee Beans',
            },
            product: null,
          },
        ],
        store: {
          storeId: 'test-store-id',
          storeName: 'Test Store',
        },
      };

      mockPrisma.purchaseOrder.findMany.mockResolvedValue([mockOrder] as any);
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 1,
        createdAt: new Date(),
      } as any);

      await checkExpectedDeliveriesAndNotify();

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });
});

