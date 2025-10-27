import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// This is now the single source of truth for the user payload
interface JwtPayload {
  id: number;
  storeId: string;
  role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, 'YOUR_SECRET_KEY', (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user as JwtPayload;
        next();
    });
};
