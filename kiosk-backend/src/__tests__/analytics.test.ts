import request from 'supertest';
import { jest } from '@jest/globals';
import { Express, Request, Response, NextFunction } from 'express';

// --- Mocks ---

jest.mock('../middleware/auth', () => ({
  __esModule: true,
  authenticateToken: (req: Request, res: Response, next: NextFunction) => {
    req.user = { id: 1, storeId: 'test-store-id', role: 'ADMIN' };
    next();
  },
}));

const mockGenerateSalesAnalysis: any = jest.fn();
jest.mock('../services/openaiService', () => ({
  __esModule: true,
  generateSalesAnalysis: mockGenerateSalesAnalysis,
}));

const mockPrisma: any = {
  $queryRaw: jest.fn(),
  orderItem: {
    groupBy: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
};
jest.mock('../db', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// --- Tests ---

describe('GET /api/analytics/monthly-summary', () => {
  let app: Express;

  beforeAll(async () => {
    app = (await import('../app')).default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return monthly sales analysis with AI suggestion', async () => {
    const mockSalesData = [
      { productId: 1, _sum: { quantity: 100 } },
      { productId: 2, _sum: { quantity: 10 } },
      { productId: 3, _sum: { quantity: 50 } },
    ];
    const mockProducts = [
      { id: 1, name: 'Best Product' },
      { id: 2, name: 'Worst Product' },
      { id: 3, name: 'Mid Product' },
    ];
    const mockSuggestion = 'AI suggests: ...';

    mockPrisma.orderItem.groupBy.mockResolvedValue(mockSalesData);
    mockPrisma.product.findMany.mockResolvedValue(mockProducts);
    mockGenerateSalesAnalysis.mockResolvedValue(mockSuggestion);

    const response = await request(app).get('/api/analytics/monthly-summary');

    expect(response.status).toBe(200);
    expect(response.body.bestSeller.name).toBe('Best Product');
    expect(response.body.worstSeller.name).toBe('Worst Product');
    expect(response.body.suggestion).toBe(mockSuggestion);
    expect(mockPrisma.orderItem.groupBy).toHaveBeenCalledTimes(1);
    expect(mockGenerateSalesAnalysis).toHaveBeenCalledTimes(1);
  });

  it('should return 404 if insufficient sales data', async () => {
    mockPrisma.orderItem.groupBy.mockResolvedValue([]); // No sales data

    const response = await request(app).get('/api/analytics/monthly-summary');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('분석을 위한 데이터가 충분하지 않습니다 (최소 2개 이상의 상품 판매 내역 필요).');
    expect(mockGenerateSalesAnalysis).not.toHaveBeenCalled();
  });

  it('should return analysis with null suggestion if AI generation fails', async () => {
    const mockSalesData = [
      { productId: 1, _sum: { quantity: 100 } },
      { productId: 2, _sum: { quantity: 10 } },
    ];
    const mockProducts = [
      { id: 1, name: 'Best Product' },
      { id: 2, name: 'Worst Product' },
    ];

    mockPrisma.orderItem.groupBy.mockResolvedValue(mockSalesData);
    mockPrisma.product.findMany.mockResolvedValue(mockProducts);
    mockGenerateSalesAnalysis.mockResolvedValue(null); // Simulate AI failure

    const response = await request(app).get('/api/analytics/monthly-summary');

    expect(response.status).toBe(200);
    expect(response.body.bestSeller.name).toBe('Best Product');
    expect(response.body.worstSeller.name).toBe('Worst Product');
    expect(response.body.suggestion).toBeNull();
    expect(mockGenerateSalesAnalysis).toHaveBeenCalledTimes(1);
  });
});
