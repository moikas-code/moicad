#!/usr/bin/env node

/**
 * Log Cleanup Utility for moicad
 * 
 * Purpose: Clean up and manage old log files and archives
 * Removes old archived logs, reports space usage, and optimizes storage
 * 
 * Usage: node scripts/dev/cleanup-logs.js [options]
 * 
 * Features:
 * - Remove archived logs older than specified days
 * - Show current log file statistics
 * - Interactive cleanup with confirmation
 * - Space usage reporting
 * 
 * Author: moicad dev tools
 * Updated: 2026-01-26
 */

import fs from 'fs/promises';
import path from 'path';
import { createInterface } from 'readline';

// Configuration
const CONFIG = {
  logDir: path.join(process.cwd(), 'logs'),
  currentDir: path.join(process.cwd(), 'logs', 'current'),
  archiveDir: path.join(process.cwd(), 'logs', 'archive'),
  defaultArchiveRetention: 90, // days
  largeFileThreshold: 100 * 1024 * 1024 // 100MB
};

/**
 * Main cleanup function
 */
async function cleanupLogs(options = {}) {
  console.log('🧹 moicad Log Cleanup Utility');
  console.log('=' .repeat(50));
  
  try {
    // Show current statistics
    const stats = await getLogStatistics();
    displayStatistics(stats);
    
    if (options.dryRun) {
      console.log('\n🔍 Dry run mode - no files will be deleted');
      return;
    }
    
    // Perform cleanup actions
    const results = await performCleanup(stats, options);
    displayCleanupResults(results);
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Get comprehensive log file statistics
 */
async function getLogStatistics() {
  const [currentFiles, archiveFiles] = await Promise.all([
    fs.readdir(CONFIG.currentDir),
    fs.readdir(CONFIG.archiveDir).catch(() => [])
  ]);
  
  const stats = {
    current: [],
    archive: [],
    totals: {
      fileCount: 0,
      totalSize: 0,
      largestFile: { name: '', size: 0 },
      oldestFile: { name: '', date: new Date() },
      newestFile: { name: '', date: new Date(0) }
    }
  };
  
  // Process current logs
  for (const file of currentFiles) {
    if (file.endsWith('.log')) {
      const filePath = path.join(CONFIG.currentDir, file);
      const fileStats = await fs.stat(filePath);
      const fileInfo = {
        name: file,
        path: filePath,
        size: fileStats.size,
        modified: fileStats.mtime,
        type: getFileType(file),
        sizeHuman: formatBytes(fileStats.size)
      };
      
      stats.current.push(fileInfo);
      updateTotals(stats.totals, fileInfo);
    }
  }
  
  // Process archived logs
  for (const file of archiveFiles) {
    const filePath = path.join(CONFIG.archiveDir, file);
    const fileStats = await fs.stat(filePath);
    const fileInfo = {
      name: file,
      path: filePath,
      size: fileStats.size,
      modified: fileStats.mtime,
      type: 'archive',
      sizeHuman: formatBytes(fileStats.size),
      age: Date.now() - fileStats.mtime.getTime()
    };
    
    stats.archive.push(fileInfo);
    updateTotals(stats.totals, fileInfo);
  }
  
  stats.totals.totalSizeHuman = formatBytes(stats.totals.totalSize);
  stats.totals.averageSize = stats.totals.fileCount > 0 ? 
    formatBytes(stats.totals.totalSize / stats.totals.fileCount) : '0 B';
  
  return stats;
}

/**
 * Update running totals
 */
function updateTotals(totals, fileInfo) {
  totals.fileCount++;
  totals.totalSize += fileInfo.size;
  
  if (fileInfo.size > totals.largestFile.size) {
    totals.largestFile = { name: fileInfo.name, size: fileInfo.size };
  }
  
  if (fileInfo.modified < totals.oldestFile.date) {
    totals.oldestFile = { name: fileInfo.name, date: fileInfo.modified };
  }
  
  if (fileInfo.modified > totals.newestFile.date) {
    totals.newestFile = { name: fileInfo.name, date: fileInfo.modified };
  }
}

/**
 * Display statistics in a formatted way
 */
function displayStatistics(stats) {
  console.log('\n📊 Current Log Statistics');
  console.log('-'.repeat(40));
  console.log(`📁 Current logs: ${stats.current.length} files`);
  console.log(`📦 Archived logs: ${stats.archive.length} files`);
  console.log(`💾 Total size: ${stats.totals.totalSizeHuman}`);
  console.log(`📏 Average size: ${stats.totals.averageSize}`);
  
  if (stats.totals.largestFile.name) {
    console.log(`📏 Largest file: ${stats.totals.largestFile.name} (${formatBytes(stats.totals.largestFile.size)})`);
  }
  
  console.log('\n📁 Current Log Files:');
  stats.current.forEach(file => {
    const age = Math.floor((Date.now() - file.modified.getTime()) / (24 * 60 * 60 * 1000));
    console.log(`  📄 ${file.name.padEnd(20)} ${file.sizeHuman.padEnd(10)} (${age}d old) [${file.type}]`);
  });
  
  if (stats.archive.length > 0) {
    console.log('\n📦 Archived Files (showing largest 10):');
    const sortedArchive = [...stats.archive].sort((a, b) => b.size - a.size);
    sortedArchive.slice(0, 10).forEach(file => {
      const age = Math.floor(file.age / (24 * 60 * 60 * 1000));
      console.log(`  📦 ${file.name.padEnd(30)} ${file.sizeHuman.padEnd(10)} (${age}d old)`);
    });
  }
}

/**
 * Perform cleanup actions based on options
 */
async function performCleanup(stats, options) {
  const results = {
    archiveDeleted: { count: 0, size: 0 },
    largeFiles: [],
    warnings: []
  };
  
  // Clean up old archives
  if (options.cleanArchives !== false) {
    const retentionDays = options.retentionDays || CONFIG.defaultArchiveRetention;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    for (const file of stats.archive) {
      if (file.modified < cutoffDate) {
        await fs.unlink(file.path);
        results.archiveDeleted.count++;
        results.archiveDeleted.size += file.size;
      }
    }
  }
  
  // Identify large files
  for (const file of [...stats.current, ...stats.archive]) {
    if (file.size > CONFIG.largeFileThreshold) {
      results.largeFiles.push({
        ...file,
        sizeHuman: formatBytes(file.size)
      });
      results.warnings.push(`Large file detected: ${file.name} (${file.sizeHuman})`);
    }
  }
  
  return results;
}

/**
 * Display cleanup results
 */
function displayCleanupResults(results) {
  console.log('\n🧹 Cleanup Results');
  console.log('-'.repeat(30));
  
  if (results.archiveDeleted.count > 0) {
    console.log(`🗑️  Archives deleted: ${results.archiveDeleted.count}`);
    console.log(`💾 Space freed: ${formatBytes(results.archiveDeleted.size)}`);
  }
  
  if (results.largeFiles.length > 0) {
    console.log('\n⚠️  Large Files (>100MB):');
    results.largeFiles.forEach(file => {
      console.log(`  📏 ${file.name} (${file.sizeHuman})`);
    });
    console.log('💡 Consider moving large files to external storage');
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(warning => {
      console.log(`  ${warning}`);
    });
  }
}

/**
 * Get file type from filename
 */
function getFileType(filename) {
  if (filename.includes('error')) return 'error';
  if (filename.includes('debug')) return 'debug';
  if (filename.includes('combined')) return 'combined';
  return 'general';
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Interactive confirmation prompt
 */
async function confirmAction(message) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    cleanArchives: true,
    retentionDays: null,
    interactive: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--no-archive':
      case '-n':
        options.cleanArchives = false;
        break;
      case '--retention':
      case '-r':
        options.retentionDays = parseInt(args[++i]) || CONFIG.defaultArchiveRetention;
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🧹 moicad Log Cleanup Utility

Usage: node scripts/dev/cleanup-logs.js [options]

Options:
  -d, --dry-run       Show what would be deleted without actually deleting
  -n, --no-archive    Don't clean up archived files
  -r, --retention N   Delete archives older than N days (default: 90)
  -i, --interactive   Confirm actions before executing
  -h, --help          Show this help message

Description:
  Cleans up log files and archives. Removes old archived logs,
  identifies large files, and reports storage usage.

Features:
  • Configurable archive retention period
  • Large file detection (>100MB)
  • Dry run mode for safe testing
  • Interactive confirmation mode
  • Comprehensive statistics reporting
  • Space usage optimization suggestions

Examples:
  node scripts/dev/cleanup-logs.js                          # Normal cleanup
  node scripts/dev/cleanup-logs.js --dry-run                 # Dry run only
  node scripts/dev/cleanup-logs.js --retention 30              # Keep 30 days
  node scripts/dev/cleanup-logs.js --interactive               # Interactive mode
`);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  
  if (options.interactive) {
    const confirmed = await confirmAction('Proceed with log cleanup?');
    if (!confirmed) {
      console.log('❌ Cleanup cancelled by user');
      return;
    }
  }
  
  await cleanupLogs(options);
  
  console.log('\n🎯 Log cleanup complete!');
  console.log('💡 Tip: Schedule regular cleanup with cron:');
  console.log('   0 3 * * 0 cd /path/to/moicad && node scripts/dev/cleanup-logs.js --retention 30');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanupLogs, CONFIG };