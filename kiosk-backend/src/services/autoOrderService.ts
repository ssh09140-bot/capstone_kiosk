import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Checks stock levels for all products and inventory items with auto-ordering enabled.
 * If stock is below the minimum threshold, it creates a purchase order
 * in a 'PENDING_CONFIRMATION' state and notifies the store owner.
 */
export async function checkStockAndCreatePurchaseOrders() {
  console.log('Running job: Checking stock levels for auto-ordering...');

  // 1. Fetch products that need reordering
  const productsToReorder = await prisma.product.findMany({
    where: {
      autoOrderEnabled: true,
      minStockThreshold: { not: null },
    },
  });
  const filteredProducts = productsToReorder.filter(p => p.stock <= p.minStockThreshold!);

  // 2. Fetch inventory items that need reordering
  const inventoryToReorder = await prisma.inventory.findMany({
    where: {
      autoOrderEnabled: true,
      minStockThreshold: { not: null },
    },
  });
  const filteredInventory = inventoryToReorder.filter(i => i.quantity <= i.minStockThreshold!);

  // 3. Combine into a single list with a unified shape
  const allItemsToReorder = [
    ...filteredProducts.map(p => ({
      id: p.id,
      name: p.name,
      storeId: p.storeId,
      orderQuantity: p.orderQuantity,
      type: 'PRODUCT' as const,
    })),
    ...filteredInventory.map(i => ({
      id: i.id,
      name: i.name,
      storeId: i.storeId,
      orderQuantity: i.orderQuantity,
      type: 'INVENTORY' as const,
    })),
  ];

  if (allItemsToReorder.length === 0) {
    console.log('No items require reordering at this time.');
    return;
  }

  for (const item of allItemsToReorder) {
    // 4. Check for existing pending orders for this specific item
    const existingPendingOrder = await prisma.purchaseOrder.findFirst({
      where: {
        storeId: item.storeId,
        status: 'PENDING_CONFIRMATION',
        purchaseOrderItems: {
          some: item.type === 'PRODUCT'
            ? { productId: item.id }
            : { inventoryId: item.id },
        },
      },
    });

    if (existingPendingOrder) {
      console.log(`Skipping order for ${item.name} as a pending order already exists.`);
      continue;
    }

    console.log(`Stock for ${item.name} is low. Creating a purchase order suggestion.`);

    // 5. Create purchase order with the correct item link
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        storeId: item.storeId,
        status: 'PENDING_CONFIRMATION',
        purchaseOrderItems: {
          create: [
            item.type === 'PRODUCT'
              ? { productId: item.id, quantity: item.orderQuantity || 10 }
              : { inventoryId: item.id, quantity: item.orderQuantity || 10 },
          ],
        },
      },
    });

    await prisma.notification.create({
      data: {
        storeId: item.storeId,
        message: `${item.name}의 재고가 부족하여 자동 발주가 제안되었습니다. 확인 후 진행해주세요.`,
        type: 'LOW_STOCK_WARNING',
      },
    });

    console.log(`Created purchase order ${purchaseOrder.id} and notification for ${item.name}.`);
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
      purchaseOrderItems: {
        include: {
          product: true,
          inventory: true, // Include inventory relation
        },
      },
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
        message: { contains: `발주 #${order.id}` },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentNotification && (now.getTime() - recentNotification.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
      console.log(`Skipping notification for order #${order.id} as a recent one exists.`);
      continue;
    }

    const itemNames = order.purchaseOrderItems
      .map(item => item.product?.name || item.inventory?.name) // Use name from whichever relation is not null
      .filter(Boolean) // Filter out any potential null/undefined names
      .join(', ');

    if (!itemNames) continue; // Don't send notification if item names can't be determined

    await prisma.notification.create({
      data: {
        storeId: order.storeId,
        message: `[발주 #${order.id}] ${itemNames} 품목이 도착했나요? 확인 후 입고 처리를 진행해주세요.`,
        type: 'DELIVERY_PROMPT',
      },
    });

    console.log(`Sent delivery prompt for order #${order.id}.`);
  }
}
