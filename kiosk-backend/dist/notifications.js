"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const notificationService_1 = require("./services/notificationService");
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
// [GET] /api/notifications/vapid-public-key
router.get('/vapid-public-key', auth_1.authenticateToken, (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
        return res.status(500).json({ message: 'VAPID Public Key not configured.' });
    }
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});
// [POST] /api/notifications/subscribe
router.post('/subscribe', auth_1.authenticateToken, async (req, res) => {
    if (!req.user)
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    const subscription = req.body;
    try {
        await (0, notificationService_1.saveSubscription)(req.user.storeId, subscription);
        res.status(201).json({ message: 'Subscription saved successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to save subscription.' });
    }
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
