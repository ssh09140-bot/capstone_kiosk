// Auth routes module
import express from 'express';
import { authenticateToken } from './middleware/authMiddleware';
import prisma from './db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as admin from 'firebase-admin';

const router = express.Router();

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
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
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // 사용자가 없으면 생성
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firebaseUid: uid,
          storeName: email.split('@')[0] + '의 가게', // 기본 가게 이름
        }
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, email: user.email, storeId: user.storeId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

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
  } catch (error) {
    console.error('Login error:', error);
    if ((error as any).code === 'auth/id-token-expired') {
      return res.status(401).json({ message: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.' });
    }
    if ((error as any).code === 'auth/argument-error') {
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
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: '이미 등록된 이메일입니다.' });
    }

    // 새 사용자 생성
    const user = await prisma.user.create({
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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: '회원가입 처리 중 오류 발생' });
  }
});

export default router;
