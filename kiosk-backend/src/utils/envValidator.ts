import { logger } from './logger';

/**
 * Validates required environment variables
 */
export function validateEnv(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:', missingVars);
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn(
      'JWT_SECRET is less than 32 characters. Consider using a stronger secret for production.'
    );
  }

  logger.info('Environment variables validated successfully.');
}

