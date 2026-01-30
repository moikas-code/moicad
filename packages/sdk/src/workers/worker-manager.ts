/**
 * Worker Manager for @moicad/sdk
 * 
 * Manages the CSG Web Worker lifecycle and provides a clean API for the GUI.
 * Handles worker creation, message passing, progress callbacks, and error recovery.
 * Falls back to main thread evaluation if Web Workers aren't supported.
 */

import type { Geometry, EvaluateResult, RenderProgress, RenderStage } from '../types/geometry-types';

export interface WorkerManagerOptions {
  /** Timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Detail level for progress updates */
  progressDetail?: 'simple' | 'detailed';
  /** Callback for progress updates */
  onProgress?: (progress: RenderProgress) => void;
  /** Whether to use main thread fallback if workers aren't available */
  allowMainThreadFallback?: boolean;
}

export interface EvaluationJob {
  id: string;
  code: string;
  language: 'javascript' | 'openscad';
  timeout: number;
  t?: number;
  progressDetail: 'simple' | 'detailed';
  resolve: (result: EvaluateResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: RenderProgress) => void;
}

/**
 * Manages CSG Web Worker for non-blocking evaluation
 */
export class WorkerManager {
  private worker: Worker | null = null;
  private jobs: Map<string, EvaluationJob> = new Map();
  private isInitialized = false;
  private defaultTimeout = 60000; // 60 seconds default
  private defaultProgressDetail: 'simple' | 'detailed' = 'simple';
  private allowFallback = true;
  private workerUrl: string;

  constructor(options?: WorkerManagerOptions) {
    this.defaultTimeout = options?.timeout ?? 60000;
    this.defaultProgressDetail = options?.progressDetail ?? 'simple';
    this.allowFallback = options?.allowMainThreadFallback ?? true;
    
    // Determine worker URL - in production, this should be built and served
    if (typeof window !== 'undefined') {
      // Try to find the worker file - in dev mode, it might be served from different paths
      this.workerUrl = '/csg-worker.js';
    } else {
      this.workerUrl = '';
    }
  }

  /**
   * Initialize the worker
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    // Check if Web Workers are supported
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, will use main thread fallback');
      this.isInitialized = true;
      return false;
    }

    try {
      // Create worker with error handling
      this.worker = new Worker(this.workerUrl, { type: 'module' });
      
      // Set up message handler
      this.worker.onmessage = (event) => this.handleMessage(event.data);
      this.worker.onerror = (error) => this.handleWorkerError(error);
      
      // Wait for initialization confirmation
      const initialized = await this.pingWorker();
      
      if (initialized) {
        this.isInitialized = true;
        console.log('CSG Worker initialized successfully');
        return true;
      } else {
        throw new Error('Worker failed to initialize');
      }
    } catch (error) {
      console.warn('Failed to initialize worker:', error);
      this.worker = null;
      
      if (this.allowFallback) {
        console.log('Using main thread fallback');
        this.isInitialized = true;
        return false;
      } else {
        throw error;
      }
    }
  }

  /**
   * Ping worker to check if it's alive
   */
  private pingWorker(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.worker) {
        resolve(false);
        return;
      }

