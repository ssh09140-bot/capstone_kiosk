import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from './logger';

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred:', err, {
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
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

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(
  err: Prisma.PrismaClientKnownRequestError,
  res: Response
): void {
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
      logger.error('Unhandled Prisma error:', err);
      res.status(500).json({
        success: false,
        message: '데이터베이스 오류가 발생했습니다.',
      });
  }
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

