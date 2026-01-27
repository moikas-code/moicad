/**
 * Minimal buffer pool for SDK
 * Provides basic buffer reuse without complex pooling
 */

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
 * Minimal BufferPool - just creates new buffers without actual pooling
 * Pooling can be added by consuming apps if needed
 */
export class BufferPool {
  private static instance: BufferPool | null = null;

  static getInstance(): BufferPool {
    if (!BufferPool.instance) {
      BufferPool.instance = new BufferPool();
    }
    return BufferPool.instance;
  }

  static resetInstance(): void {
    BufferPool.instance = null;
  }

  getVertexBuffer(size: number): Float32Array {
    return new Float32Array(size);
  }

  getIndexBuffer(size: number): Uint32Array {
    return new Uint32Array(size);
  }

  getNormalBuffer(size: number): Float32Array {
    return new Float32Array(size);
  }

  returnVertexBuffer(_buffer: Float32Array): void {
    // No-op - let GC handle it
  }

  returnIndexBuffer(_buffer: Uint32Array): void {
    // No-op - let GC handle it
  }

  returnNormalBuffer(_buffer: Float32Array): void {
    // No-op - let GC handle it
  }

  returnBuffers(
    _vertices?: Float32Array,
    _indices?: Uint32Array,
    _normals?: Float32Array
  ): void {
    // No-op - let GC handle it
  }

  getStats(): PoolStats {
    return {
      vertexPoolSize: 0,
      indexPoolSize: 0,
      normalPoolSize: 0,
      totalBuffersPooled: 0,
      memoryUsageBytes: 0,
      hitRate: 0,
      missRate: 1,
    };
  }

  cleanup(): void {}
  cleanupLargeBuffers(_sizeThresholdBytes?: number): void {}
  shutdown(): void {}
}

export const bufferPool = BufferPool.getInstance();
