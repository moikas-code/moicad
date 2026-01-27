/**
 * BufferPool - Memory-efficient TypedArray pooling for geometry operations
 *
 * Eliminates repeated Array.from() conversions that double memory usage during
 * geometry serialization. Provides reusable buffer pools with automatic cleanup.
 */

import { logDebug, logInfo, logWarn } from "../core/logger";

export interface BufferPoolConfig {
  maxSize: number; // Maximum buffers to pool per type
  cleanupInterval: number; // Cleanup interval in ms
  enableAutoCleanup: boolean; // Auto cleanup on memory pressure
}

export interface PoolStats {
  vertexPoolSize: number;
  indexPoolSize: number;
  normalPoolSize: number;
  totalBuffersPooled: number;
  memoryUsageBytes: number;
  hitRate: number;
  missRate: number;
}

/**
 * BufferPool manages reusable TypedArray buffers to reduce memory allocation overhead
 */
export class BufferPool {
  private static instance: BufferPool | null = null;

  private vertexPools: Map<number, Float32Array[]> = new Map();
  private indexPools: Map<number, Uint32Array[]> = new Map();
  private normalPools: Map<number, Float32Array[]> = new Map();

  private config: BufferPoolConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  // Statistics tracking
  private stats = {
    hits: 0,
    misses: 0,
    allocations: 0,
    returns: 0,
  };

