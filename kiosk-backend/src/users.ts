import express from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';
import { JwtPayload } from './custom.d'; // JwtPayload 인터페이스 임포트
import multer from 'multer'; // Multer 임포트
import { uploadImage } from './services/cloudinaryService'; // Cloudinary upload service 임포트

const router = express.Router();

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// [GET] /api/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: (req.user as JwtPayload).id },
      select: { 
        email: true, 
        storeName: true, 
        storeId: true, 
        cardCompany: true, 
        cardNumber: true,
        businessRegistrationNumber: true, // 사업자 등록번호 추가
        businessLicenseImageUrl: true // 사업자 등록증 이미지 URL 추가
      },
    });

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // Restructure the response to match frontend expectations
    const { cardCompany, cardNumber, ...rest } = user;
    const response = {
      ...rest,
      card: cardCompany && cardNumber ? { company: cardCompany, number: cardNumber } : null,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// [PUT] /api/users/me/business-info - 사업자 등록 정보 업데이트
router.put('/me/business-info', authenticateToken, upload.single('businessLicenseImage'), async (req, res) => {
  try {
    const userId = (req.user as JwtPayload).id;
    const { businessRegistrationNumber } = req.body;
    let businessLicenseImageUrl: string | undefined = req.body.businessLicenseImageUrl; // 기존 URL 유지 또는 업데이트

    if (!userId) {
      return res.status(401).json({ message: '인증 정보가 없습니다.' });
    }

    // 파일이 업로드된 경우 Cloudinary에 업로드
    if (req.file) {
      businessLicenseImageUrl = await uploadImage(req.file.buffer);
    }

    // 사업자 등록번호 중복 확인 (새로운 번호가 있고, 기존 번호와 다를 경우)
    if (businessRegistrationNumber) {
      const existingUserWithBusinessNumber = await prisma.user.findUnique({
        where: { businessRegistrationNumber },
      });

      if (existingUserWithBusinessNumber && existingUserWithBusinessNumber.id !== userId) {
        return res.status(409).json({ message: '이미 등록된 사업자 등록번호입니다.' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        businessRegistrationNumber: businessRegistrationNumber || null,
        businessLicenseImageUrl: businessLicenseImageUrl || null,
      },
      select: {
        email: true,
        storeName: true,
        storeId: true,
        businessRegistrationNumber: true,
        businessLicenseImageUrl: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating business info:', error);
    res.status(500).json({ message: '사업자 정보 업데이트 중 오류가 발생했습니다.' });
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
  } catch (error) {
    console.error('Error fetching store by ID:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
