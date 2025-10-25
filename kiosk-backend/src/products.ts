import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from './middleware/auth';
import multer from 'multer';
import path from 'path';

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// GET /api/products
router.get('/', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const products = await prisma.product.findMany({
    where: { storeId: req.user.storeId },
    include: { category: true, optionGroups: { include: { options: true } } },
  });
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const product = await prisma.product.findUnique({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    include: { category: true, optionGroups: { include: { options: true } } },
  });
  if (!product) {
    return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }
  res.json(product);
});

// POST /api/products
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const { name, price, stock, categoryId, autoOrderEnabled, minStockThreshold, orderQuantity, optionGroupIds } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  const createdProduct = await prisma.product.create({
    data: {
      name,
      price: parseInt(price),
      stock: parseInt(stock),
      imageUrl,
      storeId: req.user.storeId,
      categoryId: parseInt(categoryId),
      autoOrderEnabled: autoOrderEnabled === 'true',
      minStockThreshold: minStockThreshold ? parseInt(minStockThreshold) : null,
      orderQuantity: orderQuantity ? parseInt(orderQuantity) : null,
      optionGroups: optionGroupIds ? {
        connect: optionGroupIds.map((id: string) => ({ id: parseInt(id) }))
      } : undefined
    },
  });

  res.status(201).json(createdProduct);
});

// PUT /api/products/:id
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  const { name, price, stock, categoryId, autoOrderEnabled, minStockThreshold, orderQuantity, optionGroupIds } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;

  const updatedProduct = await prisma.product.update({
    where: { id: parseInt(req.params.id) },
    data: {
      name,
      price: parseInt(price),
      stock: parseInt(stock),
      imageUrl,
      categoryId: parseInt(categoryId),
      autoOrderEnabled: autoOrderEnabled === 'true',
      minStockThreshold: minStockThreshold ? parseInt(minStockThreshold) : null,
      orderQuantity: orderQuantity ? parseInt(orderQuantity) : null,
      optionGroups: optionGroupIds ? {
        set: optionGroupIds.map((id: string) => ({ id: parseInt(id) }))
      } : { set: [] } // Disconnect all if optionGroupIds is not provided
    },
  });

  res.json(updatedProduct);
});

// DELETE /api/products/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: '인증 정보가 없습니다.' });
  await prisma.product.delete({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
  });
  res.status(204).send();
});

export default router;
