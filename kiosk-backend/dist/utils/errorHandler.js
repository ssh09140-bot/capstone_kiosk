"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger_1.logger.error('Error occurred:', err, {
        path: req.path,
        method: req.method,
        body: req.body,
    });
    // Handle Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        handlePrismaError(err, res);
        return;
    }
    // Handle custom AppError
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // Handle unexpected errors
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? '서버 오류가 발생했습니다.'
            : err.message,
    });
};
exports.errorHandler = errorHandler;
/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(err, res) {
    switch (err.code) {
        case 'P2002':
            res.status(409).json({
                success: false,
                message: '중복된 데이터가 이미 존재합니다.',
            });
            break;
        case 'P2025':
            res.status(404).json({
                success: false,
                message: '요청한 데이터를 찾을 수 없습니다.',
            });
            break;
        case 'P2003':
            res.status(400).json({
                success: false,
                message: '관련된 데이터가 존재하지 않습니다.',
            });
            break;
        default:
            logger_1.logger.error('Unhandled Prisma error:', err);
            res.status(500).json({
                success: false,
                message: '데이터베이스 오류가 발생했습니다.',
            });
    }
}
/**
 * Async error wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