      const pingId = `ping_${Date.now()}`;
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000);

      const handler = (event: MessageEvent) => {
        if (event.data.id === pingId && event.data.type === 'PONG') {
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', handler);
          resolve(true);
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({
        type: 'PING',
        id: pingId
      });
    });
  }

  /**
   * Evaluate code using worker or main thread fallback
   */
  async evaluate(
    code: string,
    language: 'javascript' | 'openscad',
    options?: Partial<WorkerManagerOptions> & { t?: number }
  ): Promise<EvaluateResult> {
    // Ensure initialized
    if (!this.isInitialized) {
      await this.initialize();
    }

    const timeout = options?.timeout ?? this.defaultTimeout;
    const progressDetail = options?.progressDetail ?? this.defaultProgressDetail;
    const t = options?.t;

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const job: EvaluationJob = {
        id: jobId,
        code,
        language,
        timeout,
        t,
        progressDetail,
        resolve,
        reject,
        onProgress: options?.onProgress
      };

      this.jobs.set(jobId, job);

      // Use worker if available
      if (this.worker) {
        this.worker.postMessage({
          type: 'EVALUATE',
          id: jobId,
          payload: {
            code,
            language,
            timeout,
            t,
            progressDetail
          }
        });

        // Set up job timeout
        setTimeout(() => {
          if (this.jobs.has(jobId)) {
            this.cancel(jobId);
            reject(new Error(`Evaluation timeout after ${timeout}ms`));
          }
        }, timeout);
      } else {
        // Use main thread fallback
        this.evaluateInMainThread(job);
      }
    });
  }

  /**
   * Evaluate in main thread (fallback)
   */
  private async evaluateInMainThread(job: EvaluationJob): Promise<void> {
    try {
      let result: EvaluateResult;

      if (job.language === 'javascript') {
        const { evaluateJavaScript } = await import('../runtime/index');
        result = await evaluateJavaScript(job.code, {
          timeout: job.timeout,
          t: job.t
        });
      } else {
        const { SCAD } = await import('../scad/index');
        const parseResult = SCAD.parse(job.code);
        
        if (!parseResult.success || !parseResult.ast) {
          result = {
            geometry: null,
            errors: parseResult.errors.map((e: any) => ({
              message: e.message,
              line: e.line,
              column: e.column,
              category: 'syntax',
              severity: 'error'
            })),
            success: false,
            executionTime: 0
          };
        } else {
          const evalResult = await SCAD.evaluate(parseResult.ast);
          result = evalResult;
        }
      }

      // Clean up job
      this.jobs.delete(job.id);
      job.resolve(result);
    } catch (error) {
      this.jobs.delete(job.id);
      job.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Handle messages from worker
   */
  private handleMessage(data: any): void {
    const { id, type, payload } = data;
    const job = this.jobs.get(id);

    if (!job && id !== 'init') {
      console.warn('Received message for unknown job:', id);
      return;
    }

    switch (type) {
      case 'SUCCESS':
        if (job) {
          this.jobs.delete(id);
          job.resolve(payload as EvaluateResult);
        }
        break;

      case 'ERROR':
        if (job) {
          this.jobs.delete(id);
          const errorResult = payload as EvaluateResult;
          const error = new Error(errorResult.errors?.[0]?.message || 'Unknown error');
          job.reject(error);
        }
        break;

      case 'PROGRESS':
        if (job && job.onProgress) {
          job.onProgress(payload as RenderProgress);
        }
        break;

      case 'PONG':
        // Ping response handled separately
        break;

      default:
        console.warn('Unknown message type from worker:', type);
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
    
    // Reject all pending jobs
    this.jobs.forEach((job) => {
      job.reject(new Error(`Worker error: ${error.message}`));
    });
    this.jobs.clear();

    // Terminate and recreate worker if possible
    this.terminate();
  }

  /**
   * Cancel a specific job
   */
  cancel(jobId?: string): void {
    if (jobId) {
      // Cancel specific job
      const job = this.jobs.get(jobId);
      if (job) {
        if (this.worker) {
          this.worker.postMessage({
            type: 'CANCEL',
            id: jobId
          });
        }
        this.jobs.delete(jobId);
        job.reject(new Error('Cancelled by user'));
      }
    } else {
      // Cancel all jobs
      this.jobs.forEach((job) => {
        job.reject(new Error('All operations cancelled'));
      });
      this.jobs.clear();
      
      if (this.worker) {
        this.worker.postMessage({
          type: 'CANCEL',
          id: 'all'
        });
      }
    }
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    // Cancel all pending jobs
    this.cancel();
    
    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.isInitialized = false;
    console.log('Worker terminated');
  }

  /**
   * Check if worker is available
   */
  isWorkerAvailable(): boolean {
    return this.worker !== null && this.isInitialized;
  }

  /**
   * Get number of pending jobs
   */
  getPendingJobCount(): number {
    return this.jobs.size;
  }
}

// Export singleton instance
export const workerManager = new WorkerManager();

// Also export factory function for custom instances
export function createWorkerManager(options?: WorkerManagerOptions): WorkerManager {
  return new WorkerManager(options);
}
