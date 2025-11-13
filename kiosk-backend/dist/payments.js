"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("./db"));
const auth_1 = require("./middleware/auth");
const node_fetch_1 = __importDefault(require("node-fetch"));
console.log('payments.ts file loaded');
const router = (0, express_1.Router)();
// Toss Payments Secret Key - This should be in your .env file
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
// Endpoint to register a card (issue a billing key)
router.post('/billing/issue-billing-key', auth_1.authenticateToken, async (req, res) => {
    console.log('Reached /billing/issue-billing-key route');
    const { customerKey, authKey } = req.body;
    const userId = req.user.id; // from authenticateToken middleware
    if (!customerKey || !authKey) {
        return res.status(400).json({ error: 'customerKey and authKey are required' });
    }
    // authenticateToken 미들웨어에서 이미 인증을 처리하므로, userId가 없을 경우는 발생하지 않습니다.
    // if (!userId) {
    //   return res.status(403).json({ error: 'User not authenticated' });
    // }
    try {
        // Call Toss Payments API to issue the billing key
        const response = await (0, node_fetch_1.default)('https://api.tosspayments.com/v1/billing/authorizations/issue', {
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
        // Save the billingKey, customerKey, and card info to the user
        const updatedUser = await db_1.default.user.update({
            where: { id: userId },
            data: {
                billingKey,
                customerKey,
                cardCompany: card.cardType, // Use card.cardType instead of card.company
                cardNumber: card.number, // This contains masked number e.g., 433012******1234
            },
        });
        res.status(200).json(updatedUser);
    }
    catch (error) {
        console.error('Error issuing billing key:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
