"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("./middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
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
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
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
exports.default = router;