  constructor(config?: Partial<BufferPoolConfig>) {
    this.config = {
      maxSize: config?.maxSize || 50,
      cleanupInterval: config?.cleanupInterval || 30000, // 30 seconds
      enableAutoCleanup: config?.enableAutoCleanup ?? true,
    };

    if (this.config.enableAutoCleanup) {
      this.startCleanupTimer();
    }

    logInfo("BufferPool initialized", {
      maxSize: this.config.maxSize,
      cleanupInterval: this.config.cleanupInterval,
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<BufferPoolConfig>): BufferPool {
    if (!BufferPool.instance) {
      BufferPool.instance = new BufferPool(config);
    }
    return BufferPool.instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static resetInstance(): void {
    if (BufferPool.instance) {
      BufferPool.instance.shutdown();
      BufferPool.instance = null;
    }
  }

  /**
   * Get a vertex buffer (Float32Array) from the pool or create new
   */
  getVertexBuffer(size: number): Float32Array {
    return this.getBuffer(this.vertexPools, size, Float32Array);
  }

  /**
   * Get an index buffer (Uint32Array) from the pool or create new
   */
  getIndexBuffer(size: number): Uint32Array {
    return this.getBuffer(this.indexPools, size, Uint32Array);
  }

  /**
   * Get a normal buffer (Float32Array) from the pool or create new
   */
  getNormalBuffer(size: number): Float32Array {
    return this.getBuffer(this.normalPools, size, Float32Array);
  }

  /**
   * Generic buffer getter with pooling
   */
  private getBuffer<T extends Float32Array | Uint32Array>(
    pool: Map<number, T[]>,
    size: number,
    BufferType: new (size: number) => T
  ): T {
    const sizePool = pool.get(size);

    if (sizePool && sizePool.length > 0) {
      const buffer = sizePool.pop()!;
      this.stats.hits++;
      logDebug("BufferPool: Reusing buffer", { size, type: BufferType.name });
      return buffer;
    }

    // No buffer available, create new
    this.stats.misses++;
    this.stats.allocations++;
    logDebug("BufferPool: Creating new buffer", { size, type: BufferType.name });
    return new BufferType(size);
  }

  /**
   * Return vertex buffer to pool for reuse
   */
  returnVertexBuffer(buffer: Float32Array): void {
    this.returnBuffer(this.vertexPools, buffer);
  }

  /**
   * Return index buffer to pool for reuse
   */
  returnIndexBuffer(buffer: Uint32Array): void {
    this.returnBuffer(this.indexPools, buffer);
  }

  /**
   * Return normal buffer to pool for reuse
   */
  returnNormalBuffer(buffer: Float32Array): void {
    this.returnBuffer(this.normalPools, buffer);
  }

  /**
   * Generic buffer return with pooling
   */
  private returnBuffer<T extends Float32Array | Uint32Array>(
    pool: Map<number, T[]>,
    buffer: T
  ): void {
    const size = buffer.length;
    let sizePool = pool.get(size);

    if (!sizePool) {
      sizePool = [];
      pool.set(size, sizePool);
    }

    // Check if pool is at max capacity
    if (sizePool.length >= this.config.maxSize) {
      logDebug("BufferPool: Pool at capacity, discarding buffer", {
        size,
        poolSize: sizePool.length,
      });
      return;
    }

    // Clear buffer data before returning to pool
    buffer.fill(0);
    sizePool.push(buffer);
    this.stats.returns++;

    logDebug("BufferPool: Buffer returned to pool", {
      size,
      poolSize: sizePool.length,
    });
  }

  /**
   * Return all buffers at once (convenience method)
   */
  returnBuffers(
    vertices?: Float32Array,
    indices?: Uint32Array,
    normals?: Float32Array
  ): void {
    if (vertices) this.returnVertexBuffer(vertices);
    if (indices) this.returnIndexBuffer(indices);
    if (normals) this.returnNormalBuffer(normals);
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const totalBuffers =
      this.getTotalBuffersInPool(this.vertexPools) +
      this.getTotalBuffersInPool(this.indexPools) +
      this.getTotalBuffersInPool(this.normalPools);

    const memoryUsage =
      this.getPoolMemoryUsage(this.vertexPools, 4) + // Float32 = 4 bytes
      this.getPoolMemoryUsage(this.indexPools, 4) + // Uint32 = 4 bytes
      this.getPoolMemoryUsage(this.normalPools, 4); // Float32 = 4 bytes

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0;

    return {
      vertexPoolSize: this.getTotalBuffersInPool(this.vertexPools),
      indexPoolSize: this.getTotalBuffersInPool(this.indexPools),
      normalPoolSize: this.getTotalBuffersInPool(this.normalPools),
      totalBuffersPooled: totalBuffers,
      memoryUsageBytes: memoryUsage,
      hitRate,
      missRate,
    };
  }

  /**
   * Calculate total buffers in pool
   */
  private getTotalBuffersInPool<T>(pool: Map<number, T[]>): number {
    let total = 0;
    for (const buffers of pool.values()) {
      total += buffers.length;
    }
    return total;
  }

  /**
   * Calculate memory usage of pool
   */
  private getPoolMemoryUsage<T extends Float32Array | Uint32Array>(
    pool: Map<number, T[]>,
    bytesPerElement: number
  ): number {
    let total = 0;
    for (const [size, buffers] of pool.entries()) {
      total += size * bytesPerElement * buffers.length;
    }
    return total;
  }

  /**
   * Clear all pools (memory pressure cleanup)
   */
  cleanup(): void {
    const statsBefore = this.getStats();

    this.vertexPools.clear();
    this.indexPools.clear();
    this.normalPools.clear();

    logInfo("BufferPool: Cleanup completed", {
      buffersCleared: statsBefore.totalBuffersPooled,
      memoryFreedMB: Math.round(statsBefore.memoryUsageBytes / 1024 / 1024),
    });
  }

  /**
   * Clear buffers above size threshold (selective cleanup)
   */
  cleanupLargeBuffers(sizeThresholdBytes: number = 1024 * 1024): void {
    // 1MB default
    let buffersCleared = 0;

    const clearLarge = <T extends Float32Array | Uint32Array>(
      pool: Map<number, T[]>,
      bytesPerElement: number
    ) => {
      for (const [size, buffers] of pool.entries()) {
        const bufferSize = size * bytesPerElement;
        if (bufferSize > sizeThresholdBytes) {
          buffersCleared += buffers.length;
          pool.delete(size);
        }
      }
    };

    clearLarge(this.vertexPools, 4);
    clearLarge(this.indexPools, 4);
    clearLarge(this.normalPools, 4);

    if (buffersCleared > 0) {
      logInfo("BufferPool: Large buffers cleared", {
        buffersCleared,
        thresholdMB: Math.round(sizeThresholdBytes / 1024 / 1024),
      });
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const stats = this.getStats();

      // Auto-cleanup if memory usage exceeds 100MB
      if (stats.memoryUsageBytes > 100 * 1024 * 1024) {
        logWarn("BufferPool: Auto-cleanup triggered", {
          memoryUsageMB: Math.round(stats.memoryUsageBytes / 1024 / 1024),
        });
        this.cleanupLargeBuffers();
      }

      // Log stats periodically
      logDebug("BufferPool stats", {
        ...stats,
        memoryUsageMB: Math.round(stats.memoryUsageBytes / 1024 / 1024),
      });
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer and clear pools
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cleanup();
    logInfo("BufferPool: Shutdown completed");
  }
}

/**
 * Global buffer pool instance (singleton pattern)
 */
export const bufferPool = BufferPool.getInstance();
