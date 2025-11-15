"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const supplierRouter = (0, express_1.Router)();
// GET all suppliers for the current store
supplierRouter.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    try {
        const suppliers = await db_1.default.supplier.findMany({
            where: { storeId },
            orderBy: { name: 'asc' },
            include: {
                supplies: {
                    include: {
                        inventory: true,
                    },
                },
            },
        });
        res.json(suppliers);
    }
    catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ message: 'Failed to fetch suppliers.' });
    }
});
// GET a single supplier by ID
supplierRouter.get('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { id } = req.params;
    try {
        const supplier = await db_1.default.supplier.findFirst({
            where: { id: parseInt(id), storeId },
            include: {
                supplies: {
                    include: {
                        inventory: true,
                    },
                },
            },
        });
        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found or does not belong to your store.' });
        }
        res.json(supplier);
    }
    catch (error) {
        console.error(`Error fetching supplier ${id}:`, error);
        res.status(500).json({ message: 'Failed to fetch supplier.' });
    }
});
// POST create a new supplier
supplierRouter.post('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { name, contact, email, address, supplies = [] } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Supplier name is required.' });
    }
    try {
        const newSupplier = await db_1.default.supplier.create({
            data: {
                name,
                contact,
                email,
                address,
                storeId,
                supplies: {
                    create: supplies.map((s) => ({
                        inventoryId: s.inventoryId,
                        price: s.price,
                        leadTimeDays: s.leadTimeDays,
                    })),
                },
            },
            include: {
                supplies: { include: { inventory: true } },
            }
        });
        res.status(201).json(newSupplier);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'A supplier with this name already exists.' });
        }
        console.error('Error creating supplier:', error);
        res.status(500).json({ message: 'Failed to create supplier.' });
    }
});
// PUT update an existing supplier
supplierRouter.put('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { id } = req.params;
    const { name, contact, email, address, supplies = [] } = req.body;
    try {
        const updatedSupplier = await db_1.default.supplier.update({
            where: { id: parseInt(id), storeId },
            data: {
                name,
                contact,
                email,
                address,
                supplies: {
                    deleteMany: {}, // Delete all existing and then create new ones
                    create: supplies.map((s) => ({
                        inventoryId: s.inventoryId,
                        price: s.price,
                        leadTimeDays: s.leadTimeDays,
                    })),
                }
            },
            include: {
                supplies: { include: { inventory: true } },
            }
        });
        res.json(updatedSupplier);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Supplier not found or does not belong to your store.' });
        }
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'A supplier with this name already exists.' });
        }
        console.error('Error updating supplier:', error);
        res.status(500).json({ message: 'Failed to update supplier.' });
    }
});
// DELETE a supplier
supplierRouter.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    const { id } = req.params;
    try {
        // The relation is set to cascade on delete, so this will also delete SupplierInventory entries.
        await db_1.default.supplier.delete({
            where: { id: parseInt(id), storeId },
        });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Supplier not found or does not belong to your store.' });
        }
        console.error('Error deleting supplier:', error);
        res.status(500).json({ message: 'Failed to delete supplier.' });
    }
});
exports.default = supplierRouter;
