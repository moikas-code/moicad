/**
 * Minimal memory monitor for SDK
 * Returns safe defaults - actual memory monitoring can be done by consuming apps
 */

export interface MemoryThresholds {
  warning: number;
  chunking: number;
  hard: number;
}

export interface MemoryUsage {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryPressure {
  level: 'low' | 'moderate' | 'high' | 'critical';
  shouldOptimize: boolean;
  shouldChunk: boolean;
  shouldAbort: boolean;
  recommendation: string;
}

/**
 * Minimal MemoryMonitor - always returns safe defaults
 */
export class MemoryMonitor {
  constructor(_thresholds?: Partial<MemoryThresholds>) {
    // No-op - SDK doesn't need actual memory monitoring
  }

  getUsage(): MemoryUsage {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      return {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        rss: mem.rss,
        arrayBuffers: (mem as any).arrayBuffers || 0,
      };
    }
    // Browser or unknown environment
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
      arrayBuffers: 0,
    };
  }

  getUsageMB(metric: keyof MemoryUsage = 'heapUsed'): number {
    const usage = this.getUsage();
    return Math.round(usage[metric] / 1024 / 1024);
  }

  analyzePressure(): MemoryPressure {
    // Always return low pressure - SDK consumers handle their own limits
    return {
      level: 'low',
      shouldOptimize: false,
      shouldChunk: false,
      shouldAbort: false,
      recommendation: 'Memory usage is normal.',
    };
  }

  shouldOptimize(): boolean {
    return false;
  }

  shouldChunk(): boolean {
    return false;
  }

  isLimitExceeded(): boolean {
    return false;
  }

  forceGC(): boolean {
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc();
      return true;
    }
    return false;
  }

  async forceCleanup(): Promise<void> {
    this.forceGC();
  }

  setBaseline(): void {}
  getGrowthSinceBaseline(): number { return 0; }
  startMonitoring(_intervalMs?: number): void {}
  stopMonitoring(): void {}
  reset(): void {}
}

export const memoryMonitor = new MemoryMonitor();
