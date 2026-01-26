#!/usr/bin/env node

/**
 * Log Rotation Utility for moicad
 * 
 * Purpose: Rotate and archive old log files to prevent disk space issues
 * Automatically compresses large files and moves them to archive
 * 
 * Usage: node scripts/dev/rotate-logs.js [--force]
 * 
 * Features:
 * - Size-based rotation (rotate files over size threshold)
 * - Time-based archiving (archive files older than 24 hours)
 * - Compression with gzip
 * - Multiple log file support
 * 
 * Author: moicad dev tools
 * Updated: 2026-01-26
 */

import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

// Configuration
const CONFIG = {
  logDir: path.join(process.cwd(), 'logs'),
  currentDir: path.join(process.cwd(), 'logs', 'current'),
  archiveDir: path.join(process.cwd(), 'logs', 'archive'),
  rotationSizes: {
    error: 5 * 1024 * 1024,    // 5MB
    combined: 10 * 1024 * 1024,  // 10MB
    debug: 2 * 1024 * 1024      // 2MB
  },
  archiveAfter: 24 * 60 * 60 * 1000  // 24 hours in ms
};

/**
 * Main log rotation function
 */
async function rotateLogs(force = false) {
  console.log('🔄 moicad Log Rotation Utility');
  console.log('=' .repeat(50));
  
  try {
    // Ensure directories exist
    await ensureDirectories();
    
    // Get current log files
    const logFiles = await getLogFiles();
    console.log(`📁 Found ${logFiles.length} log files to check`);
    
    let rotatedCount = 0;
    let totalSizeFreed = 0;
    
    for (const logFile of logFiles) {
      const shouldRotate = force || await shouldRotateFile(logFile);
      
      if (shouldRotate) {
        const result = await rotateLogFile(logFile);
        if (result.success) {
          rotatedCount++;
          totalSizeFreed += result.sizeFreed;
          console.log(`✅ Rotated: ${logFile.name} (${result.sizeOriginal} → ${result.sizeCompressed})`);
        } else {
          console.log(`❌ Failed: ${logFile.name} - ${result.error}`);
        }
      } else {
        console.log(`⏭️  Skipped: ${logFile.name} (no rotation needed)`);
      }
    }
    
    // Summary
    console.log('\n📊 Rotation Summary');
    console.log('=' .repeat(30));
    console.log(`🔄 Files rotated: ${rotatedCount}`);
    console.log(`💾 Space freed: ${formatBytes(totalSizeFreed)}`);
    console.log(`📦 Compression ratio: ${totalSizeFreed > 0 ? ((totalSizeFreed / (totalSizeFreed + totalSizeFreed)) * 100).toFixed(1) : 0}%`);
    
  } catch (error) {
    console.error('💥 Log rotation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check if file should be rotated
 */
async function shouldRotateFile(logFile) {
  const stats = await fs.stat(logFile.path);
  const fileAge = Date.now() - stats.mtime.getTime();
  
  // Check size
  const sizeThreshold = CONFIG.rotationSizes[logFile.type] || CONFIG.rotationSizes.combined;
  const isTooLarge = stats.size > sizeThreshold;
  
  // Check age
  const isOldEnough = fileAge > CONFIG.archiveAfter;
  
  return isTooLarge || isOldEnough;
}

/**
 * Rotate a single log file
 */
async function rotateLogFile(logFile) {
  try {
    const stats = await fs.stat(logFile.path);
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveName = `${logFile.name}-${timestamp}.gz`;
    const archivePath = path.join(CONFIG.archiveDir, archiveName);
    
    // Compress the file
    await compressFile(logFile.path, archivePath);
    
    // Clear the original file
    await fs.writeFile(logFile.path, '');
    
    // Get compressed file size
    const compressedStats = await fs.stat(archivePath);
    
    return {
      success: true,
      sizeOriginal: formatBytes(stats.size),
      sizeCompressed: formatBytes(compressedStats.size),
      sizeFreed: stats.size - compressedStats.size,
      archivePath
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Compress file with gzip
 */
async function compressFile(sourcePath, targetPath) {
  await pipeline(
    createReadStream(sourcePath),
    createGzip({ level: 9 }),
    createWriteStream(targetPath)
  );
}

/**
 * Get list of current log files
 */
async function getLogFiles() {
  const files = await fs.readdir(CONFIG.currentDir);
  const logFiles = [];
  
  for (const file of files) {
    if (file.endsWith('.log')) {
      const filePath = path.join(CONFIG.currentDir, file);
      const type = getFileType(file);
      
      logFiles.push({
        name: file,
        path: filePath,
        type: type
      });
    }
  }
  
  return logFiles;
}

/**
 * Determine log file type from filename
 */
function getFileType(filename) {
  if (filename.includes('error')) return 'error';
  if (filename.includes('debug')) return 'debug';
  if (filename.includes('combined')) return 'combined';
  return 'general';
}

/**
 * Ensure required directories exist
 */
async function ensureDirectories() {
  const dirs = [CONFIG.logDir, CONFIG.currentDir, CONFIG.archiveDir];
  
  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force') || args.includes('-f'),
    help: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🔄 moicad Log Rotation Utility

Usage: node scripts/dev/rotate-logs.js [options]

Options:
  -f, --force    Force rotation of all log files
  -h, --help     Show this help message

Description:
  Rotates log files when they exceed size limits or age thresholds.
  Compresses rotated files and moves them to the archive directory.

Features:
  • Size-based rotation (5MB error, 10MB combined, 2MB debug)
  • Time-based archiving (24+ hours old)
  • gzip compression for space savings
  • Automatic directory creation
  • Detailed rotation reporting

Examples:
  node scripts/dev/rotate-logs.js              # Normal rotation
  node scripts/dev/rotate-logs.js --force        # Force all logs
  node scripts/dev/rotate-logs.js --help         # Show help
`);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  await rotateLogs(options.force);
  
  console.log('\n🎯 Log rotation complete!');
  console.log('💡 Tip: Add to cron for automatic rotation:');
  console.log('   0 2 * * * cd /path/to/moicad && node scripts/dev/rotate-logs.js');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { rotateLogs, CONFIG };