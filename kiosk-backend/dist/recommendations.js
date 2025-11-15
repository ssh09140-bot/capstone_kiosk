"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("./middleware/auth");
const recommendation_service_1 = require("./services/recommendation.service");
const recommendationRouter = (0, express_1.Router)();
/**
 * GET /api/recommendations
 * AI 발주 추천 목록을 생성하여 반환합니다.
 */
recommendationRouter.get('/', auth_1.authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }
    const storeId = req.user.storeId;
    try {
        const recommendations = await (0, recommendation_service_1.generateRecommendations)(storeId);
        res.json(recommendations);
    }
    catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ message: 'Failed to generate recommendations.' });
    }
});
exports.default = recommendationRouter;
