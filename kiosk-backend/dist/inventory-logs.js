"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const inventoryLogRouter = (0, express_1.Router)();
// GET all inventory logs for the current store
inventoryLogRouter.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    // Basic filtering by date could be added here via query params
    // e.g., const { startDate, endDate } = req.query;
    try {
        const logs = await db_1.default.inventoryLog.findMany({
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
    }
    catch (error) {
        console.error('Error fetching inventory logs:', error);
        res.status(500).json({ message: 'Failed to fetch inventory logs.' });
    }
});
exports.default = inventoryLogRouter;
