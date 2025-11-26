import { Request, Response, NextFunction } from 'express';

/**
 * 표준화된 에러 응답 포맷
 */
export interface StandardError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
}

/**
 * 표준화된 성공 응답 포맷
 */
export interface StandardSuccess<T = any> {
    success: true;
    data: T;
    timestamp: string;
}

/**
 * 커스텀 에러 클래스
 */
export class AppError extends Error {
    constructor(
        public code: string,
        public message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * 에러 응답 생성 헬퍼
 */
export function errorResponse(
    code: string,
    message: string,
    details?: any
): StandardError {
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
export function successResponse<T>(data: T): StandardSuccess<T> {
    return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
    };
}

/**
 * 글로벌 에러 핸들러 미들웨어
 */
export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('[Error Handler]', err);

    // AppError인 경우
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(
            errorResponse(err.code, err.message, err.details)
        );
    }

    // Prisma 에러 처리
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as any;

        if (prismaError.code === 'P2002') {
            return res.status(409).json(
                errorResponse(
                    'DUPLICATE_ENTRY',
                    '이미 존재하는 데이터입니다.',
                    { field: prismaError.meta?.target }
                )
            );
        }

        if (prismaError.code === 'P2025') {
            return res.status(404).json(
                errorResponse('NOT_FOUND', '요청한 데이터를 찾을 수 없습니다.')
            );
        }
    }

    // JWT 에러 처리
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(
            errorResponse('INVALID_TOKEN', '유효하지 않은 토큰입니다.')
        );
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json(
            errorResponse('TOKEN_EXPIRED', '토큰이 만료되었습니다.')
        );
    }

    // 기타 에러 (500)
    return res.status(500).json(
        errorResponse(
            'INTERNAL_SERVER_ERROR',
            process.env.NODE_ENV === 'production'
                ? '서버 오류가 발생했습니다.'
                : err.message
        )
    );
}

/**
 * 비동기 핸들러 래퍼 (try-catch 자동화)
 */
export function asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
