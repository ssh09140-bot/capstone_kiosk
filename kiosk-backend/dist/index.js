"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const socket_1 = require("./socket");
const node_cron_1 = __importDefault(require("node-cron"));
const autoOrderService_1 = require("./services/autoOrderService");
const logger_1 = require("./utils/logger");
const envValidator_1 = require("./utils/envValidator");
// --- Environment Validation ---
try {
    (0, envValidator_1.validateEnv)();
}
catch (error) {
    logger_1.logger.error('Environment validation failed:', error);
    process.exit(1);
}
// --- Server Startup ---
const PORT = process.env.PORT || 3000;
if (!PORT) {
    logger_1.logger.error('PORT environment variable is not set');
    process.exit(1);
}
const httpServer = http_1.default.createServer(app_1.default);
(0, socket_1.initSocket)(httpServer);
httpServer.listen(PORT, () => {
    logger_1.logger.info(`🚀 Backend server is running on port ${PORT}.`);
    logger_1.logger.info(`📡 Socket.io initialized.`);
});
// --- Scheduled Jobs ---
// Run stock check every 6 hours (at minute 0 of every 6th hour)
node_cron_1.default.schedule('0 */6 * * *', async () => {
    logger_1.logger.info('[Cron] Starting scheduled stock check...');
    try {
        await (0, autoOrderService_1.checkStockAndCreatePurchaseOrders)();
        logger_1.logger.info('[Cron] Scheduled stock check completed successfully.');
    }
    catch (error) {
        logger_1.logger.error('[Cron] Error in scheduled stock check:', error);
    }
});
// Run delivery check every 12 hours (at minute 0 of every 12th hour)
node_cron_1.default.schedule('0 */12 * * *', async () => {
    logger_1.logger.info('[Cron] Starting scheduled delivery check...');
    try {
        await (0, autoOrderService_1.checkExpectedDeliveriesAndNotify)();
        logger_1.logger.info('[Cron] Scheduled delivery check completed successfully.');
    }
    catch (error) {
        logger_1.logger.error('[Cron] Error in scheduled delivery check:', error);
    }
});
logger_1.logger.info('[Cron] Scheduled jobs initialized:');
logger_1.logger.info('  - Stock check: Every 6 hours');
logger_1.logger.info('  - Delivery check: Every 12 hours');
