"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const authenticateBoth_1 = require("./middleware/authenticateBoth");
const multer_1 = __importDefault(require("multer"));
const cloudinaryService_1 = require("./services/cloudinaryService");
const inventoryService_1 = require("./services/inventoryService");
const router = express_1.default.Router();
// Configure Multer to store files in memory
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET /api/products
router.get('/', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
    const products = await db_1.default.product.findMany({
        where: { storeId: req.user.storeId },
        include: {
            category: true,
            optionGroups: { include: { options: true } },
            inventoryUsages: { include: { inventory: true } },
        },
    });
    const productsWithAvailableStock = products.map(product => ({
        ...product,
        availableStock: (0, inventoryService_1.calculateAvailableStock)(product),
    }));
    res.json(productsWithAvailableStock);
});
// GET /api/products/:id
router.get('/:id', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
    const product = await db_1.default.product.findUnique({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        include: {
            category: true,
            optionGroups: { include: { options: true } },
            inventoryUsages: { include: { inventory: true } },
        },
    });
    if (!product) {
        return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    const productWithAvailableStock = {
        ...product,
        availableStock: (0, inventoryService_1.calculateAvailableStock)(product),
    };
    res.json(productWithAvailableStock);
});
// POST /api/products
router.post('/', authenticateBoth_1.authenticateBoth, upload.single('image'), async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
    const { name, price, categoryId, description, optionGroupIds, inventoryUsages } = req.body;
    let imageUrl = undefined;
    if (req.file) {
        imageUrl = await (0, cloudinaryService_1.uploadImage)(req.file.buffer);
    }
    const usages = inventoryUsages ? JSON.parse(inventoryUsages) : [];
    const createdProduct = await db_1.default.product.create({
        data: {
            name,
            description,
            price: parseInt(price),
            imageUrl,
            optionGroups: optionGroupIds ? {
                connect: optionGroupIds.map((id) => ({ id: parseInt(id) }))
            } : undefined,
            inventoryUsages: {
                create: usages.map((usage) => ({
                    inventoryId: usage.inventoryId,
                    usageAmount: usage.usageAmount,
                    usageUnit: usage.usageUnit,
                })),
            },
            owner: {
                connect: {
                    storeId: req.user.storeId,
                },
            },
        },
    });
    res.status(201).json(createdProduct);
});
// PUT /api/products/:id
router.put('/:id', authenticateBoth_1.authenticateBoth, upload.single('image'), async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
    const { name, price, categoryId, description, optionGroupIds, inventoryUsages } = req.body;
    let imageUrl = req.body.imageUrl;
    if (req.file) {
        imageUrl = await (0, cloudinaryService_1.uploadImage)(req.file.buffer);
    }
    const usages = inventoryUsages ? JSON.parse(inventoryUsages) : [];
    const updatedProduct = await db_1.default.product.update({
        where: { id: parseInt(req.params.id) },
        data: {
            name,
            description,
            price: parseInt(price),
            imageUrl,
            categoryId: categoryId ? parseInt(categoryId) : null,
            optionGroups: optionGroupIds ? {
                set: optionGroupIds.map((id) => ({ id: parseInt(id) }))
            } : { set: [] },
            inventoryUsages: {
                deleteMany: {},
                create: usages.map((usage) => ({
                    inventoryId: usage.inventoryId,
                    usageAmount: usage.usageAmount,
                    usageUnit: usage.usageUnit,
                })),
            },
        },
    });
    res.json(updatedProduct);
});
// DELETE /api/products/:id
router.delete('/:id', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' });
    await db_1.default.product.delete({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    });
    res.status(204).send();
});
exports.default = router;
