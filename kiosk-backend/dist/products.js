"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const authenticateBoth_1 = require("./middleware/authenticateBoth"); // Import authenticateBoth middleware
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage: storage });
// GET /api/products
router.get('/', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    const products = await prisma.product.findMany({
        where: { storeId: req.user.storeId },
        include: { category: true, optionGroups: { include: { options: true } } },
    });
    res.json(products);
});
// GET /api/products/:id
router.get('/:id', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    const product = await prisma.product.findUnique({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        include: { category: true, optionGroups: { include: { options: true } } },
    });
    if (!product) {
        return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }
    res.json(product);
});
// POST /api/products
router.post('/', authenticateBoth_1.authenticateBoth, upload.single('image'), async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    const { name, price, stock, categoryId, autoOrderEnabled, minStockThreshold, orderQuantity, optionGroupIds } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const createdProduct = await prisma.product.create({
        data: {
            name,
            price: parseInt(price),
            stock: parseInt(stock),
            imageUrl,
            storeId: req.user.storeId,
            categoryId: parseInt(categoryId),
            autoOrderEnabled: autoOrderEnabled === 'true',
            minStockThreshold: minStockThreshold ? parseInt(minStockThreshold) : null,
            orderQuantity: orderQuantity ? parseInt(orderQuantity) : null,
            optionGroups: optionGroupIds ? {
                connect: optionGroupIds.map((id) => ({ id: parseInt(id) }))
            } : undefined
        },
    });
    res.status(201).json(createdProduct);
});
// PUT /api/products/:id
router.put('/:id', authenticateBoth_1.authenticateBoth, upload.single('image'), async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    const { name, price, stock, categoryId, autoOrderEnabled, minStockThreshold, orderQuantity, optionGroupIds } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : req.body.imageUrl;
    const updatedProduct = await prisma.product.update({
        where: { id: parseInt(req.params.id) },
        data: {
            name,
            price: parseInt(price),
            stock: parseInt(stock),
            imageUrl,
            categoryId: parseInt(categoryId),
            autoOrderEnabled: autoOrderEnabled === 'true',
            minStockThreshold: minStockThreshold ? parseInt(minStockThreshold) : null,
            orderQuantity: orderQuantity ? parseInt(orderQuantity) : null,
            optionGroups: optionGroupIds ? {
                set: optionGroupIds.map((id) => ({ id: parseInt(id) }))
            } : { set: [] } // Disconnect all if optionGroupIds is not provided
        },
    });
    res.json(updatedProduct);
});
// DELETE /api/products/:id
router.delete('/:id', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    await prisma.product.delete({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
    });
    res.status(204).send();
});
exports.default = router;
