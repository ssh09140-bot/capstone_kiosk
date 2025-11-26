"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorResponse = errorResponse;
exports.successResponse = successResponse;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
/**
 * 커스텀 에러 클래스
 */
class AppError extends Error {
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
/**
 * 에러 응답 생성 헬퍼
 */
function errorResponse(code, message, details) {
    return {
        success: false,
        error: {
            code,
            message,
            details,
        },
        timestamp: new Date().toISOString(),
    };
}
/**
 * 성공 응답 생성 헬퍼
 */
function successResponse(data) {
    return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
    };
}
/**
 * 글로벌 에러 핸들러 미들웨어
 */
function errorHandler(err, req, res, next) {
    console.error('[Error Handler]', err);
    // AppError인 경우
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details));
    }
    // Prisma 에러 처리
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err;
        if (prismaError.code === 'P2002') {
            return res.status(409).json(errorResponse('DUPLICATE_ENTRY', '이미 존재하는 데이터입니다.', { field: prismaError.meta?.target }));
        }
        if (prismaError.code === 'P2025') {
            return res.status(404).json(errorResponse('NOT_FOUND', '요청한 데이터를 찾을 수 없습니다.'));
        }
    }
    // JWT 에러 처리
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(errorResponse('INVALID_TOKEN', '유효하지 않은 토큰입니다.'));
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json(errorResponse('TOKEN_EXPIRED', '토큰이 만료되었습니다.'));
    }
    // 기타 에러 (500)
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', process.env.NODE_ENV === 'production'
        ? '서버 오류가 발생했습니다.'
        : err.message));
}
/**
 * 비동기 핸들러 래퍼 (try-catch 자동화)
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
