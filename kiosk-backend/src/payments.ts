import { Router } from 'express';
import prisma from './db';
import { authenticateToken } from './middleware/auth';
import fetch from 'node-fetch';
import { JwtPayload } from './custom.d'; // JwtPayload 인터페이스 임포트

console.log('payments.ts file loaded');

const router = Router();

// Toss Payments Secret Key - This should be in your .env file
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;

interface TossBillingAuthResponse {
  billingKey: string;
  card: {
    issuerCode: string;
    acquirerCode: string;
    number: string;
    cardType: string;
    ownerType: string;
  };
}

// Endpoint to register a card (issue a billing key)
router.post('/billing/issue-billing-key', authenticateToken, async (req, res) => {
  console.log('Reached /billing/issue-billing-key route');
  const { customerKey, authKey } = req.body;
  const userId = (req.user as JwtPayload).id; // from authenticateToken middleware

  if (!customerKey || !authKey) {
    return res.status(400).json({ error: 'customerKey and authKey are required' });
  }

  try {
    // Call Toss Payments API to issue the billing key
    const response = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authKey,
        customerKey,
      }),
    });

    const tossResponse = await response.json() as TossBillingAuthResponse;

    if (!response.ok) {
      return res.status(response.status).json(tossResponse);
    }

    const { billingKey, card } = tossResponse;

    // Save the billingKey, customerKey, and card info to the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        billingKey,
        customerKey,
        cardCompany: card.cardType, // Use card.cardType instead of card.company
        cardNumber: card.number, // This contains masked number e.g., 433012******1234
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error issuing billing key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// 고객용 QR 결제 엔드포인트 (인증 불필요)
// ============================================

interface TossPaymentPrepareRequest {
  amount: number;
  orderName: string;
  storeId: string;
  items: Array<{
    productId: number;
    quantity: number;
    pricePerItem: number;
    selectedOptions?: any;
  }>;
}

