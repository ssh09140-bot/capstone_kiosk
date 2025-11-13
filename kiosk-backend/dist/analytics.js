"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const openaiService_1 = require("./services/openaiService");
const router = express_1.default.Router();
// [GET] /api/sales/summary
router.get('/sales/summary', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        // Prisma를 사용하여 월별 매출 집계 (Raw Query 사용)
        const monthlySalesResult = await db_1.default.$queryRaw `
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
        SUM("totalAmount")::integer as sales
      FROM "Order"
      WHERE "storeId" = ${req.user.storeId} AND "createdAt" >= ${twelveMonthsAgo}
      GROUP BY month
      ORDER BY month ASC;
    `;
        // 현재 달의 매출 찾기
        const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM 형식
        const currentMonthData = monthlySalesResult.find(d => d.month === currentMonthStr);
        res.json({
            monthlySalesData: monthlySalesResult,
            currentMonthSales: currentMonthData ? currentMonthData.sales : 0,
        });
    }
    catch (error) {
        console.error('Error fetching sales summary:', error);
        res.status(500).json({ message: '매출 요약 정보를 가져오는데 실패했습니다.' });
    }
});
// [GET] /api/analytics/top-products
router.get('/analytics/top-products', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        const topProducts = await db_1.default.orderItem.groupBy({
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
        const products = await db_1.default.product.findMany({
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
        const lowStockProducts = await db_1.default.product.findMany({
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
// [GET] /api/analytics/monthly-summary
router.get('/analytics/monthly-summary', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const salesData = await db_1.default.orderItem.groupBy({
            by: ['productId'],
            where: {
                order: {
                    storeId: req.user.storeId,
                    createdAt: {
                        gte: thirtyDaysAgo,
                    },
                },
            },
            _sum: {
                quantity: true,
            },
        });
        if (salesData.length < 2) {
            return res.status(404).json({ message: '분석을 위한 데이터가 충분하지 않습니다 (최소 2개 이상의 상품 판매 내역 필요).' });
        }
        salesData.sort((a, b) => (b._sum.quantity || 0) - (a._sum.quantity || 0));
        const bestSellerInfo = salesData[0];
        const worstSellerInfo = salesData[salesData.length - 1];
        const productIds = [bestSellerInfo.productId, worstSellerInfo.productId];
        const products = await db_1.default.product.findMany({
            where: { id: { in: productIds } },
        });
        const bestSeller = {
            ...products.find(p => p.id === bestSellerInfo.productId),
            totalQuantity: bestSellerInfo._sum.quantity,
        };
        const worstSeller = {
            ...products.find(p => p.id === worstSellerInfo.productId),
            totalQuantity: worstSellerInfo._sum.quantity,
        };
        const suggestion = await (0, openaiService_1.generateSalesAnalysis)(bestSeller, worstSeller);
        res.json({ bestSeller, worstSeller, suggestion });
    }
    catch (error) {
        console.error('Error generating monthly summary:', error);
        res.status(500).json({ message: '월간 판매 분석 생성에 실패했습니다.' });
    }
});
exports.default = router;
