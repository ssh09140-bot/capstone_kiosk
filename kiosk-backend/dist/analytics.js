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
// [GET] /api/sales/summary
router.get('/sales/summary', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        const totalSales = await prisma.order.aggregate({
            _sum: {
                totalAmount: true,
            },
            where: {
                storeId: req.user.storeId,
            },
        });
        res.json({ totalSales: totalSales._sum.totalAmount || 0 });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '매출 요약 정보를 가져오는데 실패했습니다.' });
    }
});
// [GET] /api/analytics/top-products
router.get('/analytics/top-products', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        const topProducts = await prisma.orderItem.groupBy({
            by: ['productId'],
            _sum: {
                quantity: true,
            },
            where: {
                order: {
                    storeId: req.user.storeId,
                },
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: 5,
        });
        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: topProducts.map((p) => p.productId),
                },
            },
        });
        const productMap = new Map(products.map((p) => [p.id, p.name]));
        const result = topProducts.map((p) => ({
            name: productMap.get(p.productId) || '알 수 없는 상품',
            quantity: p._sum.quantity || 0,
        }));
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '인기 상품 정보를 가져오는데 실패했습니다.' });
    }
});
// [GET] /api/analytics/low-stock
router.get('/analytics/low-stock', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        const lowStockProducts = await prisma.product.findMany({
            where: {
                storeId: req.user.storeId,
                stock: {
                    lte: 10,
                },
            },
            orderBy: {
                stock: 'asc',
            },
        });
        res.json(lowStockProducts.map(p => ({ name: p.name, stock: p.stock })));
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '재고 부족 상품 정보를 가져오는데 실패했습니다.' });
    }
});
exports.default = router;
