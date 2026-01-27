/**
 * MemoryMonitor - Dynamic memory tracking and leak detection
 *
 * Replaces static 1GB limit with adaptive thresholds that trigger optimization,
 * chunking, or abort based on memory pressure. Includes leak detection and
 * automatic cleanup mechanisms.
 */

import { logDebug, logInfo, logWarn, logError } from "./logger";

export interface MemoryThresholds {
  warning: number; // Trigger optimization (default: 500MB)
  chunking: number; // Start chunking (default: 750MB)
  hard: number; // Abort execution (default: 1GB)
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryPressure {
  level: "low" | "moderate" | "high" | "critical";
  shouldOptimize: boolean;
  shouldChunk: boolean;
  shouldAbort: boolean;
  recommendation: string;
}

export interface MemorySnapshot {
  timestamp: number;
  usage: MemoryUsage;
  pressure: MemoryPressure;
}

export interface LeakDetection {
  isLeak: boolean;
  confidence: number; // 0-1
  growthRate: number; // MB per second
  recommendation: string;
}

/**
 * MemoryMonitor provides real-time memory tracking and adaptive thresholds
 */
export class MemoryMonitor {
  private thresholds: MemoryThresholds;
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots: number = 20;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private baselineUsage: number | null = null;

  constructor(thresholds?: Partial<MemoryThresholds>) {
    this.thresholds = {
      warning: thresholds?.warning || 300 * 1024 * 1024, // 300MB - optimize early
      chunking: thresholds?.chunking || 500 * 1024 * 1024, // 500MB - chunk sooner for smoother UX
      hard: thresholds?.hard || 2000 * 1024 * 1024, // 2GB - very high but still chunk aggressively
    };

    logInfo("MemoryMonitor initialized (progressive loading mode)", {
      warningMB: Math.round(this.thresholds.warning / 1024 / 1024),
      chunkingMB: Math.round(this.thresholds.chunking / 1024 / 1024),
      hardMB: Math.round(this.thresholds.hard / 1024 / 1024),
      mode: "no-abort - uses chunking for all sizes",
    });
  }

  /**
   * Get current memory usage
   */
  getUsage(): MemoryUsage {
    const mem = process.memoryUsage();
    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
      arrayBuffers: mem.arrayBuffers || 0,
    };
  }

  /**
   * Get memory usage in MB for specific metric
   */
  getUsageMB(metric: keyof MemoryUsage = "heapUsed"): number {
    const usage = this.getUsage();
    return Math.round(usage[metric] / 1024 / 1024);
  }

  /**
   * Analyze current memory pressure
   * NOTE: Never aborts - uses chunking and optimization instead
   */
  analyzePressure(): MemoryPressure {
    const usage = this.getUsage();
    const heapUsed = usage.heapUsed;

    // CRITICAL: High memory but never abort - use aggressive chunking
    if (heapUsed >= this.thresholds.hard) {
      return {
        level: "critical",
        shouldOptimize: true,
        shouldChunk: true,
        shouldAbort: false, // Changed: Never abort, always try to continue
        recommendation:
          "Very high memory usage. Using aggressive chunking and optimization.",
      };
    }

    // HIGH: Start chunking to prevent further growth
    if (heapUsed >= this.thresholds.chunking) {
      return {
        level: "high",
        shouldOptimize: true,
        shouldChunk: true,
        shouldAbort: false,
        recommendation:
          "High memory usage. Using chunked evaluation for efficiency.",
      };
    }

    // MODERATE: Optimize but don't chunk yet
    if (heapUsed >= this.thresholds.warning) {
      return {
        level: "moderate",
        shouldOptimize: true,
        shouldChunk: false,
        shouldAbort: false,
        recommendation:
          "Moderate memory usage. Applying optimization strategies.",
      };
    }

    // LOW: Normal operation
    return {
      level: "low",
      shouldOptimize: false,
      shouldChunk: false,
      shouldAbort: false,
      recommendation: "Memory usage is normal.",
    };
  }

  /**
   * Check if memory should trigger optimization
   */
  shouldOptimize(): boolean {
    return this.analyzePressure().shouldOptimize;
  }

  /**
   * Check if memory should trigger chunking
   */
  shouldChunk(): boolean {
    return this.analyzePressure().shouldChunk;
  }

  /**
   * Check if memory limit is exceeded (should abort)
   */
  isLimitExceeded(): boolean {
    return this.analyzePressure().shouldAbort;
  }

