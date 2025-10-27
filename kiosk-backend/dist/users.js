"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const auth_1 = require("./middleware/auth");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// [GET] /api/me
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: '인증 정보가 없습니다.' });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { email: true, storeName: true, storeId: true },
        });
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});
// [GET] /api/store/:storeId
router.get('/store/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        const store = await prisma.user.findUnique({
            where: { storeId: storeId },
            select: { storeName: true, storeId: true }, // Only return necessary info
        });
        if (!store) {
            return res.status(404).json({ message: '가게를 찾을 수 없습니다.' });
        }
        res.json(store);
    }
    catch (error) {
        console.error('Error fetching store by ID:', error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});
exports.default = router;
