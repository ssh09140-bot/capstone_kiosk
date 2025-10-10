import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

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
// (기존 upload, auth, me, store, product API들은 그대로 둡니다)

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send('파일이 업로드되지 않았습니다.');
    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(201).json({ imageUrl });
});
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
app.get('/api/me', authenticateToken, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { email: true, storeName: true, storeId: true },
    });
    res.json(user);
});
app.get('/api/store/:storeId', async (req, res) => {
    const user = await prisma.user.findUnique({ where: { storeId: req.params.storeId } });
    if (!user) return res.status(404).json({ message: '가게를 찾을 수 없습니다.' });
    res.json({ storeName: user.storeName });
});
app.get('/api/products', authenticateToken, async (req, res) => {
    const products = await prisma.product.findMany({
        where: { storeId: req.user.storeId },
        orderBy: { createdAt: 'desc' },
        include: { category: true, optionGroups: true },
    });
    res.json(products);
});
app.get('/api/products/detail/:id', authenticateToken, async (req, res) => {
    const product = await prisma.product.findUnique({
        where: { id: parseInt(req.params.id) },
        include: { optionGroups: true }
    });
    if (product?.storeId !== req.user.storeId) return res.status(403).json({ message: '권한 없음' });
    res.json(product);
});
app.post('/api/products', authenticateToken, async (req, res) => {
    const { name, description, price, stock, imageUrl, categoryId, optionGroupIds } = req.body;
    const newProduct = await prisma.product.create({
        data: { name, description, price: Number(price), stock: Number(stock), imageUrl, categoryId: categoryId ? Number(categoryId) : null, storeId: req.user.storeId, optionGroups: { connect: optionGroupIds?.map((id: number) => ({ id })) || [] } }
    });
    res.status(201).json(newProduct);
});
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
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (product?.storeId !== req.user.storeId) return res.status(403).json({ message: '권한 없음'});
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
});

// ### --- 카테고리/옵션 CRUD API --- ###
app.get('/api/categories', authenticateToken, async (req, res) => {
    const categories = await prisma.category.findMany({ where: { storeId: req.user.storeId } });
    res.json(categories);
});
app.post('/api/categories', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const newCategory = await prisma.category.create({ data: { name, storeId: req.user.storeId } });
    res.status(201).json(newCategory);
});
app.put('/api/categories/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    const category = await prisma.category.update({ where: { id: parseInt(req.params.id), storeId: req.user.storeId }, data: { name } });
    res.json(category);
});
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: parseInt(req.params.id), storeId: req.user.storeId } });
        res.status(204).send();
    } catch (e) { res.status(400).json({ message: '상품에 연결된 카테고리는 삭제할 수 없습니다.'}); }
});
app.get('/api/option-groups', authenticateToken, async (req, res) => {
    const optionGroups = await prisma.optionGroup.findMany({ where: { storeId: req.user.storeId }, include: { options: true } });
    res.json(optionGroups);
});
app.post('/api/option-groups', authenticateToken, async (req, res) => {
    const { name, options } = req.body;
    const newGroup = await prisma.optionGroup.create({ data: { name, storeId: req.user.storeId, options: { create: options } }, include: { options: true } });
    res.status(201).json(newGroup);
});
app.put('/api/option-groups/:id', authenticateToken, async (req, res) => {
    const { name } = req.body; // 현재는 그룹 이름만 수정
    const updatedGroup = await prisma.optionGroup.update({ where: { id: parseInt(req.params.id), storeId: req.user.storeId }, data: { name } });
    res.json(updatedGroup);
});
app.delete('/api/option-groups/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.optionGroup.delete({ where: { id: parseInt(req.params.id), storeId: req.user.storeId } });
        res.status(204).send();
    } catch (e) { res.status(400).json({ message: '상품에 연결된 옵션 그룹은 삭제할 수 없습니다.'}); }
});

// ### --- 주문 및 매출 API (업그레이드) --- ###

