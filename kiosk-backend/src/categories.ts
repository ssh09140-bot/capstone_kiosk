import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/categories
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const categories = await prisma.category.findMany({
    where: { storeId: req.user.storeId },
  });
  res.json(categories);
});

// POST /api/categories
router.post('/', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const { name } = req.body;
  const category = await prisma.category.create({
    data: {
      name,
      storeId: req.user.storeId,
    },
  });
  res.status(201).json(category);
});

// PUT /api/categories/:id
router.put('/:id', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const { name } = req.body;
  const category = await prisma.category.update({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    data: { name },
  });
  res.json(category);
});

// DELETE /api/categories/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  try {
    await prisma.category.delete({
      where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: '카테고리에 속한 상품이 있어 삭제할 수 없습니다.' });
  }
});

export default router;
