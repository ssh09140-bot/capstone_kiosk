import express from 'express';
import prisma from './db';
import admin from './firebase';

const router = express.Router();

// [POST] /api/auth/register - 회원가입 (Firebase UID 저장)
router.post('/register', async (req, res) => {
  const { email, storeName, firebaseUid } = req.body;

  if (!email || !storeName || !firebaseUid) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  try {
    // 기존 사용자 확인
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
    }

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        firebaseUid,
        storeName,
      },
    });

    res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: user.id });
  } catch (error) {
    console.error('회원가입 에러:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [POST] /api/auth/login - 로그인 (Firebase Token 검증)
router.post('/login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'ID 토큰이 필요합니다.' });
  }

  try {
    // Firebase Token 검증
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, email_verified } = decodedToken;

    if (!email) {
      return res.status(400).json({ message: '유효하지 않은 토큰입니다.' });
    }

    if (!email_verified) {
      return res.status(403).json({ message: '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.' });
    }

    // DB에서 사용자 조회
    let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });

    if (!user) {
      // Firebase에는 있지만 DB에 없는 경우 (예외 처리)
      return res.status(404).json({ message: '사용자 정보를 찾을 수 없습니다.' });
    }

    res.json({
      message: '로그인 성공',
      storeName: user.storeName,
      storeId: user.storeId,
      token: idToken
    });

  } catch (error) {
    console.error('로그인 실패:', error);
    res.status(401).json({ message: '인증 실패' });
  }
});

// [DELETE] /api/auth/delete - 회원 탈퇴
router.delete('/delete', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Firebase Token 검증
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;

    // 1. PostgreSQL에서 사용자 삭제 (연관 데이터도 Cascade로 자동 삭제됨)
    await prisma.user.delete({ where: { firebaseUid: uid } });

    // 2. Firebase Authentication에서 사용자 삭제
    await admin.auth().deleteUser(uid);

    res.json({ message: '회원 탈퇴가 완료되었습니다.' });
  } catch (error) {
    console.error('회원 탈퇴 실패:', error);
    res.status(500).json({ message: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
  }
});

export default router;
