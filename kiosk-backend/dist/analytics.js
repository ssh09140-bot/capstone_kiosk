"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const openaiService_1 = require("./services/openaiService");
const date_fns_1 = require("date-fns");
const unitConversionService_1 = require("./services/unitConversionService");
const router = express_1.default.Router();
// Helper function to calculate available stock based on inventory usages
function calculateAvailableStock(product) {
    if (!product.inventoryUsages || product.inventoryUsages.length === 0) {
        return 999999; // Assume virtually infinite stock if no ingredients are defined
    }
    let maxPossibleProducts = Infinity;
    for (const usage of product.inventoryUsages) {
        if (!usage.inventory) {
            return 0;
        }
        const availableUnits = usage.inventory.quantity;
        // Convert usage amount to the inventory's base unit before calculation
        const requiredUnits = (0, unitConversionService_1.convertToBaseUnit)(usage.usageAmount, usage.usageUnit, usage.inventory.unit);
        if (requiredUnits <= 0) {
            continue;
        }
        const possibleProducts = Math.floor(availableUnits / requiredUnits);
        maxPossibleProducts = Math.min(maxPossibleProducts, possibleProducts);
    }
    return maxPossibleProducts;
}
// [GET] /api/analytics/reports
router.get('/analytics/reports', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const { startDate: startDateQuery, endDate: endDateQuery } = req.query;
    let startDate = startDateQuery ? new Date(startDateQuery) : (0, date_fns_1.subDays)(new Date(), 29);
    let endDate = endDateQuery ? new Date(endDateQuery) : new Date();
    if (isNaN(startDate.getTime()))
        startDate = (0, date_fns_1.subDays)(new Date(), 29);
    if (isNaN(endDate.getTime()))
        endDate = new Date();
    startDate = (0, date_fns_1.startOfDay)(startDate);
    endDate = (0, date_fns_1.endOfDay)(endDate);
    try {
        const [summary, dailyTrends, topProductsData, salesByHourData] = await Promise.all([
            // 1. Sales Summary
            db_1.default.order.aggregate({
                _sum: { totalAmount: true },
                _count: { id: true },
                where: {
                    storeId: req.user.storeId,
                    createdAt: { gte: startDate, lte: endDate },
                },
            }),
            // 2. Daily Sales Trends
            db_1.default.$queryRaw `
        SELECT
          TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') as date,
          SUM("totalAmount")::integer as sales
        FROM "Order"
        WHERE "storeId" = ${req.user.storeId} AND "createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY date
        ORDER BY date ASC;
      `,
            // 3. Top Products
            db_1.default.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true },
                where: {
                    order: {
                        storeId: req.user.storeId,
                        createdAt: { gte: startDate, lte: endDate },
                    },
                },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5,
            }),
            // 4. Sales by Hour
            db_1.default.$queryRaw `
        SELECT
          CAST(TO_CHAR("createdAt" AT TIME ZONE 'Asia/Seoul', 'HH24') AS INTEGER) as hour,
          SUM("totalAmount")::integer as sales
        FROM "Order"
        WHERE "storeId" = ${req.user.storeId} AND "createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY hour
        ORDER BY hour ASC;
      `,
        ]);
        // Fetch product names for top products
        const topProductDetails = await db_1.default.product.findMany({
            where: { id: { in: topProductsData.map(p => p.productId) } },
            select: { id: true, name: true },
        });
        const productMap = new Map(topProductDetails.map(p => [p.id, p.name]));
        const topProducts = topProductsData.map(p => ({
            name: productMap.get(p.productId) || '알 수 없는 상품',
            quantity: p._sum.quantity || 0,
        }));
        res.json({
            summary: {
                totalSales: summary._sum.totalAmount || 0,
                totalOrders: summary._count.id || 0,
                averageOrderValue: (summary._sum.totalAmount || 0) / (summary._count.id || 1),
            },
            dailyTrends,
            topProducts,
            salesByHour: salesByHourData,
        });
    }
    catch (error) {
        console.error('Error fetching report data:', error);
        res.status(500).json({ message: '리포트 데이터를 가져오는데 실패했습니다.' });
    }
});
// [GET] /api/sales/summary
router.get('/sales/summary', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const monthlySalesResult = await db_1.default.$queryRaw `
      SELECT
        TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
        SUM("totalAmount")::integer as sales
      FROM "Order"
      WHERE "storeId" = ${req.user.storeId} AND "createdAt" >= ${twelveMonthsAgo}
      GROUP BY month
      ORDER BY month ASC;
    `;
        const currentMonthStr = new Date().toISOString().slice(0, 7);
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
        const topProductsData = await db_1.default.orderItem.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            where: { order: { storeId: req.user.storeId } },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5,
        });
        const products = await db_1.default.product.findMany({
            where: { id: { in: topProductsData.map((p) => p.productId) } },
        });
        const productMap = new Map(products.map((p) => [p.id, p.name]));
        const result = topProductsData.map((p) => ({
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
// [GET] /api/analytics/profit-summary
router.get('/analytics/profit-summary', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const { startDate: startDateQuery, endDate: endDateQuery } = req.query;
    let startDate = startDateQuery ? new Date(startDateQuery) : (0, date_fns_1.subDays)(new Date(), 29);
    let endDate = endDateQuery ? new Date(endDateQuery) : new Date();
    if (isNaN(startDate.getTime()))
        startDate = (0, date_fns_1.subDays)(new Date(), 29);
    if (isNaN(endDate.getTime()))
        endDate = new Date();
    startDate = (0, date_fns_1.startOfDay)(startDate);
    endDate = (0, date_fns_1.endOfDay)(endDate);
    try {
        // 1. Overall Profit Summary
        const overallSummary = await db_1.default.order.aggregate({
            _sum: {
                totalAmount: true,
                totalCost: true,
            },
            where: {
                storeId: req.user.storeId,
                createdAt: { gte: startDate, lte: endDate },
            },
        });
        const totalRevenue = overallSummary._sum.totalAmount || 0;
        const totalCost = overallSummary._sum.totalCost || 0;
        const totalProfit = totalRevenue - totalCost;
        // 2. Product-level Profitability
        const productProfitData = await db_1.default.orderItem.groupBy({
            by: ['productId'],
            _sum: {
                quantity: true,
            },
            where: {
                order: {
                    storeId: req.user.storeId,
                    createdAt: { gte: startDate, lte: endDate },
                },
            },
        });
        const productProfits = await Promise.all(productProfitData.map(async (item) => {
            const product = await db_1.default.product.findUnique({ where: { id: item.productId } });
            const orderItems = await db_1.default.orderItem.findMany({
                where: {
                    productId: item.productId,
                    order: {
                        storeId: req.user.storeId,
                        createdAt: { gte: startDate, lte: endDate },
                    }
                }
            });
            const revenue = orderItems.reduce((acc, oi) => acc + (oi.pricePerItem * oi.quantity), 0);
            const cost = orderItems.reduce((acc, oi) => acc + ((oi.costPerItem || 0) * oi.quantity), 0);
            const profit = revenue - cost;
            return {
                productId: item.productId,
                name: product?.name || 'Unknown Product',
                totalQuantity: item._sum.quantity,
                totalRevenue: revenue,
                totalCost: cost,
                totalProfit: profit,
            };
        }));
        productProfits.sort((a, b) => b.totalProfit - a.totalProfit);
        const mostProfitableProducts = productProfits.slice(0, 5);
        const leastProfitableProducts = productProfits.slice(-5).reverse();
        res.json({
            overallSummary: {
                totalRevenue,
                totalCost,
                totalProfit,
                profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
            },
            mostProfitableProducts,
            leastProfitableProducts,
        });
    }
    catch (error) {
        console.error('Error fetching profit summary:', error);
        res.status(500).json({ message: '수익성 요약 정보를 가져오는데 실패했습니다.' });
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
                    createdAt: { gte: thirtyDaysAgo },
                },
            },
            _sum: { quantity: true },
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
