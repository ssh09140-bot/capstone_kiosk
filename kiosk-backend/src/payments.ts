import { Router } from 'express';
import { prisma } from './db';
import { authenticateToken } from './middleware/auth';
import fetch from 'node-fetch';

const router = Router();

// Toss Payments Secret Key - This should be in your .env file
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;

// Endpoint to register a card (issue a billing key)
router.post('/billing/issue-billing-key', authenticateToken, async (req, res) => {
  const { customerKey, authKey } = req.body;
  const userId = req.user?.id; // from authenticateToken middleware

  if (!customerKey || !authKey) {
    return res.status(400).json({ error: 'customerKey and authKey are required' });
  }

  if (!userId) {
    return res.status(403).json({ error: 'User not authenticated' });
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

    const tossResponse = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(tossResponse);
    }

    const { billingKey, card } = tossResponse;

    // Save the billingKey and customerKey to the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        billingKey,
        customerKey,
      },
    });

    res.status(200).json({ message: 'Card registered successfully', card });
  } catch (error) {
    console.error('Error issuing billing key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
