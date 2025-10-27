import express from 'express';
import prisma from './db';
import { authenticateBoth } from './middleware/authenticateBoth'; // Import authenticateBoth middleware

const router = express.Router();

// GET /api/categories
router.get('/', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const categories = await prisma.category.findMany({
    where: { storeId: req.user.storeId },
  });
  res.json(categories);
});

// POST /api/categories
router.post('/', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
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
router.put('/:id', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const { name } = req.body;
  const category = await prisma.category.update({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    data: { name },
  });
  res.json(category);
});

// DELETE /api/categories/:id
router.delete('/:id', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
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
