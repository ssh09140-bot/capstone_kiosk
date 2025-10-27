"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const node_cron_1 = __importDefault(require("node-cron"));
const autoOrderService_1 = require("./services/autoOrderService");
const auth_1 = __importDefault(require("./auth"));
const analytics_1 = __importDefault(require("./analytics"));
const auth_2 = require("./middleware/auth");
const products_1 = __importDefault(require("./products"));
const categories_1 = __importDefault(require("./categories"));
const option_groups_1 = __importDefault(require("./option-groups"));
const orders_1 = __importDefault(require("./orders"));
const users_1 = __importDefault(require("./users"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const uploadsDir = path_1.default.join(__dirname, '../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir);
}
app.use('/uploads', express_1.default.static(uploadsDir));
app.use('/api/auth', auth_1.default);
app.use('/api', analytics_1.default);
app.use('/api/products', products_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/option-groups', option_groups_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api', users_1.default);
// --- API Routes ---
// [GET] /api/notifications
app.get('/api/notifications', auth_2.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notifications = await prisma.notification.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
});
// [POST] /api/notifications/:id/read
app.post('/api/notifications/:id/read', auth_2.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notification = await prisma.notification.updateMany({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        data: { read: true },
    });
    res.status(200).json(notification);
});
// [GET] /api/purchase-orders
app.get('/api/purchase-orders', auth_2.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
        include: { purchaseOrderItems: { include: { product: true } } },
    });
    res.json(purchaseOrders);
});
// [POST] /api/purchase-orders/:id/confirm
app.post('/api/purchase-orders/:id/confirm', auth_2.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const purchaseOrder = await prisma.purchaseOrder.findUnique({ where: { id: orderId, storeId: req.user.storeId } });
    if (!purchaseOrder || purchaseOrder.status !== client_1.PurchaseOrderStatus.PENDING_CONFIRMATION) {
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
            status: client_1.PurchaseOrderStatus.ORDERED,
            orderedAt: new Date(),
            estimatedDeliveryAt: estimatedDeliveryAt,
        },
    });
    await prisma.notification.create({
        data: {
            storeId: req.user.storeId,
            message: `발주 #${orderId}가 확정되어 주문에 들어갔습니다.`,
            type: client_1.NotificationType.ORDER_CONFIRMATION,
        },
    });
    res.json(updatedOrder);
});
// [POST] /api/purchase-orders/:id/receive
app.post('/api/purchase-orders/:id/receive', auth_2.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const { items } = req.body; // items: [{ purchaseOrderItemId, defectiveQuantity }]
    const purchaseOrder = await prisma.purchaseOrder.findUnique({ where: { id: orderId, storeId: req.user.storeId } });
    if (!purchaseOrder || purchaseOrder.status !== client_1.PurchaseOrderStatus.ORDERED) {
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
            data: { status: client_1.PurchaseOrderStatus.DELIVERED, deliveredAt: new Date() },
        });
    });
    res.json(updatedOrder);
});
// [POST] /api/purchase-orders/:id/delay
app.post('/api/purchase-orders/:id/delay', auth_2.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const orderId = parseInt(req.params.id);
    const { delayHours } = req.body; // e.g., 3 hours
    const newEstimatedDeliveryAt = new Date();
    newEstimatedDeliveryAt.setHours(newEstimatedDeliveryAt.getHours() + delayHours);
    await prisma.purchaseOrder.updateMany({
        where: { id: orderId, storeId: req.user.storeId, status: client_1.PurchaseOrderStatus.ORDERED },
        data: { estimatedDeliveryAt: newEstimatedDeliveryAt },
    });
    res.status(200).send('Delivery reminder postponed.');
});
// --- Scheduled Tasks ---
node_cron_1.default.schedule('0 21 * * *', () => {
    console.log('--- Running Daily Auto-Order Check (9 PM) ---');
    (0, autoOrderService_1.checkStockAndCreatePurchaseOrders)();
}, {
    timezone: "Asia/Seoul"
});
node_cron_1.default.schedule('0 10 * * *', () => {
    console.log('--- Running Daily Delivery Check (10 AM) ---');
    (0, autoOrderService_1.checkExpectedDeliveriesAndNotify)();
}, {
    timezone: "Asia/Seoul"
});
// --- Server Startup ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Backend server is running on port ${PORT}.`);
});
