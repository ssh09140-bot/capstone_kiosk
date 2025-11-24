import express, { Request, Response, NextFunction } from 'express';
import { getProductTemperatureAnalysis } from './services/analysisService';
import { logger } from './utils/logger';

const router = express.Router();

/**
 * GET /api/analysis/temperature/:productId
 * Analyzes the correlation between temperature and sales for a specific product.
 */
router.get('/temperature/:productId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId } = req.params;
        const { days } = req.query;

        const analysisDays = days ? parseInt(days as string) : 90;

        logger.info(`[Analysis] Analyzing temperature correlation for product ${productId} over ${analysisDays} days.`);

        const result = await getProductTemperatureAnalysis(productId, analysisDays);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
