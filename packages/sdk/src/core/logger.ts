/**
 * Lightweight logger for SDK (no external dependencies)
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Default to 'warn' level to reduce noise
let currentLevel: LogLevel = 'warn';

// Allow setting log level
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

const logger = {
  error: (message: string, meta?: any) => {
    if (shouldLog('error')) console.error(`[ERROR] ${message}`, meta ?? '');
  },
  warn: (message: string, meta?: any) => {
    if (shouldLog('warn')) console.warn(`[WARN] ${message}`, meta ?? '');
  },
  info: (message: string, meta?: any) => {
    if (shouldLog('info')) console.info(`[INFO] ${message}`, meta ?? '');
  },
  debug: (message: string, meta?: any) => {
    if (shouldLog('debug')) console.debug(`[DEBUG] ${message}`, meta ?? '');
  },
};

export default logger;
export const logError = (message: string, meta?: any) => logger.error(message, meta);
export const logWarn = (message: string, meta?: any) => logger.warn(message, meta);
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);
export const logDebug = (message: string, meta?: any) => logger.debug(message, meta);
