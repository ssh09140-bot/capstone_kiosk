"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const router = express_1.default.Router();
// [GET] /api/notifications
router.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notifications = await db_1.default.notification.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
});
// [POST] /api/notifications/:id/read
router.post('/:id/read', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const notification = await db_1.default.notification.updateMany({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        data: { read: true },
    });
    res.status(200).json(notification);
});
exports.default = router;
