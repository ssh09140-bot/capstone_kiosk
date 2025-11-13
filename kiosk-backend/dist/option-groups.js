"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const router = express_1.default.Router();
// GET /api/option-groups
router.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const optionGroups = await db_1.default.optionGroup.findMany({
        where: { storeId: req.user.storeId },
        include: { options: true },
    });
    res.json(optionGroups);
});
// POST /api/option-groups
router.post('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const { name, options } = req.body;
    const optionGroup = await db_1.default.optionGroup.create({
        data: {
            name,
            storeId: req.user.storeId,
            options: {
                create: options.map((o) => ({ name: o.name, price: o.price }))
            }
        },
    });
    res.status(201).json(optionGroup);
});
// PUT /api/option-groups/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const { name, options } = req.body;
    // As the frontend note says, we don't support editing options here, only the name.
    const optionGroup = await db_1.default.optionGroup.update({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        data: { name },
    });
    res.json(optionGroup);
});
// DELETE /api/option-groups/:id
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    try {
        await db_1.default.optionGroup.delete({
            where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        });
        res.status(204).send();
    }
    catch (error) {
        res.status(400).json({ message: '옵션 그룹에 속한 상품이 있어 삭제할 수 없습니다.' });
    }
});
exports.default = router;
