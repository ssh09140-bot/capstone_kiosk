"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRateLimiter = exports.authRateLimiter = exports.rateLimiter = void 0;
const logger_1 = require("../utils/logger");
const store = {};
/**
 * Simple in-memory rate limiter middleware
 * For production, consider using Redis-based rate limiting
 */
const rateLimiter = (windowMs = 15 * 60 * 1000, // 15 minutes
maxRequests = 100 // max 100 requests per window
) => {
    return (req, res, next) => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        // Clean up old entries
        Object.keys(store).forEach((k) => {
            if (store[k].resetTime < now) {
                delete store[k];
            }
        });
        // Get or create rate limit entry
        if (!store[key] || store[key].resetTime < now) {
            store[key] = {
                count: 1,
                resetTime: now + windowMs,
            };
            return next();
        }
        // Increment count
        store[key].count++;
        // Check if limit exceeded
        if (store[key].count > maxRequests) {
            logger_1.logger.warn(`Rate limit exceeded for IP: ${key}`);
            res.status(429).json({
                success: false,
                message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
                retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
            });
            return;
        }
        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count));
        res.setHeader('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());
        next();
    };
};
exports.rateLimiter = rateLimiter;
/**
 * Stricter rate limiter for authentication endpoints
 * In development, allow more requests to prevent issues during development
 */
const isDevelopment = process.env.NODE_ENV !== 'production';
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true';
// Rate limit을 완전히 비활성화하는 미들웨어 (개발용)
const noopRateLimiter = (_req, _res, next) => {
    next();
};
exports.authRateLimiter = disableRateLimit
    ? noopRateLimiter
    : (0, exports.rateLimiter)(15 * 60 * 1000, isDevelopment ? 100 : 5 // 100 requests per 15 minutes in dev, 5 in production
    );
/**
 * Rate limiter for API endpoints
 * In development, allow more requests to prevent issues during development
 */
exports.apiRateLimiter = disableRateLimit
    ? noopRateLimiter
    : (0, exports.rateLimiter)(15 * 60 * 1000, isDevelopment ? 5000 : 100 // 5000 requests per 15 minutes in dev, 100 in production
    );
