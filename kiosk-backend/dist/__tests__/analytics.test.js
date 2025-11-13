"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const globals_1 = require("@jest/globals");
// --- Mocks ---
globals_1.jest.mock('../middleware/auth', () => ({
    __esModule: true,
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, storeId: 'test-store-id', role: 'ADMIN' };
        next();
    },
}));
const mockGenerateSalesAnalysis = globals_1.jest.fn();
globals_1.jest.mock('../services/openaiService', () => ({
    __esModule: true,
    generateSalesAnalysis: mockGenerateSalesAnalysis,
}));
const mockPrisma = {
    $queryRaw: globals_1.jest.fn(),
    orderItem: {
        groupBy: globals_1.jest.fn(),
    },
    product: {
        findMany: globals_1.jest.fn(),
    },
};
globals_1.jest.mock('../db', () => ({
    __esModule: true,
    default: mockPrisma,
}));
// --- Tests ---
describe('GET /api/analytics/monthly-summary', () => {
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require('../app')))).default;
    });
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
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
        const response = await (0, supertest_1.default)(app).get('/api/analytics/monthly-summary');
        expect(response.status).toBe(200);
        expect(response.body.bestSeller.name).toBe('Best Product');
        expect(response.body.worstSeller.name).toBe('Worst Product');
        expect(response.body.suggestion).toBe(mockSuggestion);
        expect(mockPrisma.orderItem.groupBy).toHaveBeenCalledTimes(1);
        expect(mockGenerateSalesAnalysis).toHaveBeenCalledTimes(1);
    });
    it('should return 404 if insufficient sales data', async () => {
        mockPrisma.orderItem.groupBy.mockResolvedValue([]); // No sales data
        const response = await (0, supertest_1.default)(app).get('/api/analytics/monthly-summary');
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
        const response = await (0, supertest_1.default)(app).get('/api/analytics/monthly-summary');
        expect(response.status).toBe(200);
        expect(response.body.bestSeller.name).toBe('Best Product');
        expect(response.body.worstSeller.name).toBe('Worst Product');
        expect(response.body.suggestion).toBeNull();
        expect(mockGenerateSalesAnalysis).toHaveBeenCalledTimes(1);
    });
});
