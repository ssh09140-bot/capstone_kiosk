import express from 'express';
import prisma from './db';
import { authenticateBoth } from './middleware/authenticateBoth'; // Import authenticateBoth middleware
import multer from 'multer';
import { uploadImage } from './services/cloudinaryService'; // Import Cloudinary upload service
import { convertToBaseUnit } from './services/unitConversionService'; // Import unit conversion service

// Helper function to calculate available stock based on inventory usages
function calculateAvailableStock(product: any): number {
  if (!product.inventoryUsages || product.inventoryUsages.length === 0) {
    return 999999; // Assume virtually infinite stock if no ingredients are defined
  }

  let maxPossibleProducts = Infinity;

  for (const usage of product.inventoryUsages) {
    if (!usage.inventory) {
      return 0;
    }
    const availableUnits = usage.inventory.quantity;
    
    // Convert usage amount to the inventory's base unit before calculation
    const requiredUnits = convertToBaseUnit(
      usage.usageAmount,
      usage.usageUnit,
      usage.inventory.unit
    );

    if (requiredUnits <= 0) {
      continue; // Avoid division by zero or infinite stock from zero requirement
    }

    const possibleProducts = Math.floor(availableUnits / requiredUnits);
    maxPossibleProducts = Math.min(maxPossibleProducts, possibleProducts);
  }

  return maxPossibleProducts;
}

const router = express.Router();

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/products
router.get('/', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const products = await prisma.product.findMany({
    where: { storeId: req.user.storeId },
    include: {
      category: true,
      optionGroups: { include: { options: true } },
      inventoryUsages: { include: { inventory: true } }, // Include recipe info
    },
  });

  const productsWithAvailableStock = products.map(product => ({
    ...product,
    availableStock: calculateAvailableStock(product),
  }));

  res.json(productsWithAvailableStock);
});

// GET /api/products/:id
router.get('/:id', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
  const product = await prisma.product.findUnique({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    include: {
      category: true,
      optionGroups: { include: { options: true } },
      inventoryUsages: { include: { inventory: true } }, // Include recipe info
    },
  });
  if (!product) {
    return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
  }

  const productWithAvailableStock = {
    ...product,
    availableStock: calculateAvailableStock(product),
  };

  res.json(productWithAvailableStock);
});

// POST /api/products
router.post('/', authenticateBoth, upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
  const { name, price, categoryId, description, optionGroupIds, inventoryUsages } = req.body;
  
  let imageUrl: string | undefined = undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer);
  }

  const usages = inventoryUsages ? JSON.parse(inventoryUsages) : [];

  const createdProduct = await prisma.product.create({
    data: {
      name,
      description,
      price: parseInt(price),
      imageUrl,
      optionGroups: optionGroupIds ? {
        connect: optionGroupIds.map((id: string) => ({ id: parseInt(id) }))
      } : undefined,
      inventoryUsages: {
        create: usages.map((usage: { inventoryId: number; usageAmount: number; usageUnit: string; }) => ({
          inventoryId: usage.inventoryId,
          usageAmount: usage.usageAmount,
          usageUnit: usage.usageUnit,
        })),
      },
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
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
  const { name, price, categoryId, description, optionGroupIds, inventoryUsages } = req.body;
  
  let imageUrl: string | undefined = req.body.imageUrl;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer);
  }

  const usages = inventoryUsages ? JSON.parse(inventoryUsages) : [];

  const updatedProduct = await prisma.product.update({
    where: { id: parseInt(req.params.id) },
    data: {
      name,
      description,
      price: parseInt(price),
      imageUrl,
      categoryId: categoryId ? parseInt(categoryId) : null,
      optionGroups: optionGroupIds ? {
        set: optionGroupIds.map((id: string) => ({ id: parseInt(id) }))
      } : { set: [] },
      inventoryUsages: {
        deleteMany: {}, // Delete all existing usages
        create: usages.map((usage: { inventoryId: number; usageAmount: number; usageUnit: string; }) => ({ // Re-create new ones
          inventoryId: usage.inventoryId,
          usageAmount: usage.usageAmount,
          usageUnit: usage.usageUnit,
        })),
      },
    },
  });

  res.json(updatedProduct);
});

// DELETE /api/products/:id
router.delete('/:id', authenticateBoth, async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
  await prisma.product.delete({
    where: { id: parseInt(req.params.id), storeId: req.user.storeId },
  });
  res.status(204).send();
});

export default router;
