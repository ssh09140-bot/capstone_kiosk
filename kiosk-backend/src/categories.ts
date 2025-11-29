import express, { Response } from 'express';
import prisma from './db';
import { AuthRequest } from './middleware/authMiddleware';

const router = express.Router();

// GET /api/categories
router.get('/', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const categories = await prisma.category.findMany({
    where: { storeId: req.user.storeId },
  });
  res.json(categories);
}) as any);

// POST /api/categories
router.post('/', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const { name } = req.body;
  const category = await prisma.category.create({
    data: {
      name,
      storeId: req.user.storeId,
    },
  });
  res.status(201).json(category);
}) as any);

// PUT /api/categories/:id
router.put('/:id', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const { name } = req.body;
  const category = await prisma.category.update({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    data: { name },
  });
  res.json(category);
}) as any);

// DELETE /api/categories/:id
router.delete('/:id', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  try {
    await prisma.category.delete({
      where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: '카테고리에 속한 상품이 있어 삭제할 수 없습니다.' });
  }
}) as any);

export default router;
