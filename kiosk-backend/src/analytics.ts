import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';
import { generateSalesAnalysis } from './services/openaiService';
import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const router = express.Router();

// [GET] /api/analytics/reports
router.get('/analytics/reports', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  const { startDate: startDateQuery, endDate: endDateQuery } = req.query;

  let startDate = startDateQuery ? new Date(startDateQuery as string) : subDays(new Date(), 29);
  let endDate = endDateQuery ? new Date(endDateQuery as string) : new Date();
  
  if (isNaN(startDate.getTime())) startDate = subDays(new Date(), 29);
  if (isNaN(endDate.getTime())) endDate = new Date();

  startDate = startOfDay(startDate);
  endDate = endOfDay(endDate);

  try {
    const [summary, dailyTrends, topProductsData, salesByHourData] = await Promise.all([
      // 1. Sales Summary
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          storeId: req.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // 2. Daily Sales Trends
      prisma.$queryRaw< { date: string; sales: number }[]>`
        SELECT
          TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') as date,
          SUM("totalAmount")::integer as sales
        FROM "Order"
        WHERE "storeId" = ${req.user.storeId} AND "createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY date
        ORDER BY date ASC;
      `,
      // 3. Top Products
      prisma.orderItem.groupBy({
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
      prisma.$queryRaw< { hour: number; sales: number }[]>`
        SELECT
          EXTRACT(hour FROM "createdAt" AT TIME ZONE 'Asia/Seoul') as hour,
          SUM("totalAmount")::integer as sales
        FROM "Order"
        WHERE "storeId" = ${req.user.storeId} AND "createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY hour
        ORDER BY hour ASC;
      `,
    ]);

    // Fetch product names for top products
    const topProductDetails = await prisma.product.findMany({
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

  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: '리포트 데이터를 가져오는데 실패했습니다.' });
  }
});


// [GET] /api/sales/summary
router.get('/sales/summary', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlySalesResult: { month: string; sales: number }[] = await prisma.$queryRaw`
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

  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ message: '매출 요약 정보를 가져오는데 실패했습니다.' });
  }
});

// [GET] /api/analytics/top-products
router.get('/analytics/top-products', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  try {
    const topProductsData = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { order: { storeId: req.user.storeId } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const products = await prisma.product.findMany({
      where: { id: { in: topProductsData.map((p) => p.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const result = topProductsData.map((p) => ({
      name: productMap.get(p.productId) || '알 수 없는 상품',
      quantity: p._sum.quantity || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '인기 상품 정보를 가져오는데 실패했습니다.' });
  }
});

// [GET] /api/analytics/low-stock
router.get('/analytics/low-stock', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  try {
    const lowStockProducts = await prisma.product.findMany({
      where: {
        storeId: req.user.storeId,
        stock: { lte: 10 },
      },
      orderBy: { stock: 'asc' },
    });

    res.json(lowStockProducts.map(p => ({ name: p.name, stock: p.stock })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '재고 부족 상품 정보를 가져오는데 실패했습니다.' });
  }
});

// [GET] /api/analytics/monthly-summary
router.get('/analytics/monthly-summary', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesData = await prisma.orderItem.groupBy({
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
      return res.status(404).json({ message: '분석을 위한 데이터가 충분하지 않습니다 (최소 2개 이상의 상품 판매 내역 필요).'});
    }

    salesData.sort((a, b) => (b._sum.quantity || 0) - (a._sum.quantity || 0));

    const bestSellerInfo = salesData[0];
    const worstSellerInfo = salesData[salesData.length - 1];

    const productIds = [bestSellerInfo.productId, worstSellerInfo.productId];
    const products = await prisma.product.findMany({
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

    const suggestion = await generateSalesAnalysis(bestSeller, worstSeller);

    res.json({ bestSeller, worstSeller, suggestion });

  } catch (error) {
    console.error('Error generating monthly summary:', error);
    res.status(500).json({ message: '월간 판매 분석 생성에 실패했습니다.' });
  }
});

export default router;
