import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/orders
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });

  const { startDate, endDate } = req.query;

  const where: any = { storeId: req.user.storeId };
  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
  res.json(orders);
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const order = await prisma.order.findUnique({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!order) {
    return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
  }
  res.json(order);
});

export default router;