  /**
   * Take memory snapshot for leak detection
   */
  takeSnapshot(): MemorySnapshot {
    const usage = this.getUsage();
    const pressure = this.analyzePressure();

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      usage,
      pressure,
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Detect memory leaks based on growth patterns
   */
  detectLeaks(): LeakDetection {
    if (this.snapshots.length < 5) {
      return {
        isLeak: false,
        confidence: 0,
        growthRate: 0,
        recommendation: "Not enough data for leak detection (need 5+ samples).",
      };
    }

    // Calculate memory growth rate
    const recent = this.snapshots.slice(-5);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];

    if (!oldest || !newest) {
      return {
        isLeak: false,
        confidence: 0,
        growthRate: 0,
        recommendation: "Invalid snapshot data for leak detection.",
      };
    }

    const timeDiffSeconds = (newest.timestamp - oldest.timestamp) / 1000;
    const memoryDiffBytes = newest.usage.heapUsed - oldest.usage.heapUsed;
    const growthRateMBPerSecond =
      memoryDiffBytes / 1024 / 1024 / timeDiffSeconds;

    // Check for consistent growth pattern
    let growthCount = 0;
    for (let i = 1; i < recent.length; i++) {
      const current = recent[i];
      const previous = recent[i - 1];
      if (current && previous && current.usage.heapUsed > previous.usage.heapUsed) {
        growthCount++;
      }
    }

    const consistency = growthCount / (recent.length - 1);

    // Leak criteria: consistent growth > 5MB/sec
    const isLeak = consistency > 0.7 && growthRateMBPerSecond > 5;
    const confidence = consistency * Math.min(growthRateMBPerSecond / 10, 1);

    let recommendation = "Memory usage is stable.";
    if (isLeak) {
      recommendation = `Potential memory leak detected (${growthRateMBPerSecond.toFixed(2)}MB/s growth). Check for unreleased buffers, unclosed connections, or growing caches.`;
    } else if (growthRateMBPerSecond > 2) {
      recommendation = `Memory growing slowly (${growthRateMBPerSecond.toFixed(2)}MB/s). Monitor for potential leaks.`;
    }

    if (isLeak) {
      logWarn("Memory leak detected", {
        growthRateMBPerSecond: growthRateMBPerSecond.toFixed(2),
        confidence: (confidence * 100).toFixed(1) + "%",
      });
    }

    return {
      isLeak,
      confidence,
      growthRate: growthRateMBPerSecond,
      recommendation,
    };
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): boolean {
    if (global.gc) {
      const before = this.getUsageMB();
      global.gc();
      const after = this.getUsageMB();
      const freed = before - after;

      if (freed > 0) {
        logInfo("Garbage collection completed", {
          freedMB: freed,
          beforeMB: before,
          afterMB: after,
        });
      }

      return true;
    }

    logWarn(
      "Garbage collection not available. Run with --expose-gc flag to enable."
    );
    return false;
  }

  /**
   * Force memory cleanup (GC + buffer pool cleanup)
   */
  async forceCleanup(): Promise<void> {
    logInfo("Starting forced memory cleanup");

    // Import buffer pool dynamically to avoid circular dependencies
    const { bufferPool } = await import("../utils/buffer-pool");

    // Clean buffer pool
    bufferPool.cleanupLargeBuffers();

    // Force GC
    this.forceGC();

    // Take snapshot after cleanup
    const snapshot = this.takeSnapshot();

    logInfo("Forced cleanup completed", {
      heapUsedMB: Math.round(snapshot.usage.heapUsed / 1024 / 1024),
      pressureLevel: snapshot.pressure.level,
    });
  }

  /**
   * Set baseline memory usage for growth tracking
   */
  setBaseline(): void {
    this.baselineUsage = this.getUsage().heapUsed;
    logDebug("Memory baseline set", {
      baselineMB: Math.round(this.baselineUsage / 1024 / 1024),
    });
  }

  /**
   * Get memory growth since baseline
   */
  getGrowthSinceBaseline(): number {
    if (!this.baselineUsage) {
      return 0;
    }
    const current = this.getUsage().heapUsed;
    return Math.round((current - this.baselineUsage) / 1024 / 1024);
  }

  /**
   * Start continuous monitoring with interval
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      logWarn("Monitoring already started");
      return;
    }

    this.setBaseline();

    this.monitoringInterval = setInterval(() => {
      const snapshot = this.takeSnapshot();

      // Log warnings on high memory
      if (snapshot.pressure.level === "high") {
        logWarn("High memory pressure detected", {
          heapUsedMB: Math.round(snapshot.usage.heapUsed / 1024 / 1024),
          recommendation: snapshot.pressure.recommendation,
        });
      } else if (snapshot.pressure.level === "critical") {
        logError("Critical memory pressure!", {
          heapUsedMB: Math.round(snapshot.usage.heapUsed / 1024 / 1024),
          recommendation: snapshot.pressure.recommendation,
        });
      }

      // Check for leaks periodically
      if (this.snapshots.length >= 5 && this.snapshots.length % 5 === 0) {
        this.detectLeaks();
      }

      logDebug("Memory monitor snapshot", {
        heapUsedMB: Math.round(snapshot.usage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(snapshot.usage.heapTotal / 1024 / 1024),
        pressureLevel: snapshot.pressure.level,
        growthSinceBaselineMB: this.getGrowthSinceBaseline(),
      });
    }, intervalMs);

    logInfo("Memory monitoring started", {
      intervalMs,
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logInfo("Memory monitoring stopped");
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    current: MemoryUsage;
    pressure: MemoryPressure;
    baseline: number | null;
    growth: number;
    leak: LeakDetection;
  } {
    return {
      current: this.getUsage(),
      pressure: this.analyzePressure(),
      baseline: this.baselineUsage,
      growth: this.getGrowthSinceBaseline(),
      leak: this.detectLeaks(),
    };
  }

  /**
   * Reset all monitoring state
   */
  reset(): void {
    this.snapshots = [];
    this.baselineUsage = null;
    this.stopMonitoring();
    logInfo("MemoryMonitor reset");
  }
}

/**
 * Global memory monitor instance
 */
export const memoryMonitor = new MemoryMonitor();
