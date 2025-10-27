import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';

const router = express.Router();

// [GET] /api/me
router.get('/me', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: '인증 정보가 없습니다.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, storeName: true, storeId: true },
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [GET] /api/store/:storeId
router.get('/store/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await prisma.user.findUnique({
      where: { storeId: storeId },
      select: { storeName: true, storeId: true }, // Only return necessary info
    });

    if (!store) {
      return res.status(404).json({ message: '가게를 찾을 수 없습니다.' });
    }

    res.json(store);
  } catch (error) {
    console.error('Error fetching store by ID:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
