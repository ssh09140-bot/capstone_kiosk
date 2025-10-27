import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './auth';
import { authenticateStore } from './authenticateStore';

export const authenticateBoth = (req: Request, res: Response, next: NextFunction) => {
  // Try authenticateToken first
  authenticateToken(req, res, (err?: any) => {
    if (req.user) {
      // If authenticateToken succeeded, proceed
      return next();
    }
    // If authenticateToken failed or didn't set a user, try authenticateStore
    authenticateStore(req, res, next);
  });
};
