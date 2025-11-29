import express, { Response } from 'express';
import prisma from './db';
import { AuthRequest } from './middleware/authMiddleware';
import { generateSalesAnalysis } from './services/openaiService';
import { Prisma } from '@prisma/client';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { convertToBaseUnit } from './services/unitConversionService';

const router = express.Router();

// Helper function to calculate available stock based on inventory usages
function calculateAvailableStock(product: any): number {
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
    const requiredUnits = convertToBaseUnit(
      usage.usageAmount,
      usage.usageUnit,
      usage.inventory.unit
    );

    if (requiredUnits <= 0) {
      continue;
    }

    const possibleProducts = Math.floor(availableUnits / requiredUnits);
    maxPossibleProducts = Math.min(maxPossibleProducts, possibleProducts);
  }

  return maxPossibleProducts;
}

// [GET] /api/analytics/reports
router.get('/analytics/reports', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  const { startDate: startDateQuery, endDate: endDateQuery } = req.query;

  let startDate = startDateQuery ? new Date(startDateQuery as string) : subDays(new Date(), 29);
  let endDate = endDateQuery ? new Date(endDateQuery as string) : new Date();

  if (isNaN(startDate.getTime())) startDate = subDays(new Date(), 29);
  if (isNaN(endDate.getTime())) endDate = new Date();

  startDate = startOfDay(startDate);
  endDate = endOfDay(endDate);

  try {
    const [summary, dailyTrends, topProductsData, bottomProductsData, salesByHourData] = await Promise.all([
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
      // 4. Bottom Products
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        where: {
          order: {
            storeId: req.user.storeId,
            createdAt: { gte: startDate, lte: endDate },
          },
        },
        orderBy: { _sum: { quantity: 'asc' } },
        take: 5,
      }),
      // 5. Sales by Hour
      prisma.$queryRaw< { hour: number; sales: number }[]>`
        SELECT
          CAST(TO_CHAR("createdAt" AT TIME ZONE 'Asia/Seoul', 'HH24') AS INTEGER) as hour,
          SUM("totalAmount")::integer as sales
        FROM "Order"
        WHERE "storeId" = ${req.user.storeId} AND "createdAt" BETWEEN ${startDate} AND ${endDate}
        GROUP BY hour
        ORDER BY hour ASC;
      `,
    ]);

    // Fetch product names for top and bottom products
    const productIds = [
      ...topProductsData.map(p => p.productId),
      ...bottomProductsData.map(p => p.productId)
    ];

    const productDetails = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = new Map(productDetails.map(p => [p.id, p.name]));

    const topProducts = topProductsData.map(p => ({
      name: productMap.get(p.productId) || '알 수 없는 상품',
      quantity: p._sum.quantity || 0,
    }));

    const bottomProducts = bottomProductsData.map(p => ({
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
      bottomProducts,
      salesByHour: salesByHourData,
    });

  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: '리포트 데이터를 가져오는데 실패했습니다.' });
  }
}) as any);


// [GET] /api/sales/summary
router.get('/sales/summary', (async (req: AuthRequest, res: Response) => {
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
}) as any);

// [GET] /api/analytics/top-products
router.get('/analytics/top-products', (async (req: AuthRequest, res: Response) => {
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
}) as any);

// [GET] /api/analytics/bottom-products
router.get('/analytics/bottom-products', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  try {
    const bottomProductsData = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { order: { storeId: req.user.storeId } },
      orderBy: { _sum: { quantity: 'asc' } },
      take: 5,
    });

    const products = await prisma.product.findMany({
      where: { id: { in: bottomProductsData.map((p) => p.productId) } },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const result = bottomProductsData.map((p) => ({
      name: productMap.get(p.productId) || '알 수 없는 상품',
      quantity: p._sum.quantity || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '비인기 상품 정보를 가져오는데 실패했습니다.' });
  }
}) as any);

// [GET] /api/analytics/profit-summary
router.get('/analytics/profit-summary', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  const { startDate: startDateQuery, endDate: endDateQuery } = req.query;

  let startDate = startDateQuery ? new Date(startDateQuery as string) : subDays(new Date(), 29);
  let endDate = endDateQuery ? new Date(endDateQuery as string) : new Date();

  if (isNaN(startDate.getTime())) startDate = subDays(new Date(), 29);
  if (isNaN(endDate.getTime())) endDate = new Date();

  startDate = startOfDay(startDate);
  endDate = endOfDay(endDate);

  try {
    // 1. Overall Profit Summary
    const overallSummary = await prisma.order.aggregate({
      _sum: {
        totalAmount: true,
        totalCost: true,
      },
      where: {
        storeId: req.user!.storeId,
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    const totalRevenue = overallSummary._sum.totalAmount || 0;
    const totalCost = overallSummary._sum.totalCost || 0;
    const totalProfit = totalRevenue - totalCost;

    // 2. Product-level Profitability
    const productProfitData = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      where: {
        order: {
          storeId: req.user!.storeId,
          createdAt: { gte: startDate, lte: endDate },
        },
      },
    });

    const productProfits = await Promise.all(productProfitData.map(async (item) => {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });

      const orderItems = await prisma.orderItem.findMany({
        where: {
          productId: item.productId,
          order: {
            storeId: req.user!.storeId,
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

  } catch (error) {
    console.error('Error fetching profit summary:', error);
    res.status(500).json({ message: '수익성 요약 정보를 가져오는데 실패했습니다.' });
  }
}) as any);

// [GET] /api/analytics/monthly-summary
router.get('/analytics/monthly-summary', (async (req: AuthRequest, res: Response) => {
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
      return res.status(404).json({ message: '분석을 위한 데이터가 충분하지 않습니다 (최소 2개 이상의 상품 판매 내역 필요).' });
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
}) as any);

export default router;
