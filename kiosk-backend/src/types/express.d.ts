// kiosk-backend/src/types/express.d.ts

interface JwtPayload {
  id: number;
  storeId: string;
  role: string;
}

interface StoreUser {
  storeId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | StoreUser;
    }
  }
}