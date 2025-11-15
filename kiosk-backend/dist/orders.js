"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const client_1 = require("@prisma/client");
const auth_1 = require("./middleware/auth");
const authenticateBoth_1 = require("./middleware/authenticateBoth");
const openaiService_1 = require("./services/openaiService");
const router = express_1.default.Router();
// GET /api/orders
router.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const { startDate, endDate } = req.query;
    const where = { storeId: req.user.storeId };
    if (startDate && endDate) {
        where.createdAt = {
            gte: new Date(startDate),
            lte: new Date(endDate),
        };
    }
    const orders = await db_1.default.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            orderItems: {
                include: {
                    product: true,
                },
            },
        },
    });
    res.json(orders);
});
// GET /api/orders/:id
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const order = await db_1.default.order.findUnique({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        include: {
            orderItems: {
                include: {
                    product: true,
                },
            },
        },
    });
    if (!order) {
        return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }
    res.json(order);
});
// POST /api/orders
router.post('/', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }
    const { items } = req.body; // items: { productId: number, quantity: number, pricePerItem: number }[]
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain an array of items.' });
    }
    const calculatedTotalAmount = items.reduce((sum, item) => {
        const price = Number(item.pricePerItem) || 0;
        const quantity = Number(item.quantity) || 0;
        return sum + (price * quantity);
    }, 0);
    try {
        const inventoryUpdates = [];
        const newOrder = await db_1.default.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    storeId: req.user.storeId,
                    totalAmount: calculatedTotalAmount,
                    orderItems: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            pricePerItem: item.pricePerItem,
                        })),
                    },
                },
                include: {
                    orderItems: {
                        include: {
                            product: {
                                include: {
                                    inventoryUsages: {
                                        include: {
                                            inventory: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            for (const item of order.orderItems) {
                // 1. Decrement product stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
                // 2. Decrement inventory based on recipe and create logs
                if (item.product.inventoryUsages) {
                    for (const usage of item.product.inventoryUsages) {
                        const amountToDecrement = usage.usageAmount * item.quantity;
                        const updatedInventory = await tx.inventory.update({
                            where: { id: usage.inventoryId },
                            data: { quantity: { decrement: amountToDecrement } },
                        });
                        inventoryUpdates.push({ id: updatedInventory.id, newQuantity: updatedInventory.quantity });
                        // Create inventory log
                        await tx.inventoryLog.create({
                            data: {
                                inventoryId: usage.inventoryId,
                                change: -amountToDecrement,
                                reason: `Order #${order.id} Sale`,
                                orderId: order.id,
                            }
                        });
                    }
                }
            }
            return order;
        });
        // After transaction, check for low stock notifications
        // For products
        for (const item of newOrder.orderItems) {
            const updatedProduct = await db_1.default.product.findUnique({ where: { id: item.productId } });
            if (updatedProduct && updatedProduct.minStockThreshold && updatedProduct.stock < updatedProduct.minStockThreshold) {
                const message = await (0, openaiService_1.generateLowStockNotification)(updatedProduct.name, updatedProduct.stock);
                if (message) {
                    await db_1.default.notification.create({
                        data: { storeId: req.user.storeId, message, type: client_1.NotificationType.LOW_STOCK_WARNING },
                    });
                }
            }
        }
        // For inventory
        for (const invUpdate of inventoryUpdates) {
            const inventoryItem = await db_1.default.inventory.findUnique({ where: { id: invUpdate.id } });
            if (inventoryItem && inventoryItem.threshold && invUpdate.newQuantity < inventoryItem.threshold) {
                const message = await (0, openaiService_1.generateLowStockNotification)(inventoryItem.name, invUpdate.newQuantity);
                if (message) {
                    await db_1.default.notification.create({
                        data: { storeId: req.user.storeId, message, type: client_1.NotificationType.LOW_STOCK_WARNING },
                    });
                }
            }
        }
        res.status(201).json(newOrder);
    }
    catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ message: 'Failed to create order.' });
    }
});
exports.default = router;
