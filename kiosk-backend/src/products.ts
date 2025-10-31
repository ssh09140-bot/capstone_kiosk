import express from 'express';
import prisma from './db';
import { authenticateBoth } from './middleware/authenticateBoth'; // Import authenticateBoth middleware
import multer from 'multer';
import { uploadImage } from './services/cloudinaryService'; // Import Cloudinary upload service

const router = express.Router();

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products
router.get('/', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const products = await prisma.product.findMany({
    where: { storeId: req.user.storeId },
    include: { category: true, optionGroups: { include: { options: true } } },
  });
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
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
router.post('/', authenticateBoth, upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const { name, price, stock, categoryId, autoOrderEnabled, minStockThreshold, orderQuantity, estimatedDeliveryDays, description, optionGroupIds } = req.body;
  
  let imageUrl: string | undefined = undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer); // Upload to Cloudinary
  }

  const createdProduct = await prisma.product.create({
    data: {
      name,
      description,
      price: parseInt(price),
      stock: parseInt(stock),
      imageUrl,
      autoOrderEnabled: autoOrderEnabled === 'true',
      minStockThreshold: minStockThreshold ? parseInt(minStockThreshold) : null,
      orderQuantity: orderQuantity ? parseInt(orderQuantity) : null,
      estimatedDeliveryDays: estimatedDeliveryDays ? parseInt(estimatedDeliveryDays) : null,
      optionGroups: optionGroupIds ? {
        connect: optionGroupIds.map((id: string) => ({ id: parseInt(id) }))
      } : undefined,
      owner: {
        connect: {
          storeId: req.user.storeId,
        },
      },
    },
  });

  res.status(201).json(createdProduct);
});

// PUT /api/products/:id
router.put('/:id', authenticateBoth, upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const { name, price, stock, categoryId, autoOrderEnabled, minStockThreshold, orderQuantity, estimatedDeliveryDays, description, optionGroupIds } = req.body;
  
  let imageUrl: string | undefined = req.body.imageUrl; // Keep existing image URL by default
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer); // Upload new image to Cloudinary
  }

  const updatedProduct = await prisma.product.update({
    where: { id: parseInt(req.params.id) },
    data: {
      name,
      description,
      price: parseInt(price),
      stock: parseInt(stock),
      imageUrl,
      categoryId: categoryId ? parseInt(categoryId) : null,
      autoOrderEnabled: autoOrderEnabled === 'true',
      minStockThreshold: minStockThreshold ? parseInt(minStockThreshold) : null,
      orderQuantity: orderQuantity ? parseInt(orderQuantity) : null,
      estimatedDeliveryDays: estimatedDeliveryDays ? parseInt(estimatedDeliveryDays) : null,
      optionGroups: optionGroupIds ? {
        set: optionGroupIds.map((id: string) => ({ id: parseInt(id) }))
      } : { set: [] } // Disconnect all if optionGroupIds is not provided
    },
  });

  res.json(updatedProduct);
});

// DELETE /api/products/:id
router.delete('/:id', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  await prisma.product.delete({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
  });
  res.status(204).send();
});

export default router;
