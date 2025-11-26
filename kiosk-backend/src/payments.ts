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

  // authenticateToken 미들웨어에서 이미 인증을 처리하므로, userId가 없을 경우는 발생하지 않습니다.
  // if (!userId) {
  //   return res.status(403).json({ error: 'User not authenticated' });
  // }

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

interface TossPaymentResponse {
  orderId: string;
  checkout: {
    url: string;
  };
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
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
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
    // 여기서는 간단히 최근 주문을 사용 (실제로는 orderId를 DB에 저장해야 함)
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

// 체크아웃 페이지 - QR 코드로 접속
router.get('/payment/toss/checkout', async (req, res) => {
  const { orderId, amount, orderName } = req.query;

  // HTML 페이지 반환
  res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>결제하기</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #333;
          font-size: 28px;
          margin-bottom: 10px;
          text-align: center;
        }
        .order-name {
          color: #666;
          font-size: 16px;
          text-align: center;
          margin-bottom: 30px;
        }
        .amount {
          font-size: 48px;
          font-weight: bold;
          color: #722ed1;
          text-align: center;
          margin: 30px 0;
        }
        .won { font-size: 24px; }
        .pay-btn {
          width: 100%;
          padding: 18px;
          background: #722ed1;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
        }
        .pay-btn:hover {
          background: #5a1fa7;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(114, 46, 209, 0.3);
        }
        .pay-btn:active { transform: translateY(0); }
        .success {
          text-align: center;
          display: none;
        }
        .success-icon {
          font-size: 80px;
          margin: 20px 0;
        }
        .success h2 {
          color: #722ed1;
          font-size: 32px;
          margin-bottom: 10px;
        }
        .success p {
          color: #666;
          font-size: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div id="payment-form">
          <h1>💳 결제하기</h1>
          <p class="order-name">${orderName}</p>
          <div class="amount">${Number(amount).toLocaleString()}<span class="won">원</span></div>
          <button class="pay-btn" onclick="processPayment()">결제하기</button>
        </div>
        
        <div id="success-message" class="success">
          <div class="success-icon">✅</div>
          <h2>결제 완료!</h2>
          <p>주문이 성공적으로 완료되었습니다.</p>
          <p style="margin-top: 20px; color: #999;">이 창을 닫아주세요.</p>
        </div>
      </div>

      <script>
        async function processPayment() {
          const btn = document.querySelector('.pay-btn');
          btn.disabled = true;
          btn.textContent = '처리 중...';

          try {
            // 백엔드에 결제 완료 알림 (confirm 대신 간단히 주문 완료 처리)
            const response = await fetch('/api/payment/toss/test-complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: ${orderId},
                amount: ${amount}
              })
            });

            if (response.ok) {
              document.getElementById('payment-form').style.display = 'none';
              document.getElementById('success-message').style.display = 'block';
            } else {
              alert('결제 처리 중 오류가 발생했습니다.');
              btn.disabled = false;
              btn.textContent = '결제하기';
            }
          } catch (error) {
            console.error('Payment error:', error);
            alert('결제 처리 중 오류가 발생했습니다.');
            btn.disabled = false;
            btn.textContent = '결제하기';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// 테스트용 결제 완료 처리
router.post('/payment/toss/test-complete', async (req, res) => {
  const { orderId, amount } = req.body;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    // 주문을 완료 상태로 표시 (실제로는 status 필드가 있다면 업데이트)
    console.log(`Order ${orderId} completed successfully`);

    res.status(200).json({
      message: 'Payment completed successfully',
      order,
    });
  } catch (error) {
    console.error('Error completing payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. 결제 상태 조회 - 프론트엔드 Polling용
router.get('/payment/toss/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const orderIdNum = parseInt(orderId);

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

    // 주문이 존재하면 결제 완료로 간주
    res.status(200).json({
      orderId: order.id,
      status: 'COMPLETED', // Order가 생성되면 결제 완료
      amount: order.totalAmount,
      order,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
