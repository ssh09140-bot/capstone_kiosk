import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';

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
