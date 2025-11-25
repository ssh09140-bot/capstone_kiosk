import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from './db';
import { sendVerificationEmail, generateVerificationCode } from './utils/emailSender';

const router = express.Router();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in the environment variables.');
}

// [POST] /api/auth/send-code - 이메일 인증 코드 발송
router.post('/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: '이메일을 입력해주세요.' });
  }

  try {
    // 6자리 인증 코드 생성
    const code = generateVerificationCode();

    // 만료 시간 설정 (5분 후)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // DB에 저장 (이미 있으면 업데이트) 
    await prisma.emailVerification.upsert({
      where: { email },
      update: { code, expiresAt },
      create: { email, code, expiresAt },
    });

    // 이메일 발송
    await sendVerificationEmail(email, code);

    res.json({ message: '인증 코드가 이메일로 발송되었습니다.' });
  } catch (error) {
    console.error('인증 코드 발송 실패:', error);
    res.status(500).json({ message: '인증 코드 발송에 실패했습니다.' });
  }
});

// [POST] /api/auth/verify-code - 인증 코드 검증
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: '이메일과 인증 코드를 입력해주세요.' });
  }

  try {
    const verification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification) {
      return res.status(400).json({ message: '인증 요청을 찾을 수 없습니다.' });
    }

    // 만료 시간 확인
    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ message: '인증 코드가 만료되었습니다.' });
    }

    // 코드 일치 확인
    if (verification.code !== code) {
      return res.status(400).json({ message: '인증 코드가 일치하지 않습니다.' });
    }

    res.json({ message: '인증이 완료되었습니다.', verified: true });
  } catch (error) {
    console.error('인증 코드 검증 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [POST] /api/auth/register - 회원가입 (인증 코드 검증 포함)
router.post('/register', async (req, res) => {
  const { email, password, storeName, verificationCode } = req.body;

  if (!email || !password || !storeName || !verificationCode) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  try {
    // 인증 코드 검증
    const verification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification) {
      return res.status(400).json({ message: '이메일 인증이 필요합니다.' });
    }

    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ message: '인증 코드가 만료되었습니다.' });
    }

    if (verification.code !== verificationCode) {
      return res.status(400).json({ message: '인증 코드가 일치하지 않습니다.' });
    }

    // 기존 사용자 확인
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
    }

    // 비밀번호 해싱 및 사용자 생성
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        storeName,
      },
    });

    // 사용된 인증 코드 삭제
    await prisma.emailVerification.delete({ where: { email } });

    res.status(201).json({ message: '회원가입이 완료되었습니다.', userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [POST] /api/auth/reset-password - 비밀번호 재설정
router.post('/reset-password', async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  if (!email || !verificationCode || !newPassword) {
    return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
  }

  try {
    // 사용자 존재 확인
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: '존재하지 않는 이메일입니다.' });
    }

    // 인증 코드 검증
    const verification = await prisma.emailVerification.findUnique({
      where: { email },
    });

    if (!verification) {
      return res.status(400).json({ message: '인증 요청을 찾을 수 없습니다.' });
    }

    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ message: '인증 코드가 만료되었습니다.' });
    }

    if (verification.code !== verificationCode) {
      return res.status(400).json({ message: '인증 코드가 일치하지 않습니다.' });
    }

    // 비밀번호 변경
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    // 사용된 인증 코드 삭제
    await prisma.emailVerification.delete({ where: { email } });

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('비밀번호 재설정 실패:', error);
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    const token = jwt.sign(
      { id: user.id, storeId: user.storeId, role: 'ADMIN' }, // Corrected payload
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    res.json({ token, storeName: user.storeName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;

