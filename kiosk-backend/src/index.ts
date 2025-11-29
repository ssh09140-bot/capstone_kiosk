import 'dotenv/config';
import app from './app';
import cron from 'node-cron';
import {
  checkStockAndCreatePurchaseOrders,
  checkExpectedDeliveriesAndNotify,
} from './services/autoOrderService';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errorHandler';
import { validateEnv } from './utils/envValidator';

// --- Environment Validation ---
try {
  validateEnv();
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}

// --- Server Startup ---
const PORT = process.env.PORT || 3000;

if (!PORT) {
  logger.error('PORT environment variable is not set');
  process.exit(1);
}

app.listen(PORT, () => {
  logger.info(`🚀 Backend server is running on port ${PORT}.`);
});

// --- Scheduled Jobs ---
// Run stock check every 6 hours (at minute 0 of every 6th hour)
cron.schedule('0 */6 * * *', async () => {
  logger.info('[Cron] Starting scheduled stock check...');
  try {
    await checkStockAndCreatePurchaseOrders();
    logger.info('[Cron] Scheduled stock check completed successfully.');
  } catch (error) {
    logger.error('[Cron] Error in scheduled stock check:', error);
  }
});

// Run delivery check every 12 hours (at minute 0 of every 12th hour)
cron.schedule('0 */12 * * *', async () => {
  logger.info('[Cron] Starting scheduled delivery check...');
  try {
    await checkExpectedDeliveriesAndNotify();
    logger.info('[Cron] Scheduled delivery check completed successfully.');
  } catch (error) {
    logger.error('[Cron] Error in scheduled delivery check:', error);
  }
});

logger.info('[Cron] Scheduled jobs initialized:');
logger.info('  - Stock check: Every 6 hours');
logger.info('  - Delivery check: Every 12 hours');