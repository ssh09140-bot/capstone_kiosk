"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStockAndCreatePurchaseOrders = checkStockAndCreatePurchaseOrders;
exports.checkExpectedDeliveriesAndNotify = checkExpectedDeliveriesAndNotify;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../db"));
const logger_1 = require("../utils/logger");
/**
 * Checks stock levels for all inventory items with auto-ordering enabled.
 * If stock is below the minimum threshold, it creates a purchase order
 * in a 'PENDING_CONFIRMATION' state and notifies the store owner.
 */
async function checkStockAndCreatePurchaseOrders() {
    logger_1.logger.info('[AutoOrder] Running job: Checking stock levels for auto-ordering...');
    try {
        // Fetch inventory items that need reordering
        const inventoryToReorder = await db_1.default.inventory.findMany({
            where: {
                autoOrderEnabled: true,
                minStockThreshold: { not: null },
            },
            include: {
                suppliedBy: {
                    include: {
                        supplier: true,
                    },
                },
            },
        });
        const filteredInventory = inventoryToReorder.filter((i) => i.quantity <= (i.minStockThreshold || 0));
        if (filteredInventory.length === 0) {
            logger_1.logger.info('[AutoOrder] No items require reordering at this time.');
            return;
        }
        for (const item of filteredInventory) {
            try {
                // Check for existing pending orders for this specific item
                const existingPendingOrder = await db_1.default.purchaseOrder.findFirst({
                    where: {
                        storeId: item.storeId,
                        status: client_1.PurchaseOrderStatus.PENDING_CONFIRMATION,
                        purchaseOrderItems: {
                            some: { inventoryId: item.id },
                        },
                    },
                });
                if (existingPendingOrder) {
                    logger_1.logger.debug(`[AutoOrder] Skipping order for ${item.name} (ID: ${item.id}) as a pending order already exists.`);
                    continue;
                }
                // Check if notification was sent recently (prevent spam)
                const recentNotification = await db_1.default.notification.findFirst({
                    where: {
                        storeId: item.storeId,
                        type: client_1.NotificationType.LOW_STOCK_WARNING,
                        message: { contains: item.name },
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                        },
                    },
                });
                if (recentNotification && item.lastLowStockNotifiedAt) {
                    const hoursSinceLastNotification = (Date.now() - item.lastLowStockNotifiedAt.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceLastNotification < 24) {
                        logger_1.logger.debug(`[AutoOrder] Skipping notification for ${item.name} - notification sent recently.`);
                        continue;
                    }
                }
                // Find the best supplier (lowest lead time or first available)
                const bestSupplier = item.suppliedBy
                    .filter((si) => si.supplierId !== null)
                    .sort((a, b) => (a.leadTimeDays || 99) - (b.leadTimeDays || 99))[0];
                if (!bestSupplier) {
                    logger_1.logger.warn(`[AutoOrder] No supplier found for inventory item ${item.name} (ID: ${item.id}). Skipping.`);
                    continue;
                }
                const orderQuantity = item.orderQuantity || item.minStockThreshold || 10;
                logger_1.logger.info(`[AutoOrder] Stock for ${item.name} is low (${item.quantity}${item.unit} <= ${item.minStockThreshold}${item.unit}). Creating a purchase order suggestion.`);
                // Create purchase order with the correct item link
                const purchaseOrder = await db_1.default.purchaseOrder.create({
                    data: {
                        storeId: item.storeId,
                        supplierId: bestSupplier.supplierId,
                        status: client_1.PurchaseOrderStatus.PENDING_CONFIRMATION,
                        purchaseOrderItems: {
                            create: [
                                {
                                    inventoryId: item.id,
                                    quantity: orderQuantity,
                                },
                            ],
                        },
                    },
                });
                // Update lastLowStockNotifiedAt
                await db_1.default.inventory.update({
                    where: { id: item.id },
                    data: { lastLowStockNotifiedAt: new Date() },
                });
                // Create notification
                await db_1.default.notification.create({
                    data: {
                        storeId: item.storeId,
                        message: `${item.name}의 재고가 부족하여 자동 발주가 제안되었습니다. (현재: ${item.quantity}${item.unit}, 최소 기준: ${item.minStockThreshold}${item.unit}) 확인 후 진행해주세요.`,
                        type: client_1.NotificationType.LOW_STOCK_WARNING,
                    },
                });
                logger_1.logger.info(`[AutoOrder] Created purchase order #${purchaseOrder.id} and notification for ${item.name}.`);
            }
            catch (error) {
                logger_1.logger.error(`[AutoOrder] Error processing inventory item ${item.name} (ID: ${item.id}):`, error);
                // Continue with next item instead of failing entire job
            }
        }
    }
    catch (error) {
        logger_1.logger.error('[AutoOrder] Fatal error in checkStockAndCreatePurchaseOrders:', error);
        throw error;
    }
}
/**
 * Finds orders that are past their estimated delivery date and notifies the owner.
 */
async function checkExpectedDeliveriesAndNotify() {
    logger_1.logger.info('[AutoOrder] Running job: Checking for expected deliveries...');
    try {
        const now = new Date();
        const overdueOrders = await db_1.default.purchaseOrder.findMany({
            where: {
                status: client_1.PurchaseOrderStatus.ORDERED,
                estimatedDeliveryAt: { lte: now },
            },
            include: {
                purchaseOrderItems: {
                    include: {
                        product: true,
                        inventory: true,
                    },
                },
                store: {
                    select: {
                        storeId: true,
                        storeName: true,
                    },
                },
            },
        });
        if (overdueOrders.length === 0) {
            logger_1.logger.info('[AutoOrder] No overdue deliveries to notify about.');
            return;
        }
        for (const order of overdueOrders) {
            try {
                // Check if a delivery prompt for this order was already sent recently
                const recentNotification = await db_1.default.notification.findFirst({
                    where: {
                        storeId: order.storeId,
                        type: { in: [client_1.NotificationType.DELIVERY_PROMPT, client_1.NotificationType.DELIVERY_REMINDER] },
                        message: { contains: `발주 #${order.id}` },
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                if (recentNotification) {
                    logger_1.logger.debug(`[AutoOrder] Skipping notification for order #${order.id} as a recent one exists.`);
                    continue;
                }
                const itemNames = order.purchaseOrderItems
                    .map((item) => item.product?.name || item.inventory?.name)
                    .filter(Boolean)
                    .join(', ');
                if (!itemNames) {
                    logger_1.logger.warn(`[AutoOrder] Cannot determine item names for order #${order.id}. Skipping.`);
                    continue;
                }
                const estimatedDeliveryDate = order.estimatedDeliveryAt
                    ? new Date(order.estimatedDeliveryAt).toLocaleDateString('ko-KR')
                    : '알 수 없음';
                await db_1.default.notification.create({
                    data: {
                        storeId: order.storeId,
                        message: `[발주 #${order.id}] ${itemNames} 품목의 예상 배송일(${estimatedDeliveryDate})이 지났습니다. 도착했나요? 확인 후 입고 처리를 진행해주세요.`,
                        type: client_1.NotificationType.DELIVERY_PROMPT,
                    },
                });
                logger_1.logger.info(`[AutoOrder] Sent delivery prompt for order #${order.id}.`);
            }
            catch (error) {
                logger_1.logger.error(`[AutoOrder] Error processing order #${order.id}:`, error);
                // Continue with next order
            }
        }
    }
    catch (error) {
        logger_1.logger.error('[AutoOrder] Fatal error in checkExpectedDeliveriesAndNotify:', error);
        throw error;
    }
}
