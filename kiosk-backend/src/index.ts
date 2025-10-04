import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// TypeScript가 Express의 Request 타입에 user 속성을 추가하는 것을 이해하도록 설정
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const app = express();
const prisma = new PrismaClient();

// --- 미들웨어 설정 ---
app.use(cors());
app.use(express.json());

// --- 'uploads' 폴더 자동 생성 및 정적 폴더 설정 ---
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// --- Multer 파일 업로드 설정 ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- 인증 미들웨어 (토큰 검사 '경비원') ---
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // 토큰 없음

    jwt.verify(token, 'YOUR_SECRET_KEY', (err: any, user: any) => {
        if (err) return res.sendStatus(403); // 유효하지 않은 토큰
        req.user = user; // 요청에 사용자 정보 추가
        next(); // 통과
    });
};


// --- API 라우트 ---

// [POST] /api/upload : 이미지 업로드
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('파일이 업로드되지 않았습니다.');
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ imageUrl });
});

// [POST] /api/auth/register : 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, storeName } = req.body;
    if (!email || !password || !storeName) return res.status(400).json({ message: '모든 정보를 입력해주세요.' });
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({ data: { email, password: hashedPassword, storeName } });
    res.status(201).json(newUser);
  } catch (error) { res.status(500).json({ message: '서버 오류' }); }
});

// [POST] /api/auth/login : 로그인
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ message: '존재하지 않는 이메일입니다.' });
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        
        const token = jwt.sign(
            { userId: user.id, storeId: user.storeId },
            'YOUR_SECRET_KEY',
            { expiresIn: '8h' }
        );
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: '로그인 중 서버 오류 발생' });
    }
});

// [GET] /api/me : 내 정보 보기 (로그인 필요)
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { email: true, storeName: true, storeId: true },
        });
        if (!user) return res.status(404).json({ message: '유저 정보 없음' });
        res.json(user);
    } catch (error) { res.status(500).json({ message: '서버 오류' }); }
});

// [GET] /api/store/:storeId : 가게 정보 보기 (키오스크 설정용)
app.get('/api/store/:storeId', async (req, res) => {
    try {
      const { storeId } = req.params;
      const user = await prisma.user.findUnique({
        where: { storeId },
        select: { id: true, email: true, storeName: true, storeId: true },
      });
      if (!user) return res.status(404).json({ message: '가게를 찾을 수 없습니다.' });
      res.json(user);
    } catch (error) { res.status(500).json({ message: '서버 오류' }); }
});

// [GET] /api/products : '로그인된 가게'의 상품 목록 API (관리자용)
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { storeId: req.user.storeId },
            orderBy: { createdAt: 'desc' },
            include: { category: true, optionGroups: true },
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "상품 목록 로딩 오류" });
    }
});

// [GET] /api/products/detail/:id : 상품 1개 정보 보기 (수정 페이지용)
app.get('/api/products/detail/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) },
            include: { optionGroups: true }
        });
        if (!product) return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: '상품 정보를 불러오는 중 오류 발생' });
    }
});

// [GET] /api/products/:storeId : '특정 가게' 상품 목록 API (키오스크 앱용)
app.get('/api/products/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        const products = await prisma.product.findMany({
            where: { storeId: storeId },
            orderBy: { createdAt: 'desc' },
            include: { 
                category: true,
                optionGroups: {
                    include: {
                        options: true
                    }
                }
            },
        });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "상품 목록 로딩 오류" });
    }
});

// [POST] /api/products : 새 상품 등록 (로그인 필요)
app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const { name, description, price, stock, imageUrl, categoryId, optionGroupIds } = req.body;
        if (name === undefined || price === undefined || stock === undefined) return res.status(400).json({ message: '필수 정보를 입력해주세요.' });

        const newProduct = await prisma.product.create({
            data: {
                name,
                description: description || '',
                price: Number(price),
                stock: Number(stock),
                imageUrl: imageUrl,
                storeId: req.user.storeId,
                categoryId: categoryId ? Number(categoryId) : null,
                optionGroups: { connect: optionGroupIds?.map((id: number) => ({ id })) || [] }
            }
        });
        res.status(201).json(newProduct);
    } catch (error) {
        console.error("상품 등록 오류:", error);
        res.status(500).json({ message: "상품 등록 중 서버 오류 발생" });
    }
});

// [PUT] /api/products/:id : 상품 정보 수정 (로그인 필요)
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, imageUrl, categoryId, optionGroupIds } = req.body;
        
        const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (product?.storeId !== req.user.storeId) return res.status(403).json({ message: '권한이 없습니다.'});

        const updatedProduct = await prisma.product.update({
            where: { id: parseInt(id) },
            data: { 
                name, description, price: Number(price), stock: Number(stock), imageUrl, 
                categoryId: categoryId ? Number(categoryId) : null,
                optionGroups: { set: optionGroupIds?.map((id: number) => ({ id })) || [] }
            }
        });
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: '상품 수정 중 오류 발생' });
    }
});

// [DELETE] /api/products/:id : 상품 삭제 (로그인 필요)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({ where: { id: parseInt(id) } });
        if (product?.storeId !== req.user.storeId) return res.status(403).json({ message: '권한이 없습니다.'});

        await prisma.product.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: "상품 삭제 중 오류 발생" });
    }
});

// [GET] /api/categories/:storeId : '특정 가게'의 카테고리 목록 API (kiosk-app용)
app.get('/api/categories/:storeId', async (req, res) => {
    try {
        const { storeId } = req.params;
        const categories = await prisma.category.findMany({
            where: { storeId: storeId },
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: "카테고리 조회 중 오류 발생" });
    }
});