// 1. 결제 준비 - QR 코드용 결제 URL 생성
router.post('/payment/toss/prepare', async (req, res) => {
  console.log('Reached /payment/toss/prepare route');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const { amount, orderName, storeId, items }: TossPaymentPrepareRequest = req.body;

  if (!amount || !orderName || !storeId || !items) {
    console.error('Missing required fields');
    return res.status(400).json({ error: 'amount, orderName, storeId, and items are required' });
  }

  try {
    // 고유한 주문 ID 생성
    const tossOrderId = `ORDER_${Date.now()}`;
    console.log('Generated tossOrderId:', tossOrderId);

    // DB에 주문 생성 (PENDING 상태)
    console.log('Creating order with storeId:', storeId);
    console.log('totalAmount:', amount);
    console.log('items:', items);

    const order = await prisma.order.create({
      data: {
        storeId: storeId,
        totalAmount: amount,
        orderItems: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            selectedOptions: item.selectedOptions || null,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    console.log('Order created successfully:', order.id);

    // 테스트용 결제 URL 생성
    // 실제 운영 시에는 Toss Payments Widget API를 사용해야 합니다
    // const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
    const backendUrl = 'http://192.168.197.191:3000'; // 강제 적용
    console.log('Using BACKEND_URL:', backendUrl); // 로그 추가
    const paymentUrl = `${backendUrl}/api/payment/toss/checkout?orderId=${order.id}&amount=${amount}&orderName=${encodeURIComponent(orderName)}`;

    console.log('Payment URL generated:', paymentUrl);

    // 결제 URL 반환 (QR 코드로 변환될 예정)
    res.status(200).json({
      orderId: order.id, // DB의 실제 ID
      tossOrderId: tossOrderId, // Toss용 주문 ID
      paymentUrl: paymentUrl,
      order,
    });
  } catch (error) {
    console.error('Error preparing payment:', error);
    console.error('Error stack:', (error as Error).stack);
    res.status(500).json({
      error: 'Internal server error',
      details: (error as Error).message
    });
  }
});

// 2. 결제 승인 - Toss로부터 결제 완료 후 호출됨
router.post('/payment/toss/confirm', async (req, res) => {
  console.log('Reached /payment/toss/confirm route');
  const { paymentKey, orderId, amount } = req.body;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).json({ error: 'paymentKey, orderId, and amount are required' });
  }

  try {
    // Toss Payments API로 결제 승인 요청
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const tossResponse = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(tossResponse);
    }

    // orderId는 ORDER_timestamp 형식이므로 DB에서 해당 주문 찾기
    const order = await prisma.order.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        totalAmount: amount,
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 재고 차감
    for (const item of order.orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    res.status(200).json({
      message: 'Payment confirmed successfully',
      order,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 체크아웃 페이지 - Toss Payments SDK 연동
router.get('/payment/toss/checkout', async (req, res) => {
  const { orderId, amount, orderName } = req.query;
  const clientKey = process.env.TOSS_CLIENT_KEY || 'test_ck_ZLKGPx4M3M1MZzdk5RQ23BaWypv1';
  const backendUrl = 'http://192.168.197.191:3000'; // 강제 적용

  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>결제하기</title>
      <script src="https://js.tosspayments.com/v1/payment"></script>
      <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; font-family: sans-serif; }
        .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        p { margin-top: 20px; color: #666; }
        .container { text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="loader"></div>
        <p>결제창을 불러오는 중입니다...</p>
      </div>
      <script>
        const clientKey = '${clientKey}';
        const tossPayments = TossPayments(clientKey);

        tossPayments.requestPayment('카드', {
          amount: ${amount},
          orderId: '${req.query.tossOrderId || "ORDER_" + orderId}',
          orderName: '${orderName}',
          customerName: '키오스크 고객',
          successUrl: '${backendUrl}/api/payment/toss/success?dbOrderId=${orderId}',
          failUrl: '${backendUrl}/api/payment/toss/fail',
        }).catch(function (error) {
          if (error.code === 'USER_CANCEL') {
            alert('결제가 취소되었습니다.');
            window.close();
          } else if (error.code === 'INVALID_CARD_COMPANY') {
            alert('유효하지 않은 카드입니다.');
          }
        });
      </script>
    </body>
    </html>
  `);
});

// 결제 성공 처리 (Redirect URL)
router.get('/payment/toss/success', async (req, res) => {
  const { paymentKey, orderId, amount, dbOrderId } = req.query;
  
  console.log('Payment success callback:', req.query);

  try {
    const orderIdNum = Number(dbOrderId);

    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
      include: { orderItems: true }
    });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // 재고 차감
    for (const item of order.orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // 주문 상태 완료로 변경
    await prisma.order.update({
      where: { id: orderIdNum },
      data: { status: 'COMPLETED' },
    });

    console.log(`Order ${orderIdNum} completed successfully`);

    res.send(`
      <div style="text-align:center; padding-top:50px; font-family:sans-serif;">
        <h1 style="color:#4CAF50;">결제가 완료되었습니다!</h1>
        <p>키오스크 화면을 확인해주세요.</p>
        <script>
          setTimeout(() => {
             window.close();
          }, 3000);
        </script>
      </div>
    `);

  } catch (error) {
    console.error('Payment confirmation failed:', error);
    res.status(500).send('Payment confirmation failed');
  }
});

// 결제 실패 처리
router.get('/payment/toss/fail', (req, res) => {
  const { code, message } = req.query;
  res.send(`
    <div style="text-align:center; padding-top:50px; font-family:sans-serif;">
      <h1 style="color:#F44336;">결제 실패</h1>
      <p>${message}</p>
      <p>코드: ${code}</p>
      <button onclick="window.close()">닫기</button>
    </div>
  `);
});

// 3. 결제 상태 조회 - 프론트엔드 Polling용
router.get('/payment/toss/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const orderIdNum = parseInt(orderId, 10);

  if (isNaN(orderIdNum)) {
    return res.status(400).json({ error: 'Invalid orderId' });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 주문의 실제 status 반환
    res.status(200).json({
      orderId: order.id,
      status: order.status,
      amount: order.totalAmount,
      order,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;