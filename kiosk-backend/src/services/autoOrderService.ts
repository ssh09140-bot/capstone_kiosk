import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Checks stock levels for all products with auto-ordering enabled.
 * If stock is below the minimum threshold, it creates a purchase order
 * in a 'PENDING_CONFIRMATION' state and notifies the store owner.
 */
export async function checkStockAndCreatePurchaseOrders() {
  console.log('Running job: Checking stock levels for auto-ordering...');

  const productsToReorder = await prisma.product.findMany({
    where: {
      autoOrderEnabled: true,
      minStockThreshold: { not: null },
      stock: { lte: prisma.product.fields.minStockThreshold! }, // This is conceptually what we want
    },
  });

  // Prisma does not support direct field reference in `where` clauses, so we filter in the application.
  const filteredProducts = productsToReorder.filter(p => p.stock <= p.minStockThreshold!);

  if (filteredProducts.length === 0) {
    console.log('No products require reordering at this time.');
    return;
  }

  for (const product of filteredProducts) {
    const existingPendingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        storeId: product.storeId,
        status: 'PENDING_CONFIRMATION',
        purchaseOrderItems: { some: { productId: product.id } },
      },
    });

    if (existingPendingOrder) {
      console.log(`Skipping order for ${product.name} as a pending order already exists.`);
      continue;
    }

    console.log(`Stock for ${product.name} is low (${product.stock}). Creating a purchase order suggestion.`);

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        storeId: product.storeId,
        status: 'PENDING_CONFIRMATION',
        purchaseOrderItems: {
          create: [{ productId: product.id, quantity: product.orderQuantity || 10 }],
        },
      },
    });

    await prisma.notification.create({
      data: {
        storeId: product.storeId,
        message: `${product.name}의 재고가 부족하여 자동 발주가 제안되었습니다. 확인 후 진행해주세요.`,
        type: 'LOW_STOCK_WARNING',
      },
    });

    console.log(`Created purchase order ${purchaseOrder.id} and notification for ${product.name}.`);
  }
}

/**
 * Finds orders that are past their estimated delivery date and notifies the owner.
 */
export async function checkExpectedDeliveriesAndNotify() {
  console.log('Running job: Checking for expected deliveries...');
  const now = new Date();

  const overdueOrders = await prisma.purchaseOrder.findMany({
    where: {
      status: 'ORDERED',
      estimatedDeliveryAt: { lte: now },
    },
    include: {
      purchaseOrderItems: { include: { product: true } },
    },
  });

  if (overdueOrders.length === 0) {
    console.log('No overdue deliveries to notify about.');
    return;
  }

  for (const order of overdueOrders) {
    // Check if a delivery prompt for this order was already sent recently
    const recentNotification = await prisma.notification.findFirst({
      where: {
        storeId: order.storeId,
        type: { in: ['DELIVERY_PROMPT', 'DELIVERY_REMINDER'] },
        // A more robust implementation would link notification to the order directly.
        // For now, we check the message content.
        message: { contains: `발주 #${order.id}` }
      },
      orderBy: { createdAt: 'desc' },
    });

    // If a notification was sent in the last 24 hours, skip.
    if (recentNotification && (now.getTime() - recentNotification.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
      console.log(`Skipping notification for order #${order.id} as a recent one exists.`);
      continue;
    }

    const productNames = order.purchaseOrderItems.map(item => item.product.name).join(', ');

    await prisma.notification.create({
      data: {
        storeId: order.storeId,
        message: `[발주 #${order.id}] ${productNames} 상품이 도착했나요? 확인 후 입고 처리를 진행해주세요.`,
        type: 'DELIVERY_PROMPT',
      },
    });

    console.log(`Sent delivery prompt for order #${order.id}.`);
  }
}
