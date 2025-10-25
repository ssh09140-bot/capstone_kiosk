import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductDemand {
  productId: number;
  productName: string;
  currentStock: number;
  predictedDemand: number;
  reorderQuantity: number;
}

export async function getDemandPredictions(storeId: string): Promise<ProductDemand[]> {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // 1. Fetch sales data for the last 30 days
  const salesData = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId: storeId,
        createdAt: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
    },
    select: {
      productId: true,
      quantity: true,
      order: {
        select: {
          createdAt: true,
        },
      },
    },
  });

  // Group sales by product and calculate total quantity sold
  const productSales: { [productId: number]: { totalQuantity: number; salesDays: Set<string> } } = {};
  salesData.forEach(item => {
    if (!productSales[item.productId]) {
      productSales[item.productId] = { totalQuantity: 0, salesDays: new Set() };
    }
    productSales[item.productId].totalQuantity += item.quantity;
    productSales[item.productId].salesDays.add(item.order.createdAt.toISOString().split('T')[0]);
  });

  // Calculate average daily sales for each product
  const productAverageDailySales: { [productId: number]: number } = {};
  for (const productId in productSales) {
    const salesInfo = productSales[productId];
    const numberOfSalesDays = salesInfo.salesDays.size; // Number of days with sales
    if (numberOfSalesDays > 0) {
      productAverageDailySales[productId] = salesInfo.totalQuantity / numberOfSalesDays;
    } else {
      productAverageDailySales[productId] = 0;
    }
  }

  // 2. Get all products for the store with their current stock
  const allProducts = await prisma.product.findMany({
    where: { storeId: storeId },
    select: {
      id: true,
      name: true,
      stock: true,
    },
  });

  const predictions: ProductDemand[] = [];
  const forecastPeriodDays = 7; // Predict demand for the next 7 days
  const reorderThresholdMultiplier = 1.5; // Reorder if stock falls below 1.5x predicted demand

  for (const product of allProducts) {
    const avgDailySales = productAverageDailySales[product.id] || 0;
    const predictedDemand = Math.ceil(avgDailySales * forecastPeriodDays);

    let reorderQuantity = 0;
    // Simple reorder logic: if current stock is less than predicted demand for the forecast period
    // or if stock is below a certain threshold based on predicted demand, suggest reorder.
    if (product.stock < predictedDemand) {
      // Suggest ordering enough to cover predicted demand + a buffer
      reorderQuantity = predictedDemand - product.stock + Math.ceil(avgDailySales * 3); // Cover deficit + 3 days buffer
    } else if (product.stock < predictedDemand * reorderThresholdMultiplier) {
        // If stock is above predicted demand but below a threshold, suggest a smaller reorder
        reorderQuantity = Math.ceil(avgDailySales * 7); // Suggest 7 days worth of stock
    }

    predictions.push({
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      predictedDemand: predictedDemand,
      reorderQuantity: Math.max(0, reorderQuantity), // Ensure reorder quantity is not negative
    });
  }

  return predictions.filter(p => p.reorderQuantity > 0).sort((a, b) => b.reorderQuantity - a.reorderQuantity);
}
