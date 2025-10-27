import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, PurchaseOrderStatus, NotificationType } from '@prisma/client';
import prisma from './db';

import multer from 'multer';
import path from 'path';
import fs from 'fs';

import cron from 'node-cron';
import { checkStockAndCreatePurchaseOrders, checkExpectedDeliveriesAndNotify } from './services/autoOrderService';
import authRoutes from './auth';
import analyticsRoutes from './analytics';
import { authenticateToken } from './middleware/auth';
import { authenticateBoth } from './middleware/authenticateBoth'; // Import authenticateBoth middleware
import productRoutes from './products';
import categoryRoutes from './categories';
import optionGroupRoutes from './option-groups';
import orderRoutes from './orders';
import userRoutes from './users';



const app = express();

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));





app.use('/api/auth', authRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/option-groups', optionGroupRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', userRoutes);

// --- API Routes ---

// [GET] /api/notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notifications = await prisma.notification.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
});

// [POST] /api/notifications/:id/read
app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notification = await prisma.notification.updateMany({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        data: { read: true },
    });
    res.status(200).json(notification);
});

// [GET] /api/purchase-orders
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
        include: { purchaseOrderItems: { include: { product: true } } },
    });
    res.json(purchaseOrders);
});

// [POST] /api/purchase-orders/:id/confirm
app.post('/api/purchase-orders/:id/confirm', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const purchaseOrder = await prisma.purchaseOrder.findUnique({ where: { id: orderId, storeId: req.user.storeId } });
    if (!purchaseOrder || purchaseOrder.status !== PurchaseOrderStatus.PENDING_CONFIRMATION) {
        return res.status(404).json({ message: '확인 대기 중인 발주를 찾을 수 없습니다.' });
    }

    const { estimatedDeliveryDays } = req.body;
    const firstItem = await prisma.purchaseOrderItem.findFirst({ where: { purchaseOrderId: orderId } });
    const product = firstItem ? await prisma.product.findUnique({ where: { id: firstItem.productId } }) : null;
    const deliveryDays = estimatedDeliveryDays || product?.estimatedDeliveryDays || 2;
    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + deliveryDays);

    const updatedOrder = await prisma.purchaseOrder.update({
        where: { id: orderId },
        data: {
            status: PurchaseOrderStatus.ORDERED,
            orderedAt: new Date(),
            estimatedDeliveryAt: estimatedDeliveryAt,
        },
    });

    await prisma.notification.create({
        data: {
            storeId: req.user.storeId,
            message: `발주 #${orderId}가 확정되어 주문에 들어갔습니다.`,
            type: NotificationType.ORDER_CONFIRMATION,
        },
    });

    res.json(updatedOrder);
});

// [POST] /api/purchase-orders/:id/receive
app.post('/api/purchase-orders/:id/receive', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const { items } = req.body; // items: [{ purchaseOrderItemId, defectiveQuantity }]

    const purchaseOrder = await prisma.purchaseOrder.findUnique({ where: { id: orderId, storeId: req.user.storeId } });
    if (!purchaseOrder || purchaseOrder.status !== PurchaseOrderStatus.ORDERED) {
        return res.status(404).json({ message: '배송 중인 발주를 찾을 수 없습니다.' });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
        for (const item of items) {
            const orderItem = await tx.purchaseOrderItem.update({
                where: { id: item.purchaseOrderItemId },
                data: { defectiveQuantity: item.defectiveQuantity },
                include: { product: true },
            });

            const stockToAdd = orderItem.quantity - (item.defectiveQuantity || 0);
            if (stockToAdd > 0) {
                await tx.product.update({
                    where: { id: orderItem.productId },
                    data: { stock: { increment: stockToAdd } },
                });
            }
        }

        return tx.purchaseOrder.update({
            where: { id: orderId },
            data: { status: PurchaseOrderStatus.DELIVERED, deliveredAt: new Date() },
        });
    });

    res.json(updatedOrder);
});

// [POST] /api/purchase-orders/:id/delay
app.post('/api/purchase-orders/:id/delay', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const { delayHours } = req.body; // e.g., 3 hours

    const newEstimatedDeliveryAt = new Date();
    newEstimatedDeliveryAt.setHours(newEstimatedDeliveryAt.getHours() + delayHours);

    await prisma.purchaseOrder.updateMany({
        where: { id: orderId, storeId: req.user.storeId, status: PurchaseOrderStatus.ORDERED },
        data: { estimatedDeliveryAt: newEstimatedDeliveryAt },
    });

    res.status(200).send('Delivery reminder postponed.');
});


// --- Scheduled Tasks ---
if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 21 * * *', () => {
        console.log('--- Running Daily Auto-Order Check (9 PM) ---');
        checkStockAndCreatePurchaseOrders();
    }, {
        timezone: "Asia/Seoul"
    });

    cron.schedule('0 10 * * *', () => {
        console.log('--- Running Daily Delivery Check (10 AM) ---');
        checkExpectedDeliveriesAndNotify();
    }, {
        timezone: "Asia/Seoul"
    });
}

export default app;
