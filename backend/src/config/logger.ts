// backend/src/config/logger.ts
import pino from 'pino';
import { config } from './env.js';

// Always use a valid level string for pino
const level = (config.LOG_LEVEL || 'debug') as pino.LevelWithSilent;

const baseLogger = pino({
  level,
  transport:
    config.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
});

/**
 * Backwards-compatible helper used by server.ts etc.
 * Example: const logger = createLogger('server');
 */
export function createLogger(moduleName: string) {
  return baseLogger.child({
    service: 'pronexma-backend',
    module: moduleName,
  });
}

// Dedicated child loggers if you want to import them directly
export const serverLogger = createLogger('server');
export const rpcLogger = createLogger('rpc');
export const oracleLogger = createLogger('oracle');
export const agreementLogger = createLogger('agreement');

// Default export if someone wants the root logger
export default baseLogger;

