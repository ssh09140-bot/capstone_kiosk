"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const autoOrderService_1 = require("../services/autoOrderService");
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../db"));
// Mock the database
globals_1.jest.mock('../db', () => ({
    __esModule: true,
    default: {
        inventory: {
            findMany: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
        },
        purchaseOrder: {
            findFirst: globals_1.jest.fn(),
            findMany: globals_1.jest.fn(),
            create: globals_1.jest.fn(),
        },
        notification: {
            findFirst: globals_1.jest.fn(),
            create: globals_1.jest.fn(),
        },
    },
}));
// Mock logger
globals_1.jest.mock('../utils/logger', () => ({
    logger: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    },
}));
const mockPrisma = db_1.default;
describe('AutoOrderService', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
    });
    describe('checkStockAndCreatePurchaseOrders', () => {
        it('should not create orders when no inventory items need reordering', async () => {
            mockPrisma.inventory.findMany.mockResolvedValue([]);
            await (0, autoOrderService_1.checkStockAndCreatePurchaseOrders)();
            expect(mockPrisma.inventory.findMany).toHaveBeenCalled();
            expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
        });
        it('should create purchase order when inventory is below threshold', async () => {
            const mockInventory = {
                id: 1,
                name: 'Coffee Beans',
                quantity: 5.0,
                unit: 'kg',
                itemType: 'INGREDIENT',
                threshold: 5.0,
                createdAt: new Date(),
                updatedAt: new Date(),
                minStockThreshold: 10.0,
                orderQuantity: 20.0,
                estimatedDeliveryDays: 3,
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
                status: client_1.PurchaseOrderStatus.PENDING_CONFIRMATION,
                createdAt: new Date(),
                orderedAt: null,
                estimatedDeliveryAt: null,
                deliveredAt: null,
                supplierId: 1,
            });
            await (0, autoOrderService_1.checkStockAndCreatePurchaseOrders)();
            expect(mockPrisma.purchaseOrder.create).toHaveBeenCalledWith({
                data: {
                    storeId: 'test-store-id',
                    supplierId: 1,
                    status: client_1.PurchaseOrderStatus.PENDING_CONFIRMATION,
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
                quantity: 5.0,
                unit: 'kg',
                itemType: 'INGREDIENT',
                threshold: 5.0,
                createdAt: new Date(),
                updatedAt: new Date(),
                minStockThreshold: 10.0,
                orderQuantity: 20.0,
                estimatedDeliveryDays: 3,
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
                status: client_1.PurchaseOrderStatus.PENDING_CONFIRMATION,
            });
            await (0, autoOrderService_1.checkStockAndCreatePurchaseOrders)();
            expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
        });
        it('should skip if no supplier is available', async () => {
            const mockInventory = {
                id: 1,
                name: 'Coffee Beans',
                quantity: 5.0,
                unit: 'kg',
                itemType: 'INGREDIENT',
                threshold: 5.0,
                createdAt: new Date(),
                updatedAt: new Date(),
                minStockThreshold: 10.0,
                orderQuantity: 20.0,
                estimatedDeliveryDays: 3,
                storeId: 'test-store-id',
                autoOrderEnabled: true,
                lastLowStockNotifiedAt: null,
                suppliedBy: [],
            };
            mockPrisma.inventory.findMany.mockResolvedValue([mockInventory]);
            mockPrisma.purchaseOrder.findFirst.mockResolvedValue(null);
            await (0, autoOrderService_1.checkStockAndCreatePurchaseOrders)();
            expect(mockPrisma.purchaseOrder.create).not.toHaveBeenCalled();
        });
    });
    describe('checkExpectedDeliveriesAndNotify', () => {
        it('should not send notifications when no overdue orders exist', async () => {
            mockPrisma.purchaseOrder.findMany.mockResolvedValue([]);
            await (0, autoOrderService_1.checkExpectedDeliveriesAndNotify)();
            expect(mockPrisma.purchaseOrder.findMany).toHaveBeenCalled();
            expect(mockPrisma.notification.create).not.toHaveBeenCalled();
        });
        it('should send notification for overdue orders', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            const mockOrder = {
                id: 1,
                storeId: 'test-store-id',
                status: client_1.PurchaseOrderStatus.ORDERED,
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
            mockPrisma.purchaseOrder.findMany.mockResolvedValue([mockOrder]);
            mockPrisma.notification.findFirst.mockResolvedValue(null);
            await (0, autoOrderService_1.checkExpectedDeliveriesAndNotify)();
            expect(mockPrisma.notification.create).toHaveBeenCalledWith({
                data: {
                    storeId: 'test-store-id',
                    message: expect.stringContaining('발주 #1'),
                    type: client_1.NotificationType.DELIVERY_PROMPT,
                },
            });
        });
        it('should skip notification if recent notification already exists', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1);
            const mockOrder = {
                id: 1,
                storeId: 'test-store-id',
                status: client_1.PurchaseOrderStatus.ORDERED,
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
            mockPrisma.purchaseOrder.findMany.mockResolvedValue([mockOrder]);
            mockPrisma.notification.findFirst.mockResolvedValue({
                id: 1,
                createdAt: new Date(),
            });
            await (0, autoOrderService_1.checkExpectedDeliveriesAndNotify)();
            expect(mockPrisma.notification.create).not.toHaveBeenCalled();
        });
    });
});
