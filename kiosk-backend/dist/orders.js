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
const weatherService_1 = require("./services/weatherService");
const unitConversionService_1 = require("./services/unitConversionService");
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
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain an array of items.' });
    }
    try {
        console.log('Processing order for user:', req.user);
        console.log('Order items (raw):', items);
        // Sanitize items: ensure numbers for IDs and quantities
        const sanitizedItems = items.map((item) => ({
            productId: parseInt(String(item.productId), 10),
            quantity: parseInt(String(item.quantity), 10),
            pricePerItem: Number(item.pricePerItem)
        }));
        const weatherData = await (0, weatherService_1.getCurrentWeather)();
        console.log('Weather data fetched:', weatherData);
        const productIds = sanitizedItems.map((item) => item.productId);
        const products = await db_1.default.product.findMany({
            where: { id: { in: productIds } },
            include: {
                inventoryUsages: {
                    include: {
                        inventory: true, // Include inventory to get the base unit
                    },
                },
            },
        });
        console.log('Products fetched:', products.length);
        const productMap = new Map(products.map(p => [p.id, p]));
        const inventoryIds = products.flatMap(p => p.inventoryUsages.map(u => u.inventoryId));
        const uniqueInventoryIds = [...new Set(inventoryIds)];
        const inventoryCosts = await db_1.default.supplierInventory.findMany({
            where: { inventoryId: { in: uniqueInventoryIds } },
            distinct: ['inventoryId'],
        });
        console.log('Inventory costs fetched');
        const inventoryCostMap = new Map(inventoryCosts.map(ic => [ic.inventoryId, ic.price || 0]));
        const productCostMap = new Map();
        let calculatedTotalCost = 0;
        let calculatedTotalAmount = 0;
        for (const product of products) {
            const productCost = product.inventoryUsages.reduce((sum, usage) => {
                const costPerBaseUnit = inventoryCostMap.get(usage.inventoryId) || 0;
                const convertedUsageAmount = (0, unitConversionService_1.convertToBaseUnit)(usage.usageAmount, usage.usageUnit, usage.inventory.unit);
                return sum + (costPerBaseUnit * convertedUsageAmount);
            }, 0);
            productCostMap.set(product.id, productCost);
        }
        for (const item of sanitizedItems) {
            const product = productMap.get(item.productId);
            if (!product) {
                console.error(`Product not found: ${item.productId}`);
                return res.status(400).json({ message: `Product with ID ${item.productId} not found.` });
            }
            const costPerItem = productCostMap.get(item.productId) || 0;
            calculatedTotalCost += costPerItem * item.quantity;
            calculatedTotalAmount += item.pricePerItem * item.quantity;
        }
        console.log('Starting transaction...');
        const inventoryUpdates = [];
        const newOrder = await db_1.default.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    storeId: req.user.storeId,
                    totalAmount: calculatedTotalAmount,
                    totalCost: calculatedTotalCost,
                    weather: weatherData?.weather,
                    temperature: weatherData?.temperature,
                    orderItems: {
                        create: sanitizedItems.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            pricePerItem: item.pricePerItem,
                            costPerItem: productCostMap.get(item.productId) || 0,
                        })),
                    },
                },
            });
            console.log('Order created:', order.id);
            for (const item of sanitizedItems) {
                const product = productMap.get(item.productId);
                if (product.inventoryUsages) {
                    for (const usage of product.inventoryUsages) {
                        const amountToDecrement = (0, unitConversionService_1.convertToBaseUnit)(usage.usageAmount, usage.usageUnit, usage.inventory.unit) * item.quantity;
                        const updatedInventory = await tx.inventory.update({
                            where: { id: usage.inventoryId },
                            data: { quantity: { decrement: amountToDecrement } },
                        });
                        inventoryUpdates.push({ id: updatedInventory.id, newQuantity: updatedInventory.quantity });
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
        console.log('Transaction completed');
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
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025' || error.code === 'P2034') {
                return res.status(400).json({ message: '재고가 부족하여 주문을 처리할 수 없습니다.' });
            }
        }
        res.status(500).json({ message: 'Failed to create order.', error: String(error) });
    }
});
exports.default = router;