// [GET] /api/orders (관리자용) - 날짜 필터링 기능 추가
app.get('/api/orders', authenticateToken, async (req, res) => {
    const { startDate, endDate } = req.query;
    let where: any = { storeId: req.user.storeId };

    if (startDate && endDate) {
        where.createdAt = {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
        };
    }

    const orders = await prisma.order.findMany({
        where: where,
        orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
});

// ### --- 주문 및 매출 API --- ###
app.get('/api/orders', authenticateToken, async (req, res) => {
    const orders = await prisma.order.findMany({ where: { storeId: req.user.storeId }, orderBy: { createdAt: 'desc' } });
    res.json(orders);
});
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
    const order = await prisma.order.findUnique({
        where: { id: parseInt(req.params.id), storeId: req.user.storeId },
        include: { orderItems: { include: { product: true } } },
    });
    if (!order) return res.status(404).json({ message: "주문을 찾을 수 없습니다."});
    res.json(order);
});
app.get('/api/sales/summary', authenticateToken, async (req, res) => {
    const result = await prisma.order.aggregate({ _sum: { totalAmount: true }, where: { storeId: req.user.storeId } });
    res.json({ totalSales: result._sum.totalAmount || 0 });
});

// ### --- Analytics API (새로 추가) --- ###

// [GET] /api/analytics/top-products : 가장 많이 팔린 상품 TOP 5
app.get('/api/analytics/top-products', authenticateToken, async (req, res) => {
    const topProducts = await prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
            quantity: true,
        },
        where: {
            order: {
                storeId: req.user.storeId,
            }
        },
        orderBy: {
            _sum: {
                quantity: 'desc',
            },
        },
        take: 5,
    });

    // ID만으로는 상품 이름을 알 수 없으므로, 상품 정보를 찾아서 합쳐줍니다.
    const productIds = topProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
    });

    const result = topProducts.map(p => {
        const productInfo = products.find(prod => prod.id === p.productId);
        return {
            name: productInfo?.name || '알 수 없는 상품',
            quantity: p._sum.quantity,
        };
    });

    res.json(result);
});

// [GET] /api/analytics/low-stock : 재고 부족 임박 상품 (10개 이하)
app.get('/api/analytics/low-stock', authenticateToken, async (req, res) => {
    const lowStockProducts = await prisma.product.findMany({
        where: {
            storeId: req.user.storeId,
            stock: {
                lte: 10, // 10개 이하
            },
        },
        orderBy: {
            stock: 'asc', // 재고 적은 순
        },
    });
    res.json(lowStockProducts);
});

// --- 키오스크 앱 전용 API ---
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
            const productIds = items.map((item: any) => parseInt(item.productId, 10));
            const products = await tx.product.findMany({ where: { id: { in: productIds } }, include: { optionGroups: { include: { options: true } } } });
            let calculatedTotal = 0;
            for (const item of items) {
                const product = products.find(p => p.id === parseInt(item.productId, 10));
                if (!product || product.stock < item.quantity) throw new Error(`재고 부족: ${product?.name}`);
                let itemTotal = product.price;
                if (item.selectedOptions) {
                    for (const groupId in item.selectedOptions) {
                        const optionId = item.selectedOptions[groupId].optionId;
                        const group = product.optionGroups.find(g => g.id.toString() === groupId);
                        const option = group?.options.find(o => o.id === optionId);
                        if (option) itemTotal += option.price;
                    }
                }
                calculatedTotal += itemTotal * item.quantity;
            }
            const order = await tx.order.create({ data: { storeId: String(storeId), totalAmount: calculatedTotal } });
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
                await tx.product.update({ where: { id: product!.id }, data: { stock: { decrement: item.quantity } } });
            }
            return order;
        });
        res.status(201).json(result);
    } catch (error: any) { res.status(400).json({ message: error.message }); }
});

// --- 서버 실행 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 백엔드 서버가 ${PORT}번 포트에서 실행 중입니다.`);
});