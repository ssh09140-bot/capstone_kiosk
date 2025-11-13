"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const authenticateBoth_1 = require("./middleware/authenticateBoth"); // Import authenticateBoth middleware
const router = express_1.default.Router();
// GET /api/categories
router.get('/', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    const categories = await db_1.default.category.findMany({
        where: { storeId: req.user.storeId },
    });
    res.json(categories);
});
// POST /api/categories
router.post('/', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    const { name } = req.body;
    const category = await db_1.default.category.create({
        data: {
            name,
            storeId: req.user.storeId,
        },
    });
    res.status(201).json(category);
});
// PUT /api/categories/:id
router.put('/:id', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    const { name } = req.body;
    const category = await db_1.default.category.update({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        data: { name },
    });
    res.json(category);
});
// DELETE /api/categories/:id
router.delete('/:id', authenticateBoth_1.authenticateBoth, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: 'Store ID가 제공되지 않았습니다.' }); // Updated message
    try {
        await db_1.default.category.delete({
            where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ message: '카테고리에 속한 상품이 있어 삭제할 수 없습니다.' });
    }
});
exports.default = router;
