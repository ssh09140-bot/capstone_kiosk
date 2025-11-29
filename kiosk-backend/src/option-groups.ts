import express, { Response } from 'express';
import prisma from './db';
import { AuthRequest } from './middleware/authMiddleware';

const router = express.Router();

// GET /api/option-groups
router.get('/', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const optionGroups = await prisma.optionGroup.findMany({
    where: { storeId: req.user.storeId },
    include: { options: true },
  });
  res.json(optionGroups);
}) as any);

// POST /api/option-groups
router.post('/', (async (req: AuthRequest, res: Response) => {
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
}) as any);

// PUT /api/option-groups/:id
router.put('/:id', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const { name, options } = req.body;

  // As the frontend note says, we don't support editing options here, only the name.
  const optionGroup = await prisma.optionGroup.update({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    data: { name },
  });

  res.json(optionGroup);
}) as any);

// DELETE /api/option-groups/:id
router.delete('/:id', (async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  try {
    await prisma.optionGroup.delete({
      where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: '옵션 그룹에 속한 상품이 있어 삭제할 수 없습니다.' });
  }
}) as any);

export default router;
