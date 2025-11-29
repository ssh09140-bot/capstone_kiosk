import { Router, Response } from 'express';
import prisma from './db';
import { AuthRequest } from './middleware/authMiddleware';
import fetch from 'node-fetch';

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
router.post('/billing/issue-billing-key', (async (req: AuthRequest, res: Response) => {
  console.log('Reached /billing/issue-billing-key route');
  const { customerKey, authKey } = req.body;
  const userId = req.user?.id; // from AuthRequest

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
}) as any);

export default router;
