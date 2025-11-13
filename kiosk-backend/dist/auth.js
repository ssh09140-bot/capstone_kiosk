"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("./db"));
const router = express_1.default.Router();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in the environment variables.');
}
// [POST] /api/auth/register
router.post('/register', async (req, res) => {
    const { email, password, storeName } = req.body;
    if (!email || !password || !storeName) {
        return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }
    try {
        const existingUser = await db_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await db_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                storeName,
            },
        });
        res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: user.id });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});
// [POST] /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
    }
    try {
        const user = await db_1.default.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, storeId: user.storeId, role: 'ADMIN' }, // Corrected payload
        process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, storeName: user.storeName });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});
exports.default = router;
