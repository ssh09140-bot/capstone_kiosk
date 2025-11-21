"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
const logger_1 = require("./logger");
/**
 * Validates required environment variables
 */
function validateEnv() {
    const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
    ];
    const missingVars = [];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    if (missingVars.length > 0) {
        logger_1.logger.error('Missing required environment variables:', missingVars);
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        logger_1.logger.warn('JWT_SECRET is less than 32 characters. Consider using a stronger secret for production.');
    }
    logger_1.logger.info('Environment variables validated successfully.');
}
