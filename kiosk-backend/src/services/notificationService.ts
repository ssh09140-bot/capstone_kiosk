import webpush from 'web-push';
import prisma from '../db';

// Initialize VAPID details
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_MAILTO) {
    webpush.setVapidDetails(
        process.env.VAPID_MAILTO,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
    console.log('VAPID details set successfully');
} else {
    console.warn('VAPID keys are missing. Push notifications will not work.');
}

export const saveSubscription = async (storeId: string, subscription: any) => {
    try {
        // Check if subscription already exists to avoid duplicates
        const existing = await prisma.pushSubscription.findUnique({
            where: { endpoint: subscription.endpoint },
        });

        if (existing) {
            return existing;
        }

        return await prisma.pushSubscription.create({
            data: {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                storeId: storeId,
            },
        });
    } catch (error) {
        console.error('Error saving subscription:', error);
        throw error;
    }
};

export const sendNotificationToStore = async (storeId: string, payload: any) => {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { storeId },
        });

        if (subscriptions.length === 0) {
            console.log(`No subscriptions found for store ${storeId}`);
            return;
        }

        const notificationPayload = JSON.stringify(payload);

        const promises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys as any,
                    },
                    notificationPayload
                );
            } catch (error: any) {
                console.error('Error sending notification:', error);
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription is no longer valid, remove it
                    await prisma.pushSubscription.delete({
                        where: { id: sub.id },
                    });
                    console.log(`Deleted invalid subscription ${sub.id}`);
                }
            }
        });

        await Promise.all(promises);
        console.log(`Sent notifications to ${subscriptions.length} devices for store ${storeId}`);
    } catch (error) {
        console.error('Error sending notifications to store:', error);
    }
};
