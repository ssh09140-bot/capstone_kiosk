/**
 * Simple logging utility for the application
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    // Set log level from environment variable, default to INFO
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.level =
      envLevel === 'DEBUG'
        ? LogLevel.DEBUG
        : envLevel === 'WARN'
        ? LogLevel.WARN
        : envLevel === 'ERROR'
        ? LogLevel.ERROR
        : LogLevel.INFO;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, error?: Error | unknown, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      const errorDetails =
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error;
      console.error(this.formatMessage('ERROR', message, errorDetails, ...args));
    }
  }
}

export const logger = new Logger();

