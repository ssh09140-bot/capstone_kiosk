"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToStore = exports.saveSubscription = void 0;
const web_push_1 = __importDefault(require("web-push"));
const db_1 = __importDefault(require("../db"));
// Initialize VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_MAILTO) {
    web_push_1.default.setVapidDetails(process.env.VAPID_MAILTO, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    console.log('VAPID details set successfully');
}
else {
    console.warn('VAPID keys are missing. Push notifications will not work.');
}
const saveSubscription = async (storeId, subscription) => {
    try {
        // Check if subscription already exists to avoid duplicates
        const existing = await db_1.default.pushSubscription.findUnique({
            where: { endpoint: subscription.endpoint },
        });
        if (existing) {
            return existing;
        }
        return await db_1.default.pushSubscription.create({
            data: {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                storeId: storeId,
            },
        });
    }
    catch (error) {
        console.error('Error saving subscription:', error);
        throw error;
    }
};
exports.saveSubscription = saveSubscription;
const sendNotificationToStore = async (storeId, payload) => {
    try {
        const subscriptions = await db_1.default.pushSubscription.findMany({
            where: { storeId },
        });
        if (subscriptions.length === 0) {
            console.log(`No subscriptions found for store ${storeId}`);
            return;
        }
        const notificationPayload = JSON.stringify(payload);
        const promises = subscriptions.map(async (sub) => {
            try {
                await web_push_1.default.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys,
                }, notificationPayload);
            }
            catch (error) {
                console.error('Error sending notification:', error);
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription is no longer valid, remove it
                    await db_1.default.pushSubscription.delete({
                        where: { id: sub.id },
                    });
                    console.log(`Deleted invalid subscription ${sub.id}`);
                }
            }
        });
        await Promise.all(promises);
        console.log(`Sent notifications to ${subscriptions.length} devices for store ${storeId}`);
    }
    catch (error) {
        console.error('Error sending notifications to store:', error);
    }
};
exports.sendNotificationToStore = sendNotificationToStore;
