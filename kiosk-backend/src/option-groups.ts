import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';

const router = express.Router();

// GET /api/option-groups
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const optionGroups = await prisma.optionGroup.findMany({
    where: { storeId: req.user.storeId },
    include: { options: true },
  });
  res.json(optionGroups);
});

// POST /api/option-groups
router.post('/', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const { name, options } = req.body;
  const optionGroup = await prisma.optionGroup.create({
    data: {
      name,
      storeId: req.user.storeId,
      options: {
        create: options.map((o: any) => ({ name: o.name, price: o.price }))
      }
    },
  });
  res.status(201).json(optionGroup);
});

// PUT /api/option-groups/:id
router.put('/:id', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const { name, options } = req.body;

  // As the frontend note says, we don't support editing options here, only the name.
  const optionGroup = await prisma.optionGroup.update({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    data: { name },
  });

  res.json(optionGroup);
});

// DELETE /api/option-groups/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  try {
    await prisma.optionGroup.delete({
      where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete option group:', error);
    res.status(400).json({ message: '옵션 그룹에 속한 상품이 있어 삭제할 수 없습니다.' });
  }
});

export default router;
