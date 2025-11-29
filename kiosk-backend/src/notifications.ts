import express, { Response } from 'express';
import prisma from './db';
import { AuthRequest } from './middleware/authMiddleware';

const router = express.Router();

// [GET] /api/notifications
router.get('/', (async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notifications = await prisma.notification.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
}) as any);

// [POST] /api/notifications/:id/read
router.post('/:id/read', (async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notification = await prisma.notification.updateMany({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        data: { read: true },
    });
    res.status(200).json(notification);
}) as any);

export default router;
