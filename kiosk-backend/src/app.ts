console.log('app.ts file is being loaded');

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, PurchaseOrderStatus, NotificationType } from '@prisma/client';
import prisma from './db';

import multer from 'multer';
import path from 'path';
import fs from 'fs';

import authRoutes from './auth';
import analyticsRoutes from './analytics';
import productRoutes from './products';
import categoryRoutes from './categories';
import optionGroupRoutes from './option-groups';
import orderRoutes from './orders';
import userRoutes from './users';
import paymentsRoutes from './payments';
import notificationRoutes from './notifications';
import purchaseOrderRoutes from './purchase-orders';
import inventoryRoutes from './inventory';
import supplierRoutes from './suppliers';
import inventoryLogRoutes from './inventory-logs'; // Import the new inventory log router
import recommendationRouter from './recommendations';
import analysisRoutes from './analysis';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './utils/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// Apply rate limiting
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'local-network-access=*');
  next();
});

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));





app.use('/api/auth', authRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/option-groups', optionGroupRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', paymentsRoutes);
app.use('/api', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory-logs', inventoryLogRoutes); // Use the new inventory log router
app.use('/api/recommendations', recommendationRouter);
app.use('/api/analysis', analysisRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.',
    path: req.path,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
