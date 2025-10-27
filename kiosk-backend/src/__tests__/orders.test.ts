import request from 'supertest';
import { jest } from '@jest/globals';
import { Express, Request, Response, NextFunction } from 'express';
import { NotificationType } from '@prisma/client';

// --- Mocks ---

jest.mock('../middleware/authenticateBoth', () => ({
  __esModule: true,
  authenticateBoth: (req: Request, res: Response, next: NextFunction) => {
    req.user = { id: 1, storeId: 'test-store-id', role: 'ADMIN' };
    next();
  },
}));

const mockGenerateNotification: any = jest.fn();
jest.mock('../services/openaiService', () => ({
  __esModule: true,
  generateLowStockNotification: mockGenerateNotification,
}));

const mockPrisma: any = {
  $transaction: jest.fn(),
  product: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
};
jest.mock('../db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// --- Tests ---

describe('POST /api/orders', () => {
  let app: Express;

  beforeAll(async () => {
    app = (await import('../app')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an order successfully when stock is sufficient', async () => {
    const orderPayload = {
      items: [{ productId: 1, quantity: 1, pricePerItem: 1500 }],
      totalAmount: 1500,
    };

    const mockOrder = {
      id: 1,
      orderItems: [{ productId: 1, quantity: 1 }],
    };

    mockPrisma.$transaction.mockResolvedValue(mockOrder);
    mockPrisma.product.findUnique.mockResolvedValue({ name: 'Test Product', stock: 20 }); // Sufficient stock

    const response = await request(app).post('/api/orders').send(orderPayload);

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(mockOrder.id);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockGenerateNotification).not.toHaveBeenCalled();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('should trigger AI notification when stock is low', async () => {
    const orderPayload = {
      items: [{ productId: 2, quantity: 1, pricePerItem: 2000 }],
      totalAmount: 2000,
    };

    const mockOrder = {
      id: 2,
      orderItems: [{ productId: 2, quantity: 1 }],
    };

    const aiMessage = 'AI-generated low stock alert!';

    mockPrisma.$transaction.mockResolvedValue(mockOrder);
    mockPrisma.product.findUnique.mockResolvedValue({ name: 'Low Stock Product', stock: 5 }); // Low stock
    mockGenerateNotification.mockResolvedValue(aiMessage);

    const response = await request(app).post('/api/orders').send(orderPayload);

    expect(response.status).toBe(201);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    
    // Check if AI service and notification creation were called
    expect(mockGenerateNotification).toHaveBeenCalledTimes(1);
    expect(mockGenerateNotification).toHaveBeenCalledWith('Low Stock Product', 5);

    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        storeId: 'test-store-id',
        message: aiMessage,
        type: NotificationType.LOW_STOCK_WARNING,
      },
    });
  });
});
