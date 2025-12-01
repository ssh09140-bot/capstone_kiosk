"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Auth routes module
const express_1 = __importDefault(require("express"));
const auth_1 = require("./middleware/auth");
const db_1 = __importDefault(require("./db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const admin = __importStar(require("firebase-admin"));
const router = express_1.default.Router();
// Firebase Admin SDK 초기화
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../firebase-service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase Admin SDK initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize Firebase Admin SDK:', error);
    }
}
// [POST] /api/auth/login - Firebase ID 토큰으로 로그인
router.post('/login', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) {
        return res.status(400).json({ message: 'Firebase ID 토큰이 필요합니다.' });
    }
    try {
        // Firebase ID 토큰 검증
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email } = decodedToken;
        if (!email) {
            return res.status(400).json({ message: '이메일 정보가 없습니다.' });
        }
        // 데이터베이스에서 사용자 찾기 또는 생성
        let user = await db_1.default.user.findUnique({
            where: { email }
        });
        // 사용자가 없으면 생성
        if (!user) {
            user = await db_1.default.user.create({
                data: {
                    email,
                    firebaseUid: uid,
                    storeName: email.split('@')[0] + '의 가게', // 기본 가게 이름
                }
            });
        }
        // JWT 토큰 생성
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, storeId: user.storeId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
        res.status(200).json({
            message: '로그인 성공',
            token,
            user: {
                id: user.id,
                email: user.email,
                storeName: user.storeName,
                storeId: user.storeId
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ message: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.' });
        }
        if (error.code === 'auth/argument-error') {
            return res.status(400).json({ message: '잘못된 토큰 형식입니다.' });
        }
        res.status(500).json({ message: '로그인 처리 중 오류 발생' });
    }
});
// [POST] /api/auth/register - 회원가입
router.post('/register', async (req, res) => {
    const { email, storeName, firebaseUid } = req.body;
    if (!email || !storeName || !firebaseUid) {
        return res.status(400).json({ message: '필수 정보가 누락되었습니다.' });
    }
    try {
        // 이미 존재하는 사용자 확인
        const existingUser = await db_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({ message: '이미 등록된 이메일입니다.' });
        }
        // 새 사용자 생성
        const user = await db_1.default.user.create({
            data: {
                email,
                storeName,
                firebaseUid
            }
        });
        res.status(201).json({
            message: '회원가입 성공',
            user: {
                id: user.id,
                email: user.email,
                storeName: user.storeName
            }
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: '회원가입 처리 중 오류 발생' });
    }
});
// [DELETE] /api/auth/account - 회원탈퇴
router.delete('/account', auth_1.authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { confirmText } = req.body;
    try {
        // 1. 확인 문구 검증
        if (!confirmText || confirmText.trim() !== '탈퇴') {
            return res.status(400).json({
                message: '탈퇴 확인 문구가 일치하지 않습니다.'
            });
        }
        // 2. 사용자 정보 조회
        const user = await db_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        // 3. Firebase에서 사용자 삭제
        if (user.firebaseUid) {
            try {
                await admin.auth().deleteUser(user.firebaseUid);
                console.log(`Firebase user deleted: ${user.firebaseUid}`);
            }
            catch (firebaseError) {
                // Firebase에 사용자가 없어도 계속 진행
                if (firebaseError.code !== 'auth/user-not-found') {
                    console.error('Firebase deletion error:', firebaseError);
                    throw firebaseError;
                }
            }
        }
        // 4. PostgreSQL에서 사용자 삭제
        // Cascade 설정으로 다음 데이터가 자동 삭제됨:
        // - PushSubscription, Category, Product, OptionGroup, Order, 
        // - PurchaseOrder, Notification, Inventory, Supplier
        await db_1.default.user.delete({
            where: { id: userId }
        });
        console.log(`User account deleted: ${user.email}`);
        res.status(200).json({
            message: '회원탈퇴가 완료되었습니다.'
        });
    }
    catch (error) {
        console.error('Account deletion error:', error);
        res.status(500).json({
            message: '회원탈퇴 처리 중 오류가 발생했습니다.'
        });
    }
});
exports.default = router;