// [GET] /api/categories : 로그인된 가게의 모든 카테고리 목록 API (kiosk-admin용)
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            where: { storeId: req.user.storeId },
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: '카테고리 조회 중 오류 발생' });
    }
});

// [POST] /api/categories : 새 카테고리 생성 API (kiosk-admin용)
app.post('/api/categories', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const newCategory = await prisma.category.create({
            data: {
                name,
                storeId: req.user.storeId,
            }
        });
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: '카테고리 생성 중 오류 발생' });
    }
});

// [GET] /api/option-groups : 옵션 그룹 목록 (관리자용)
app.get('/api/option-groups', authenticateToken, async (req, res) => {
    try {
        const optionGroups = await prisma.optionGroup.findMany({
            where: { storeId: req.user.storeId },
            include: { options: true },
        });
        res.json(optionGroups);
    } catch (error) {
        res.status(500).json({ message: "옵션 그룹 조회 중 오류 발생" });
    }
});

// [POST] /api/option-groups : 새 옵션 그룹 생성 (관리자용)
app.post('/api/option-groups', authenticateToken, async (req, res) => {
    try {
        const { name, options } = req.body;
        const newGroup = await prisma.optionGroup.create({
            data: {
                name,
                storeId: req.user.storeId,
                options: {
                    create: options,
                },
            },
            include: { options: true },
        });
        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ message: "옵션 그룹 생성 중 오류 발생" });
    }
});

// [POST] /api/orders : 주문 생성 (kiosk-app용)
app.post('/api/orders', async (req, res) => {
    const { storeId, items } = req.body;
    if (!storeId || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: '잘못된 주문 정보입니다.' });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            let calculatedTotal = 0;
            const productIds = items.map((item: any) => parseInt(item.productId, 10));
            const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { optionGroups: { include: { options: true } } } });

            for (const item of items) {
                const product = products.find(p => p.id === parseInt(item.productId, 10));
                if (!product) throw new Error(`상품을 찾을 수 없습니다.`);
                if (product.stock < item.quantity) throw new Error(`재고 부족: ${product.name}`);
                
                let itemPrice = product.price;
                if (item.selectedOptions) {
                    for (const groupId in item.selectedOptions) {
                        const optionId = item.selectedOptions[groupId].optionId;
                        const group = product.optionGroups.find(g => g.id.toString() === groupId);
                        const option = group?.options.find(o => o.id === optionId);
                        if (option) {
                            itemPrice += option.price;
                        }
                    }
                }
                calculatedTotal += itemPrice * item.quantity;
            }
            
            const order = await tx.order.create({
                data: { storeId: String(storeId), totalAmount: calculatedTotal },
            });

            for (const item of items) {
                const product = products.find(p => p.id === parseInt(item.productId, 10));
                await tx.orderItem.create({
                    data: {
                        orderId: order.id,
                        productId: product!.id,
                        quantity: item.quantity,
                        pricePerItem: product!.price,
                        selectedOptions: item.selectedOptions || {},
                    },
                });
                await tx.product.update({
                    where: { id: product!.id },
                    data: { stock: { decrement: item.quantity } },
                });
            }
            return order;
        });
        res.status(201).json(result);
    } catch (error: any) {
        console.error("주문 처리 중 오류 발생:", error.message);
        res.status(400).json({ message: error.message || '주문 처리 중 서버 오류가 발생했습니다.' });
    }
});

// [GET] /api/orders : 주문 내역 조회 (kiosk-admin용)
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { storeId: req.user.storeId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: '주문 내역 조회 중 오류 발생' });
    }
});

// [GET] /api/orders/:id : 주문 상세 내역 조회 (kiosk-admin용)
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: parseInt(req.params.id), storeId: req.user.storeId },
            include: { orderItems: { include: { product: true } } },
        });
        if (!order) return res.status(404).json({ message: "주문을 찾을 수 없습니다."});
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: "주문 상세 내역 조회 중 오류 발생" });
    }
});

// [GET] /api/sales/summary : 매출 요약 (로그인 필요)
app.get('/api/sales/summary', authenticateToken, async (req, res) => {
    try {
        const result = await prisma.order.aggregate({
            _sum: { totalAmount: true },
            where: { storeId: req.user.storeId },
        });
        res.json({ totalSales: result._sum.totalAmount || 0 });
    } catch (error) { res.status(500).json({ message: '서버 오류' }); }
});

// [PUT] /api/option-groups/:id : 옵션 그룹 수정
app.put('/api/option-groups/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, options } = req.body;
        
        // TODO: 더 복잡한 옵션 수정 로직이 필요할 수 있음 (옵션 개별 삭제 등)
        // 지금은 그룹 이름만 수정하는 간단한 로직으로 구현합니다.
        const updatedGroup = await prisma.optionGroup.update({
            where: { id: parseInt(id), storeId: req.user.storeId },
            data: { name },
        });
        res.json(updatedGroup);
    } catch (error) {
        res.status(500).json({ message: '옵션 그룹 수정 중 오류 발생' });
    }
});

// [DELETE] /api/option-groups/:id : 옵션 그룹 삭제
app.delete('/api/option-groups/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.optionGroup.delete({
            where: { id: parseInt(id), storeId: req.user.storeId },
        });
        res.status(204).send();
    } catch (error) {
        // Prisma에서 연결된 상품이 있으면 삭제가 거부될 수 있습니다.
        res.status(400).json({ message: '해당 옵션 그룹을 사용하는 상품이 있어 삭제할 수 없습니다.' });
    }
});

// --- 서버 실행 ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});