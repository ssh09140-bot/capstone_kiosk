"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const socket_1 = require("./socket");
const inventoryRouter = (0, express_1.Router)();
// Get all inventory items for the current store
inventoryRouter.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    try {
        const inventory = await db_1.default.inventory.findMany({
            where: { storeId },
            orderBy: { name: 'asc' },
        });
        res.json(inventory);
    }
    catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Failed to fetch suppliers.' });
    }
});
// GET a single inventory item by ID
inventoryRouter.get('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { id } = req.params;
    try {
        const item = await db_1.default.inventory.findFirst({
            where: {
                id: parseInt(id),
                storeId: storeId
            },
        });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found or does not belong to your store.' });
        }
        res.json(item);
    }
    catch (error) {
        console.error(`Error fetching inventory item ${id}:`, error);
        res.status(500).json({ message: 'Failed to fetch inventory item.' });
    }
});
// POST create a new inventory item
inventoryRouter.post('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { name, quantity, unit, threshold, autoOrderEnabled, minStockThreshold, orderQuantity, estimatedDeliveryDays, packAmount } = req.body;
    if (!name || quantity === undefined || !unit) {
        return res.status(400).json({ message: 'Name, quantity, and unit are required.' });
    }
    try {
        const newInventoryItem = await db_1.default.inventory.create({
            data: {
                name,
                quantity,
                unit,
                threshold,
                storeId,
                autoOrderEnabled,
                minStockThreshold,
                orderQuantity,
                estimatedDeliveryDays,
                packAmount: packAmount || 1.0,
            },
        });
        res.status(201).json(newInventoryItem);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'A inventory with this name already exists.' });
        }
        console.error('Error creating inventory item:', error);
        res.status(500).json({ message: 'Failed to create inventory item.' });
    }
});
// PUT update an existing inventory item
inventoryRouter.put('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { id } = req.params;
    const { name, quantity, unit, threshold, autoOrderEnabled, minStockThreshold, orderQuantity, estimatedDeliveryDays, packAmount } = req.body;
    try {
        const updatedInventoryItem = await db_1.default.$transaction(async (tx) => {
            // 1. Get the current state of the inventory item
            const currentItem = await tx.inventory.findUnique({
                where: { id: parseInt(id), storeId },
            });
            if (!currentItem) {
                // This will cause the transaction to rollback
                throw new Error('P2025');
            }
            // 2. Update the item
            const updatedItem = await tx.inventory.update({
                where: { id: parseInt(id), storeId },
                data: {
                    name,
                    quantity,
                    unit,
                    threshold,
                    autoOrderEnabled,
                    minStockThreshold,
                    orderQuantity,
                    estimatedDeliveryDays,
                    packAmount: packAmount || 1.0,
                },
            });
            // 3. Log the change if quantity was modified
            if (quantity !== undefined && currentItem.quantity !== quantity) {
                const change = quantity - currentItem.quantity;
                await tx.inventoryLog.create({
                    data: {
                        inventoryId: updatedItem.id,
                        change: change,
                        reason: 'Manual Stock Correction',
                    },
                });
            }
            return updatedItem;
        });
        res.json(updatedInventoryItem);
        // Emit socket event
        try {
            const io = (0, socket_1.getIO)();
            io.to(`store_${storeId}`).emit('inventory_update', {
                type: 'UPDATE',
                itemId: updatedInventoryItem.id,
            });
        }
        catch (e) {
            console.error('Socket emit failed:', e);
        }
    }
    catch (error) {
        if (error.message === 'P2025' || error.code === 'P2025') {
            return res.status(404).json({ message: 'Inventory item not found or does not belong to your store.' });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'An inventory item with this name already exists.' });
        }
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Failed to update inventory item.' });
    }
});
// DELETE a inventory item
inventoryRouter.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { id } = req.params;
    try {
        await db_1.default.inventory.delete({
            where: { id: parseInt(id), storeId },
        });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Inventory item not found or does not belong to your store.' });
        }
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ message: 'Failed to delete inventory item.' });
    }
});
exports.default = inventoryRouter;
