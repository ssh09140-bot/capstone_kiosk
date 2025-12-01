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
exports.authenticateToken = void 0;
const admin = __importStar(require("firebase-admin"));
const db_1 = __importDefault(require("../db"));
const path_1 = __importDefault(require("path"));
// Firebase Admin 초기화
// 이미 초기화되었는지 확인
if (!admin.apps.length) {
    try {
        // 서비스 계정 키 파일 경로 (루트 디렉토리에 있다고 가정)
        const serviceAccountPath = path_1.default.resolve(__dirname, '../../firebase-service-account.json');
        admin.initializeApp({
            credential: admin.credential.cert(require(serviceAccountPath))
        });
        console.log('Firebase Admin initialized successfully');
    }
    catch (error) {
        console.error('Firebase Admin initialization failed:', error);
    }
}
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }
    try {
        // 1. Firebase 토큰 검증
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { uid, email } = decodedToken;
        if (!email) {
            return res.status(400).json({ message: '이메일 정보가 없는 토큰입니다.' });
        }
        // 2. DB에서 사용자 찾기 또는 생성
        // upsert를 사용하면 좋겠지만, storeName 등 필수 필드가 있어서 로직 분리
        let user = await db_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            // 새 사용자 생성 (회원가입)
            // 주의: storeName 등은 클라이언트에서 별도로 받거나 기본값 설정 필요
            // 여기서는 이메일의 @ 앞부분을 임시 매장명으로 사용하거나, 
            // 클라이언트가 회원가입 시 추가 정보를 보내는 별도 API가 필요할 수 있음.
            // 하지만 현재 요구사항("Firebase가 다 해주니까")에 맞춰 자동 생성으로 처리.
            user = await db_1.default.user.create({
                data: {
                    email,
                    // password 필드는 스키마에서 삭제되었으므로 제거
                    firebaseUid: uid, // 스키마에 추가된 firebaseUid 저장
                    storeName: email.split('@')[0] + '의 매장', // 임시 매장명
                    storeId: uid, // Firebase UID를 storeId로 사용
                }
            });
            console.log(`New user created: ${email}`);
        }
        // 3. req.user에 사용자 정보 저장
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Token verification failed:', error);
        return res.status(403).json({ message: '유효하지 않은 토큰입니다.' });
    }
};
exports.authenticateToken = authenticateToken;
