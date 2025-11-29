import express, { Response } from 'express';
import prisma from './db';
import { Prisma, NotificationType } from '@prisma/client';
import { AuthRequest } from './middleware/authMiddleware';
import { generateLowStockNotification } from './services/openaiService';
import { getCurrentWeather } from './services/weatherService';
import { convertToBaseUnit } from './services/unitConversionService';

const router = express.Router();

// GET /api/orders
router.get('/', (async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

    const { startDate, endDate } = req.query;

    const where: any = { storeId: req.user.storeId };
    if (startDate && endDate) {
        where.createdAt = {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
        };
    }

    const orders = await prisma.order.findMany({
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
}) as any);

// GET /api/orders/:id
router.get('/:id', (async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const order = await prisma.order.findUnique({
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
}) as any);

// POST /api/orders
router.post('/', (async (req: AuthRequest, res: Response) => {
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
        const sanitizedItems = items.map((item: any) => ({
            productId: parseInt(String(item.productId), 10),
            quantity: parseInt(String(item.quantity), 10),
            pricePerItem: Number(item.pricePerItem)
        }));

        const weatherData = await getCurrentWeather();
        console.log('Weather data fetched:', weatherData);

        const productIds = sanitizedItems.map((item: { productId: number }) => item.productId);
        const products = await prisma.product.findMany({
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

        const inventoryCosts = await prisma.supplierInventory.findMany({
            where: { inventoryId: { in: uniqueInventoryIds } },
            distinct: ['inventoryId'],
        });
        console.log('Inventory costs fetched');
        const inventoryCostMap = new Map(inventoryCosts.map(ic => [ic.inventoryId, ic.price || 0]));

        const productCostMap = new Map<number, number>();
        let calculatedTotalCost = 0;
        let calculatedTotalAmount = 0;

        for (const product of products) {
            const productCost = product.inventoryUsages.reduce((sum, usage) => {
                const costPerBaseUnit = inventoryCostMap.get(usage.inventoryId) || 0;
                const convertedUsageAmount = convertToBaseUnit(
                    usage.usageAmount,
                    usage.usageUnit,
                    usage.inventory.unit
                );
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
        const inventoryUpdates: { id: number; newQuantity: number; }[] = [];
        const newOrder = await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    storeId: req.user!.storeId,
                    totalAmount: calculatedTotalAmount,
                    totalCost: calculatedTotalCost,
                    weather: weatherData?.weather,
                    temperature: weatherData?.temperature,
                    orderItems: {
                        create: sanitizedItems.map((item: { productId: number, quantity: number, pricePerItem: number }) => ({
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
                const product = productMap.get(item.productId)!;
                if (product.inventoryUsages) {
                    for (const usage of product.inventoryUsages) {
                        const amountToDecrement = convertToBaseUnit(
                            usage.usageAmount,
                            usage.usageUnit,
                            usage.inventory.unit
                        ) * item.quantity;

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
            const inventoryItem = await prisma.inventory.findUnique({ where: { id: invUpdate.id } });
            if (inventoryItem && inventoryItem.threshold && invUpdate.newQuantity < inventoryItem.threshold) {
                const message = await generateLowStockNotification(inventoryItem.name, invUpdate.newQuantity);
                if (message) {
                    await prisma.notification.create({
                        data: { storeId: req.user!.storeId, message, type: NotificationType.LOW_STOCK_WARNING },
                    });
                }
            }
        }

        res.status(201).json(newOrder);

    } catch (error) {
        console.error("Failed to create order:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025' || error.code === 'P2034') {
                return res.status(400).json({ message: '재고가 부족하여 주문을 처리할 수 없습니다.' });
            }
        }
        res.status(500).json({ message: 'Failed to create order.', error: String(error) });
    }
}) as any);

export default router;
