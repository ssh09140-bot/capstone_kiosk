"use strict";
/**
 * Simple logging utility for the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
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
    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
        return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
    }
    debug(message, ...args) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.formatMessage('DEBUG', message, ...args));
        }
    }
    info(message, ...args) {
        if (this.level <= LogLevel.INFO) {
            console.log(this.formatMessage('INFO', message, ...args));
        }
    }
    warn(message, ...args) {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', message, ...args));
        }
    }
    error(message, error, ...args) {
        if (this.level <= LogLevel.ERROR) {
            const errorDetails = error instanceof Error
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
exports.logger = new Logger();
