// kiosk-backend/src/custom.d.ts

import { Request } from 'express';

interface JwtPayload {
  id: number;
  storeId: string;
  role: string;
}

interface StoreUser {
  storeId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload | StoreUser;
  }
}
