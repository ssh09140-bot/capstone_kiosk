import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';

import { saveSubscription } from './services/notificationService';

const router = express.Router();

// [GET] /api/notifications
router.get('/', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notifications = await prisma.notification.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
});

// [GET] /api/notifications/vapid-public-key
router.get('/vapid-public-key', authenticateToken, (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(500).json({ message: 'VAPID Public Key not configured.' });
    }
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// [POST] /api/notifications/subscribe
router.post('/subscribe', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const subscription = req.body;

    try {
        await saveSubscription(req.user.storeId, subscription);
        res.status(201).json({ message: 'Subscription saved successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to save subscription.' });
    }
});

// [POST] /api/notifications/:id/read
router.post('/:id/read', authenticateToken, async (req, res) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notification = await prisma.notification.updateMany({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        data: { read: true },
    });
    res.status(200).json(notification);
});

export default router;
