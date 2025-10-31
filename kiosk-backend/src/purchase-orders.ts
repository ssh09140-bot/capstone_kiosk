import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';
import { PurchaseOrderStatus, NotificationType } from '@prisma/client';

const router = express.Router();

// [GET] /api/purchase-orders
router.get('/', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
        include: { purchaseOrderItems: { include: { product: true } } },
    });
    res.json(purchaseOrders);
});

// [POST] /api/purchase-orders/:id/confirm
router.post('/:id/confirm', authenticateToken, async (req, res) => {
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
router.post('/:id/receive', authenticateToken, async (req, res) => {
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
router.post('/:id/delay', authenticateToken, async (req, res) => {
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

export default router;
