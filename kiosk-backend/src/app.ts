import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient, PurchaseOrderStatus, NotificationType } from '@prisma/client';
import prisma from './db';

import multer from 'multer';
import path from 'path';
import fs from 'fs';

import cron from 'node-cron';
import { checkStockAndCreatePurchaseOrders, checkExpectedDeliveriesAndNotify } from './services/autoOrderService';
import authRoutes from './auth';
import analyticsRoutes from './analytics';
import { authenticateToken } from './middleware/auth';
import { authenticateBoth } from './middleware/authenticateBoth'; // Import authenticateBoth middleware
import productRoutes from './products';
import categoryRoutes from './categories';
import optionGroupRoutes from './option-groups';
import orderRoutes from './orders';
import userRoutes from './users';
import paymentsRoutes from './payments';
import notificationRoutes from './notifications';
import purchaseOrderRoutes from './purchase-orders';



const app = express();

app.use(cors());
app.use(express.json());

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
app.use('/api', userRoutes);
app.use('/api', paymentsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);


// --- Scheduled Tasks ---
if (process.env.NODE_ENV !== 'test') {
    cron.schedule('0 21 * * *', () => {
        console.log('--- Running Daily Auto-Order Check (9 PM) ---');
        checkStockAndCreatePurchaseOrders();
    }, {
        timezone: "Asia/Seoul"
    });

    cron.schedule('0 10 * * *', () => {
        console.log('--- Running Daily Delivery Check (10 AM) ---');
        checkExpectedDeliveriesAndNotify();
    }, {
        timezone: "Asia/Seoul"
    });
}

export default app;
