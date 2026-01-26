/**
 * Enhanced Winston Logger Configuration for moicad
 * 
 * Features:
 * - Structured JSON logging with timestamps
 * - Log rotation by size and time
 * - Separate error, general, and debug logs
 * - Production vs development configurations
 * - Automatic compression and archiving
 * 
 * Author: moicad logging system
 * Updated: 2026-01-26
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
const currentDir = path.join(logDir, 'current');
const archiveDir = path.join(logDir, 'archive');

await ensureDirectoryExists(logDir);
await ensureDirectoryExists(currentDir);
await ensureDirectoryExists(archiveDir);

/**
 * Create structured log format
 */
const createLogFormat = (label = '') => {
  return winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.label({ label }),
    winston.format.json({
      space: 2,
      replacer: (key, value) => {
        // Handle circular references and large objects
        if (typeof value === 'object' && value !== null) {
          if (value.constructor && value.constructor.name === 'Array') {
            return value.length > 50 ? `[Array(${value.length})]` : value;
          }
        }
        return value;
      }
    })
  );
};

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, label, ...meta }) => {
    const labelStr = label ? `[${label}] ` : '';
    const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} ${level}: ${labelStr}${message}${metaStr}`;
  })
);

/**
 * Ensure directory exists
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Create transports based on environment
 */
function createTransports() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const transports = [];

  // Error-specific log file with rotation
  transports.push(
    new winston.transports.File({
      filename: path.join(currentDir, 'error.log'),
      level: 'error',
      format: createLogFormat('ERROR'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 30, // Keep 30 days of error logs
      tailable: true,
      handleExceptions: true,
      handleRejections: true
    })
  );

  // Combined application log with rotation
  transports.push(
    new winston.transports.File({
      filename: path.join(currentDir, 'combined.log'),
      format: createLogFormat('MOICAD'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 14, // Keep 2 weeks of logs
      tailable: true
    })
  );

  // Debug-specific log (only in development)
  if (isDevelopment) {
    transports.push(
      new winston.transports.File({
        filename: path.join(currentDir, 'debug.log'),
        level: 'debug',
        format: createLogFormat('DEBUG'),
        maxsize: 2 * 1024 * 1024, // 2MB
        maxFiles: 7, // Keep 1 week of debug logs
        tailable: true
      })
    );
  }

  // Console output (development only)
  if (isDevelopment) {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
      })
    );
  }

  return transports;
}

/**
 * Create moicad logger instance
 */
export function createMoicadLogger(service = 'moicad-backend') {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { 
      service,
      version: '2.0.0',
      pid: process.pid
    },
    transports: createTransports(),
    exitOnError: false,
    silent: process.env.NODE_ENV === 'test'
  });
}

/**
 * Performance measurement utility
 */
export class PerformanceLogger {
  constructor(logger, operation) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(additionalData = {}) {
    const duration = performance.now() - this.startTime;
    this.logger.info(`${this.operation} completed`, {
      operation: this.operation,
      duration: parseFloat(duration.toFixed(2)),
      unit: 'ms',
      ...additionalData
    });
    return duration;
  }

  /**
   * Create performance middleware for Express
   */
  static middleware(logger) {
    return (req, res, next) => {
      const start = performance.now();
      const perfLogger = new PerformanceLogger(
        logger, 
        `${req.method} ${req.path}`
      );

      res.on('finish', () => {
        perfLogger.end({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress
        });
      });

      next();
    };
  }
}

/**
 * Utility functions for log rotation and cleanup
 */
export const LogUtils = {
  /**
   * Archive old logs
   */
  async archiveLogs() {
    const files = await fs.readdir(currentDir);
    const today = new Date().toISOString().split('T')[0];
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stats = await fs.stat(filePath);
      
      // Archive files older than 24 hours
      const fileAge = Date.now() - stats.mtime.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (fileAge > oneDay && stats.size > 0) {
        const archiveName = `${file}-${today}.gz`;
        const archivePath = path.join(archiveDir, archiveName);
        
        await this.compressFile(filePath, archivePath);
        await fs.writeFile(filePath, '');
        console.log(`📦 Archived ${file} to ${archiveName}`);
      }
    }
  },

  /**
   * Compress file using gzip
   */
  async compressFile(sourcePath, targetPath) {
    const { createReadStream, createWriteStream } = await import('fs');
    const { createGzip } = await import('zlib');
    const { pipeline } = await import('stream/promises');

    await pipeline(
      createReadStream(sourcePath),
      createGzip({ level: 9 }),
      createWriteStream(targetPath)
    );
  },

  /**
   * Get log statistics
   */
  async getLogStats() {
    const currentFiles = await fs.readdir(currentDir);
    const archiveFiles = await fs.readdir(archiveDir);
    
    const stats = {
      current: {},
      archive: {},
      totalSize: 0
    };

    for (const file of currentFiles) {
      const filePath = path.join(currentDir, file);
      const fileStats = await fs.stat(filePath);
      stats.current[file] = {
        size: fileStats.size,
        modified: fileStats.mtime,
        sizeHuman: this.formatBytes(fileStats.size)
      };
      stats.totalSize += fileStats.size;
    }

    for (const file of archiveFiles) {
      const filePath = path.join(archiveDir, file);
      const fileStats = await fs.stat(filePath);
      stats.archive[file] = {
        size: fileStats.size,
        modified: fileStats.mtime,
        sizeHuman: this.formatBytes(fileStats.size)
      };
      stats.totalSize += fileStats.size;
    }

    stats.totalSizeHuman = this.formatBytes(stats.totalSize);
    return stats;
  },

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * Cleanup old archived logs
   */
  async cleanupArchives(daysToKeep = 90) {
    const files = await fs.readdir(archiveDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedCount = 0;
    let freedSpace = 0;
    
    for (const file of files) {
      const filePath = path.join(archiveDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        freedSpace += stats.size;
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
    
    console.log(`🧹 Cleanup completed: ${deletedCount} files deleted, ${this.formatBytes(freedSpace)} freed`);
    return { deletedCount, freedSpace, freedSpaceHuman: this.formatBytes(freedSpace) };
  }
};

// Default logger instance
export const logger = createMoicadLogger();
export const perfLogger = new PerformanceLogger(logger, 'Logger Initialization');

perfLogger.end({ version: '2.0.0' });