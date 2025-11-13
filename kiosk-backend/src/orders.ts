import express from 'express';
import prisma from './db';
import { Prisma, NotificationType } from '@prisma/client';
import { authenticateToken } from './middleware/auth';
import { authenticateBoth } from './middleware/authenticateBoth';
import { generateLowStockNotification } from './services/openaiService';

const router = express.Router();

// GET /api/orders
router.get('/', authenticateToken, async (req, res) => {
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
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, async (req, res) => {
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
});

// POST /api/orders
router.post('/', authenticateBoth, async (req, res) => {
    if (!req.user) { 
        return res.status(401).json({ message: 'User not authenticated' });
    }
    const { items } = req.body; // items: { productId: number, quantity: number, pricePerItem: number }[]

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Order must contain an array of items.' });
    }

    const calculatedTotalAmount = items.reduce((sum: number, item: { pricePerItem: number, quantity: number }) => {
        const price = Number(item.pricePerItem) || 0;
        const quantity = Number(item.quantity) || 0;
        return sum + (price * quantity);
    }, 0);

    try {
        const inventoryUpdates: { id: number; newQuantity: number; }[] = [];

        const newOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const order = await tx.order.create({
                data: {
                    storeId: req.user!.storeId,
                    totalAmount: calculatedTotalAmount,
                    orderItems: {
                        create: items.map((item: { productId: number, quantity: number, pricePerItem: number }) => ({ 
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
            const updatedProduct = await prisma.product.findUnique({ where: { id: item.productId } });
            if (updatedProduct && updatedProduct.minStockThreshold && updatedProduct.stock < updatedProduct.minStockThreshold) {
                const message = await generateLowStockNotification(updatedProduct.name, updatedProduct.stock);
                if (message) {
                    await prisma.notification.create({
                        data: { storeId: req.user!.storeId, message, type: NotificationType.LOW_STOCK_WARNING },
                    });
                }
            }
        }

        // For inventory
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
        res.status(500).json({ message: 'Failed to create order.' });
    }
});

export default router;
