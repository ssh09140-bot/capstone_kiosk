import { Request, Response, NextFunction } from 'express';
import admin from '../firebase';

export interface AuthRequest extends Request {
    user?: {
        uid: string;
        email?: string;
        storeId: string;
        id: number; // Added id
    };
}

export const verifyToken = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    console.log('[Auth Middleware] Request URL:', req.url);
    console.log('[Auth Middleware] Headers:', req.headers);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[Auth Middleware] No authorization header found');
        res.status(401).json({ message: '인증 토큰이 필요합니다.' });
        return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    console.log('[Auth Middleware] Token received (first 20 chars):', idToken.substring(0, 20) + '...');

    try {
        // Firebase Token 검증
        console.log('[Auth Middleware] Attempting to verify Firebase token...');
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email } = decodedToken;

        console.log('[Auth Middleware] Token verified for user:', email, 'UID:', uid);

        // DB에서 사용자 조회
        const prisma = (await import('../db')).default;
        console.log('[Auth Middleware] Searching for user with firebaseUid:', uid);
        const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });

        if (!user) {
            console.log('[Auth Middleware] User not found in database for UID:', uid);
            res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
            return;
        }

        console.log('[Auth Middleware] User found in database:', user.email, 'StoreId:', user.storeId);

        // req.user에 사용자 정보 추가
        req.user = {
            uid,
            email: email || undefined,
            storeId: user.storeId,
            id: user.id, // Added id
        };

        console.log('[Auth Middleware] Authentication successful, calling next()');
        next();
    } catch (error) {
        console.error('[Auth Middleware] Token verification failed:');
        console.error('[Auth Middleware] Error details:', error);
        res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
};
