import { Router } from 'express';
import { authenticateToken } from './middleware/auth';
import { generateRecommendations } from './services/recommendation.service';

const recommendationRouter = Router();

/**
 * GET /api/recommendations
 * AI 발주 추천 목록을 생성하여 반환합니다.
 */
recommendationRouter.get('/', authenticateToken, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: User not found.' });
  }
  const storeId = req.user.storeId;

  try {
    const recommendations = await generateRecommendations(storeId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ message: 'Failed to generate recommendations.' });
  }
});

export default recommendationRouter;
