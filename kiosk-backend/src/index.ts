import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// --- 1. 자가 진단 시작 ---
console.log("--- [1/6] 서버 파일 실행 시작 ---");

// TypeScript가 Express의 Request 타입에 user 속성을 추가하는 것을 이해하도록 설정
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const app = express();
let prisma: PrismaClient;

// --- 2. 데이터베이스 연결 준비 ---
try {
    prisma = new PrismaClient();
    console.log("--- [2/6] Prisma Client (데이터베이스 연결 준비) 성공 ---");
} catch (e) {
    console.error("--- [치명적 오류] Prisma Client 생성 실패! ---", e);
    process.exit(1);
}

// --- 3. 기본 설정 (CORS, JSON 파서 등) ---
app.use(cors());
app.use(express.json());
console.log("--- [3/6] 기본 미들웨어 설정 완료 ---");


// --- 4. 'uploads' 폴더 자동 생성 및 정적 폴더 설정 ---
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));
console.log("--- [4/6] 'uploads' 폴더 및 정적 경로 설정 완료 ---");


// (Multer, authenticateToken 등 나머지 설정 및 함수는 그대로)
const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, 'YOUR_SECRET_KEY', (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
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
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: '이메일 또는 비밀번호가 잘못되었습니다.' });
        }
        const token = jwt.sign({ userId: user.id, storeId: user.storeId }, 'YOUR_SECRET_KEY', { expiresIn: '8h' });
        res.json({ token });
    } catch (error) { res.status(500).json({ message: '로그인 중 서버 오류' }); }
});

// [GET] /api/me : 내 정보 보기 (로그인 필요)
app.get('/api/me', authenticateToken, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true, storeName: true, storeId: true },
    });
    res.json(user);
});

// [GET] /api/store/:storeId : 가게 정보 보기 (키오스크 설정용)
app.get('/api/store/:storeId', async (req, res) => {
    const user = await prisma.user.findUnique({ where: { storeId: req.params.storeId } });
    if (!user) return res.status(404).json({ message: '가게를 찾을 수 없습니다.' });
    res.json({ storeName: user.storeName });
});

// [GET] /api/products : '로그인된 가게'의 상품 목록 (관리자용)
app.get('/api/products', authenticateToken, async (req, res) => {
    const products = await prisma.product.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
        include: { category: true, optionGroups: true },
    });
    res.json(products);
});

// [GET] /api/products/detail/:id : 상품 1개 정보 (수정 페이지용)
app.get('/api/products/detail/:id', authenticateToken, async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { optionGroups: { include: { options: true } } }
    });
    if (product?.storeId !== req.user.storeId) return res.status(403).json({ message: '권한 없음' });
    res.json(product);
});

// [POST] /api/products : 새 상품 등록 (로그인 필요)
app.post('/api/products', authenticateToken, async (req, res) => {
    const { name, description, price, stock, imageUrl, categoryId, optionGroupIds } = req.body;
    const newProduct = await prisma.product.create({
        data: { name, description, price: Number(price), stock: Number(stock), imageUrl, categoryId: categoryId ? Number(categoryId) : null, storeId: req.user.storeId, optionGroups: { connect: optionGroupIds?.map((id: number) => ({ id })) || [] } }
    });
    res.status(201).json(newProduct);
});

// [PUT] /api/products/:id : 상품 정보 수정 (로그인 필요)
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    const { name, description, price, stock, imageUrl, categoryId, optionGroupIds } = req.body;
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (product?.storeId !== req.user.storeId) return res.status(403).json({ message: '권한 없음'});
    const updatedProduct = await prisma.product.update({
        where: { id: parseInt(req.params.id) },
        data: { name, description, price: Number(price), stock: Number(stock), imageUrl, categoryId: categoryId ? Number(categoryId) : null, optionGroups: { set: optionGroupIds?.map((id: number) => ({ id })) || [] } }
    });
    res.json(updatedProduct);
});

// [DELETE] /api/products/:id : 상품 삭제 (로그인 필요)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (product?.storeId !== req.user.storeId) return res.status(403).json({ message: '권한 없음'});
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
});

// [GET] /api/categories (관리자용)
app.get('/api/categories', authenticateToken, async (req, res) => {
    const categories = await prisma.category.findMany({ where: { storeId: req.user.storeId } });
    res.json(categories);
});

// [POST] /api/categories (관리자용)
app.post('/api/categories', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const newCategory = await prisma.category.create({ data: { name, storeId: req.user.storeId } });
    res.status(201).json(newCategory);
});

