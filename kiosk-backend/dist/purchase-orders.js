"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// [GET] /api/purchase-orders
router.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const purchaseOrders = await db_1.default.purchaseOrder.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
        include: { purchaseOrderItems: { include: { product: true } } },
    });
    res.json(purchaseOrders);
});
// [POST] /api/purchase-orders/:id/confirm
router.post('/:id/confirm', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const purchaseOrder = await db_1.default.purchaseOrder.findUnique({ where: { id: orderId, storeId: req.user.storeId } });
    if (!purchaseOrder || purchaseOrder.status !== client_1.PurchaseOrderStatus.PENDING_CONFIRMATION) {
        return res.status(404).json({ message: '확인 대기 중인 발주를 찾을 수 없습니다.' });
    }
    const { estimatedDeliveryDays } = req.body;
    const firstItem = await db_1.default.purchaseOrderItem.findFirst({ where: { purchaseOrderId: orderId } });
    const product = firstItem ? await db_1.default.product.findUnique({ where: { id: firstItem.productId } }) : null;
    const deliveryDays = estimatedDeliveryDays || product?.estimatedDeliveryDays || 2;
    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setDate(estimatedDeliveryAt.getDate() + deliveryDays);
    const updatedOrder = await db_1.default.purchaseOrder.update({
        where: { id: orderId },
        data: {
            status: client_1.PurchaseOrderStatus.ORDERED,
            orderedAt: new Date(),
            estimatedDeliveryAt: estimatedDeliveryAt,
        },
    });
    await db_1.default.notification.create({
        data: {
            storeId: req.user.storeId,
            message: `발주 #${orderId}가 확정되어 주문에 들어갔습니다.`,
            type: client_1.NotificationType.ORDER_CONFIRMATION,
        },
    });
    res.json(updatedOrder);
});
// [POST] /api/purchase-orders/:id/receive
router.post('/:id/receive', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const { items } = req.body; // items: [{ purchaseOrderItemId, defectiveQuantity }]
    const purchaseOrder = await db_1.default.purchaseOrder.findUnique({ where: { id: orderId, storeId: req.user.storeId } });
    if (!purchaseOrder || purchaseOrder.status !== client_1.PurchaseOrderStatus.ORDERED) {
        return res.status(404).json({ message: '배송 중인 발주를 찾을 수 없습니다.' });
    }
    const updatedOrder = await db_1.default.$transaction(async (tx) => {
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
            data: { status: client_1.PurchaseOrderStatus.DELIVERED, deliveredAt: new Date() },
        });
    });
    res.json(updatedOrder);
});
// [POST] /api/purchase-orders/:id/delay
router.post('/:id/delay', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const { delayHours } = req.body; // e.g., 3 hours
    const newEstimatedDeliveryAt = new Date();
    newEstimatedDeliveryAt.setHours(newEstimatedDeliveryAt.getHours() + delayHours);
    await db_1.default.purchaseOrder.updateMany({
        where: { id: orderId, storeId: req.user.storeId, status: client_1.PurchaseOrderStatus.ORDERED },
        data: { estimatedDeliveryAt: newEstimatedDeliveryAt },
    });
    res.status(200).send('Delivery reminder postponed.');
});
exports.default = router;
