import { Router, Response } from 'express';
import prisma from './db';
import { AuthRequest } from './middleware/authMiddleware';

const inventoryLogRouter = Router();

// GET all inventory logs for the current store
inventoryLogRouter.get('/', (async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User not found.' });
  }
  const storeId = req.user.storeId;

  // Basic filtering by date could be added here via query params
  // e.g., const { startDate, endDate } = req.query;

  try {
    const logs = await prisma.inventoryLog.findMany({
      where: {
        inventory: {
          storeId: storeId,
        },
      },
      include: {
        inventory: true, // Include the related inventory item to get its name
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500, // Limit the number of logs to prevent performance issues
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    res.status(500).json({ message: 'Failed to fetch inventory logs.' });
  }
}) as any);

export default inventoryLogRouter;