// [GET] /api/option-groups (관리자용)
app.get('/api/option-groups', authenticateToken, async (req, res) => {
    const optionGroups = await prisma.optionGroup.findMany({ where: { storeId: req.user.storeId }, include: { options: true } });
    res.json(optionGroups);
});

// [POST] /api/option-groups (관리자용)
app.post('/api/option-groups', authenticateToken, async (req, res) => {
    const { name, options } = req.body;
    const newGroup = await prisma.optionGroup.create({ data: { name, storeId: req.user.storeId, options: { create: options } }, include: { options: true } });
    res.status(201).json(newGroup);
});

// [PUT] /api/option-groups/:id (관리자용)
app.put('/api/option-groups/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const updatedGroup = await prisma.optionGroup.update({ where: { id: parseInt(req.params.id), storeId: req.user.storeId }, data: { name } });
    res.json(updatedGroup);
});

// [DELETE] /api/option-groups/:id (관리자용)
app.delete('/api/option-groups/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.optionGroup.delete({ where: { id: parseInt(req.params.id), storeId: req.user.storeId } });
        res.status(204).send();
    } catch (error) { res.status(400).json({ message: '상품에 연결된 옵션 그룹은 삭제할 수 없습니다.' }); }
});

// [GET] /api/orders (관리자용)
app.get('/api/orders', authenticateToken, async (req, res) => {
    const orders = await prisma.order.findMany({ where: { storeId: req.user.storeId }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
});

// [GET] /api/orders/:id (관리자용)
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: parseInt(req.params.id), storeId: req.user.storeId }, include: { orderItems: { include: { product: true } } } });
    if (!order) return res.status(404).json({ message: "주문을 찾을 수 없습니다."});
    res.json(order);
});

// [GET] /api/sales/summary (관리자용)
app.get('/api/sales/summary', authenticateToken, async (req, res) => {
    const result = await prisma.order.aggregate({ _sum: { totalAmount: true }, where: { storeId: req.user.storeId } });
    res.json({ totalSales: result._sum.totalAmount || 0 });
});

// --- 키오스크 앱 전용 API (로그인 불필요) ---
app.get('/api/products/:storeId', async (req, res) => {
    const products = await prisma.product.findMany({ where: { storeId: req.params.storeId }, orderBy: { createdAt: 'desc' }, include: { category: true, optionGroups: { include: { options: true } } } });
    res.json(products);
});
app.get('/api/categories/:storeId', async (req, res) => {
    const categories = await prisma.category.findMany({ where: { storeId: req.params.storeId } });
    res.json(categories);
});
app.post('/api/orders', async (req, res) => {
    const { storeId, items } = req.body;
    try {
        const result = await prisma.$transaction(async (tx) => {
            let calculatedTotal = 0;
            const productIds = items.map((item: any) => parseInt(item.productId, 10));
            const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { optionGroups: { include: { options: true } } } });
            for (const item of items) {
                const product = products.find(p => p.id === parseInt(item.productId, 10));
                if (!product || product.stock < item.quantity) throw new Error(`재고 부족: ${product?.name}`);
                let itemPrice = product.price;
                if (item.selectedOptions) {
                    for (const groupId in item.selectedOptions) {
                        const optionId = item.selectedOptions[groupId].optionId;
                        const group = product.optionGroups.find(g => g.id.toString() === groupId);
                        const option = group?.options.find(o => o.id === optionId);
                        if (option) itemPrice += option.price;
                    }
                }
                calculatedTotal += itemPrice * item.quantity;
            }
            const order = await tx.order.create({ data: { storeId: String(storeId), totalAmount: calculatedTotal } });
            for (const item of items) {
                const product = products.find(p => p.id === parseInt(item.productId, 10));
                await tx.orderItem.create({ data: { orderId: order.id, productId: product!.id, quantity: item.quantity, pricePerItem: product!.price, selectedOptions: item.selectedOptions || {} } });
                await tx.product.update({ where: { id: product!.id }, data: { stock: { decrement: item.quantity } } });
            }
            return order;
        });
        res.status(201).json(result);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
});

console.log("--- [5/6] 모든 API 경로 등록 완료 ---");

// --- 서버 실행 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log("--- [6/6] 데이터베이스 연결 성공 ---");
    console.log(`🚀 데이터베이스 연결 성공, 서버가 ${PORT}번 포트에서 실행 중입니다.`);
  } catch (e) {
    console.error("--- [치명적 오류] 데이터베이스 연결 실패! ---", e);
    process.exit(1);
  }
});