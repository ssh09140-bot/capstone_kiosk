import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';
import { PurchaseOrderStatus, NotificationType } from '@prisma/client';

const router = express.Router();

// [POST] /api/purchase-orders/from-recommendation
router.post('/from-recommendation', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const { inventoryId, supplierId, quantity } = req.body;

    if (!inventoryId || !supplierId || !quantity) {
        return res.status(400).json({ message: '필수 정보(inventoryId, supplierId, quantity)가 누락되었습니다.' });
    }

    try {
        const newPurchaseOrder = await prisma.purchaseOrder.create({
            data: {
                storeId: req.user.storeId,
                supplierId: supplierId,
                status: PurchaseOrderStatus.PENDING_CONFIRMATION,
                purchaseOrderItems: {
                    create: [{
                        inventoryId: inventoryId,
                        quantity: quantity,
                    }],
                },
            },
            include: {
                purchaseOrderItems: {
                    include: {
                        inventory: true,
                    }
                }
            }
        });

        await prisma.notification.create({
            data: {
                storeId: req.user.storeId,
                message: `AI 추천으로 발주 #${newPurchaseOrder.id}가 생성되었습니다. 확정이 필요합니다.`,
                type: NotificationType.ORDER_CONFIRMATION,
            },
        });

        res.status(201).json(newPurchaseOrder);
    } catch (error) {
        console.error('Error creating purchase order from recommendation:', error);
        res.status(500).json({ message: '추천 기반 발주 생성에 실패했습니다.' });
    }
});


// [GET] /api/purchase-orders
router.get('/', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
        include: {
            supplier: true, // Include supplier info
            purchaseOrderItems: {
                include: {
                    product: true,
                    inventory: true, // Include inventory
                }
            }
        },
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
    const firstItem = await prisma.purchaseOrderItem.findFirst({
        where: { purchaseOrderId: orderId },
        include: { product: true, inventory: true },
    });

    const itemEntity = firstItem?.product || firstItem?.inventory;
    const deliveryDays = estimatedDeliveryDays || itemEntity?.estimatedDeliveryDays || 2;
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

    try {
        const updatedOrder = await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const orderItem = await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: { defectiveQuantity: item.defectiveQuantity },
                });

                const stockToAdd = orderItem.quantity - (item.defectiveQuantity || 0);
                if (stockToAdd > 0) {
                    if (orderItem.productId) {
                        await tx.product.update({
                            where: { id: orderItem.productId },
                            data: { stock: { increment: stockToAdd } },
                        });
                    } else if (orderItem.inventoryId) {
                        await tx.inventory.update({
                            where: { id: orderItem.inventoryId },
                            data: { quantity: { increment: stockToAdd } },
                        });
                        // Create inventory log for received stock
                        await tx.inventoryLog.create({
                            data: {
                                inventoryId: orderItem.inventoryId,
                                change: stockToAdd,
                                reason: `Purchase Order #${orderId} Received`,
                            }
                        });
                    }
                }
            }

            return tx.purchaseOrder.update({
                where: { id: orderId },
                data: { status: PurchaseOrderStatus.DELIVERED, deliveredAt: new Date() },
            });
        });
        res.json(updatedOrder);
    } catch (error) {
        console.error('Error receiving purchase order:', error);
        res.status(500).json({ message: '발주 입고 처리에 실패했습니다.' });
    }
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
