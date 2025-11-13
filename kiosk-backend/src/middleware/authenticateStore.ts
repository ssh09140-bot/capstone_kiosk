import { Request, Response, NextFunction } from 'express';

export const authenticateStore = (req: Request, res: Response, next: NextFunction) => {
  const storeId = req.headers['x-store-id'] as string;

  if (!storeId) {
    return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
  }

  // For now, we just set the storeId. In a real app, you might validate this storeId against your database.
  req.user = { storeId: storeId };
  next();
};
