import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from './auth';
import { authenticateStore } from './authenticateStore';
import jwt from 'jsonwebtoken';

export const authenticateBoth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
        if (err) {
          // Token is invalid or expired. Fallback to authenticateStore.
          return authenticateStore(req, res, next);
        }
        req.user = user as JwtPayload;
        next();
      });
    } catch (error) {
      // In case verify throws synchronously
      authenticateStore(req, res, next);
    }
  } else {
    // No token provided. Fallback to authenticateStore.
    authenticateStore(req, res, next);
  }
};
