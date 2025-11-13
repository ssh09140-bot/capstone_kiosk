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
const client_1 = require("@prisma/client");
// --- Mocks ---
globals_1.jest.mock('../middleware/authenticateBoth', () => ({
    __esModule: true,
    authenticateBoth: (req, res, next) => {
        req.user = { id: 1, storeId: 'test-store-id', role: 'ADMIN' };
        next();
    },
}));
const mockGenerateNotification = globals_1.jest.fn();
globals_1.jest.mock('../services/openaiService', () => ({
    __esModule: true,
    generateLowStockNotification: mockGenerateNotification,
}));
const mockPrisma = {
    $transaction: globals_1.jest.fn(),
    product: {
        findUnique: globals_1.jest.fn(),
    },
    notification: {
        create: globals_1.jest.fn(),
    },
};
globals_1.jest.mock('../db', () => ({
    __esModule: true,
    default: mockPrisma,
}));
// --- Tests ---
describe('POST /api/orders', () => {
    let app;
    beforeAll(async () => {
        app = (await Promise.resolve().then(() => __importStar(require('../app')))).default;
    });
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
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
        const response = await (0, supertest_1.default)(app).post('/api/orders').send(orderPayload);
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
        const response = await (0, supertest_1.default)(app).post('/api/orders').send(orderPayload);
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
                type: client_1.NotificationType.LOW_STOCK_WARNING,
            },
        });
    });
});
