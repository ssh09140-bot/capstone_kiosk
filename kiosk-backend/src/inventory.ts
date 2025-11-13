import { Router } from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';

const inventoryRouter = Router();

// Get all inventory items for the current store
inventoryRouter.get('/', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User not found.' });
  }
  const storeId = req.user.storeId;

  try {
    const inventory = await prisma.inventory.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Failed to fetch inventory.' });
  }
});

// Get a single inventory item by ID
inventoryRouter.get('/:id', authenticateToken, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { id } = req.params;
  
    try {
      const item = await prisma.inventory.findFirst({
        where: {
          id: parseInt(id),
          storeId: storeId
        },
      });
  
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found or does not belong to your store.' });
      }
  
      res.json(item);
    } catch (error) {
      console.error(`Error fetching inventory item ${id}:`, error);
      res.status(500).json({ message: 'Failed to fetch inventory item.' });
    }
  });

// Create a new inventory item
inventoryRouter.post('/', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User not found.' });
  }
  const storeId = req.user.storeId;
  const { 
    name, quantity, unit, threshold,
    autoOrderEnabled, minStockThreshold, orderQuantity, estimatedDeliveryDays 
  } = req.body;

  if (!name || quantity === undefined || !unit) {
    return res.status(400).json({ message: 'Name, quantity, and unit are required.' });
  }
  
  try {
    const newInventoryItem = await prisma.inventory.create({
      data: {
        name,
        quantity,
        unit,
        threshold,
        storeId,
        autoOrderEnabled,
        minStockThreshold,
        orderQuantity,
        estimatedDeliveryDays,
      },
    });
    res.status(201).json(newInventoryItem);
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('storeId')) {
      return res.status(409).json({ message: 'Inventory item with this name already exists for this store.' });
    }
    res.status(500).json({ message: 'Failed to create inventory item.' });
  }
});

// Update an existing inventory item
inventoryRouter.put('/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User not found.' });
  }
  const storeId = req.user.storeId;
  const { id } = req.params;
  const { 
    name, quantity, unit, threshold,
    autoOrderEnabled, minStockThreshold, orderQuantity, estimatedDeliveryDays 
  } = req.body;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: 'Valid inventory ID is required.' });
  }

  try {
    const updatedInventoryItem = await prisma.inventory.update({
      where: { id: parseInt(id), storeId }, // Ensure item belongs to the store
      data: {
        name,
        quantity,
        unit,
        threshold,
        autoOrderEnabled,
        minStockThreshold,
        orderQuantity,
        estimatedDeliveryDays,
      },
    });
    res.json(updatedInventoryItem);
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    if (error.code === 'P2025') { // Not Found
      return res.status(404).json({ message: 'Inventory item not found or does not belong to your store.' });
    }
    if (error.code === 'P2002' && error.meta?.target?.includes('name') && error.meta?.target?.includes('storeId')) {
      return res.status(409).json({ message: 'Inventory item with this name already exists for this store.' });
    }
    res.status(500).json({ message: 'Failed to update inventory item.' });
  }
});

// Delete an inventory item
inventoryRouter.delete('/:id', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User not found.' });
  }
  const storeId = req.user.storeId;
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ message: 'Valid inventory ID is required.' });
  }

  try {
    await prisma.inventory.delete({
      where: { id: parseInt(id), storeId }, // Ensure item belongs to the store
    });
    res.status(204).send(); // No content for successful deletion
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    if (error.code === 'P2025') { // Not Found
      return res.status(404).json({ message: 'Inventory item not found or does not belong to your store.' });
    }
    res.status(500).json({ message: 'Failed to delete inventory item.' });
  }
});

export default inventoryRouter;
