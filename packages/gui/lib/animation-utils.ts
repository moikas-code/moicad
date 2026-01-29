/**
 * Animation Utilities for moicad App
 *
 * Provides:
 * - Animation detection (detects export default function(t))
 * - Frame cache with LRU eviction
 * - Animation export utilities (GIF, WebM)
 * - Frame calculation helpers
 */

/**
 * Detect if code exports an animation function
 *
 * Checks for:
 * - export default function(t) { ... }
 * - export default (t) => { ... }
 * - export default async function(t) { ... }
 *
 * @param code - Source code to analyze
 * @param language - Language ('javascript' or 'openscad')
 * @returns true if code appears to be an animation
 */
export function detectAnimation(code: string, language: string = 'javascript'): boolean {
  if (language === 'javascript') {
    // Match: export default function(t) or export default (t) =>
    const patterns = [
      /export\s+default\s+(?:async\s+)?function\s*\(\s*t\s*\)/, // function declaration
      /export\s+default\s+(?:async\s+)?\(\s*t\s*\)\s*=>/, // arrow function
      /export\s+default\s+function\s+\w+\s*\(\s*t\s*\)/, // named function
    ];

    return patterns.some(pattern => pattern.test(code));
  }

  if (language === 'openscad') {
    // Match: $t variable usage
    return /\$t\b/.test(code);
  }

  return false;
}

/**
 * Calculate total frames from FPS and duration
 *
 * @param fps - Frames per second (15, 24, 30, 60)
 * @param duration - Duration in milliseconds
 * @returns Total number of frames
 */
export function calculateTotalFrames(fps: number, duration: number): number {
  return Math.max(1, Math.floor((duration / 1000) * fps));
}

/**
 * Calculate t value from frame number
 *
 * t ranges from 0 to 1, where:
 * - t=0 is frame 0
 * - t=1 is the last frame
 *
 * @param currentFrame - Current frame number (0-indexed)
 * @param totalFrames - Total number of frames
 * @returns t value (0-1)
 */
export function calculateTValue(currentFrame: number, totalFrames: number): number {
  if (totalFrames <= 1) {
    return 0;
  }
  return currentFrame / (totalFrames - 1);
}

/**
 * Calculate frame from t value
 *
 * @param t - Animation time value (0-1)
 * @param totalFrames - Total number of frames
 * @returns Frame number (0-indexed)
 */
export function calculateFrame(t: number, totalFrames: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return Math.round(clamped * (totalFrames - 1));
}

/**
 * Frame cache with LRU (Least Recently Used) eviction
 *
 * Stores rendered frames to avoid re-computing the same frame
 * Uses LRU eviction to limit memory usage
 */
export class FrameCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Generate cache key from code and t value
   * Uses simple hash to avoid storing large code strings
   */
  private getKey(code: string, t: number): string {
    // Create a simple hash of the code
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Round t to 3 decimal places for stability
    const tRounded = Math.round(t * 1000) / 1000;
    return `${hash}_${tRounded}`;
  }

  /**
   * Get cached frame
   */
  get(code: string, t: number): any | undefined {
    const key = this.getKey(code, t);
    const entry = this.cache.get(key);

    if (entry) {
      // Mark as recently used
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      return entry.geometry;
    }

    return undefined;
  }

  /**
   * Set cached frame
   */
  set(code: string, t: number, geometry: any): void {
    const key = this.getKey(code, t);

    // Remove if already exists (will re-add to end of access order)
    if (this.cache.has(key)) {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
    }

    // Add to cache
    this.cache.set(key, { geometry, timestamp: Date.now() });
    this.accessOrder.push(key);

    // Evict LRU entries if over capacity
    while (this.cache.size > this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }

  /**
   * Clear all cached frames
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache stats for debugging
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

interface CacheEntry {
  geometry: any;
  timestamp: number;
}

/**
 * Export settings for animation
 */
export interface ExportSettings {
  format: 'gif' | 'webm';
  width: number;
  height: number;
  fps: number;
  quality: number; // 0-100
  loop: boolean;
}

/**
 * Estimate file size for animation export
 *
 * Provides rough estimate before export starts
 *
 * @param settings - Export settings
 * @param duration - Animation duration in milliseconds
 * @returns Estimated file size in bytes
 */
export function estimateFileSize(settings: ExportSettings, duration: number): number {
  const frames = Math.floor((duration / 1000) * settings.fps);
  const pixels = settings.width * settings.height;

  if (settings.format === 'gif') {
    // GIF is roughly: frames * pixels * quality-dependent compression
    // Ranges from 0.3 to 2 bytes per pixel depending on quality
    const bytesPerPixel = 0.5 + (settings.quality / 100) * 1.5;
    return Math.round(frames * pixels * bytesPerPixel);
  } else if (settings.format === 'webm') {
    // WebM bitrate: lower quality = lower bitrate
    const bitrate = 2000000 + (settings.quality / 100) * 6000000; // 2-8 Mbps
    return Math.round((duration / 1000) * (bitrate / 8));
  }

  return 0;
}

/**
 * Format bytes as human-readable size
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate export settings
 *
 * @param settings - Settings to validate
 * @returns Array of error messages (empty if valid)
 */
export function validateExportSettings(settings: ExportSettings): string[] {
  const errors: string[] = [];

  if (settings.width < 320) errors.push('Width must be at least 320px');
  if (settings.width > 4096) errors.push('Width must be at most 4096px');
  if (settings.height < 240) errors.push('Height must be at least 240px');
  if (settings.height > 4096) errors.push('Height must be at most 4096px');

  if (![15, 24, 30, 60].includes(settings.fps)) {
    errors.push('FPS must be 15, 24, 30, or 60');
  }

  if (settings.quality < 0 || settings.quality > 100) {
    errors.push('Quality must be between 0 and 100');
  }

  if (!['gif', 'webm'].includes(settings.format)) {
    errors.push('Format must be gif or webm');
  }

  return errors;
}

/**
 * Animation state management helper
 */
export interface AnimationState {
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;
  fps: number;
  duration: number;
  loop: boolean;
  t: number;
  error: string | null;
}

/**
 * Create initial animation state
 */
export function createInitialAnimationState(
  duration: number = 2000,
  fps: number = 30
): AnimationState {
  const totalFrames = calculateTotalFrames(fps, duration);
  return {
    isPlaying: false,
    isPaused: false,
    currentFrame: 0,
    totalFrames,
    fps,
    duration,
    loop: false,
    t: 0,
    error: null,
  };
}

/**
 * Update frame with boundary checking
 */
export function updateFrame(
  currentFrame: number,
  totalFrames: number,
  loop: boolean
): { nextFrame: number; isComplete: boolean } {
  let nextFrame = currentFrame + 1;
  let isComplete = false;

  if (nextFrame >= totalFrames) {
    if (loop) {
      nextFrame = 0;
    } else {
      nextFrame = totalFrames - 1;
      isComplete = true;
    }
  }

  return { nextFrame, isComplete };
}

/**
 * Frame capture state for animation export
 */
export interface FrameCapture {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  frameData: ImageData[];
}

/**
 * Initialize canvas for frame capture
 *
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Canvas and 2D context
 */
export function initializeFrameCapture(
  width: number,
  height: number
): FrameCapture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get 2D context from canvas');
  }

  return {
    canvas,
    context,
    frameData: [],
  };
}

/**
 * Capture a frame from a canvas
 *
 * @param sourceCanvas - Source canvas to capture from
 * @param targetCapture - Target capture state
 */
export function captureFrame(
  sourceCanvas: HTMLCanvasElement,
  targetCapture: FrameCapture
): void {
  const sourceContext = sourceCanvas.getContext('2d');
  if (!sourceContext) {
    throw new Error('Could not get 2D context from source canvas');
  }

  // Copy frame data
  targetCapture.context.drawImage(sourceCanvas, 0, 0);
  const imageData = targetCapture.context.getImageData(
    0,
    0,
    targetCapture.canvas.width,
    targetCapture.canvas.height
  );
  targetCapture.frameData.push(imageData);
}

/**
 * Encode frames as WebM using MediaRecorder API
 *
 * @param frameData - Array of captured frames
 * @param fps - Frames per second
 * @param loop - Whether animation should loop
 * @returns Promise that resolves to Blob
 */
export async function encodeWebM(
  frameData: ImageData[],
  fps: number = 30,
  loop: boolean = false
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (frameData.length === 0) {
      reject(new Error('No frames to encode'));
      return;
    }

    const width = frameData[0].width;
    const height = frameData[0].height;
    const frameDuration = 1000 / fps; // milliseconds per frame

    // Create temporary canvas for MediaRecorder
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get 2D context'));
      return;
    }

    // Get video codec options
    const options = {
      videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      mimeType: 'video/webm;codecs=vp9',
    };

    // Fallback to vp8 if vp9 not supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8';
    }

    // Fall back to h264 if webm not supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/mp4';
    }

    try {
      const chunks: Blob[] = [];
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: options.mimeType,
        videoBitsPerSecond: options.videoBitsPerSecond,
      });

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: options.mimeType });
        resolve(blob);
      };

      recorder.onerror = (event) => {
        reject(new Error(`Recording error: ${event.error}`));
      };

      recorder.start();

      // Play frames through the stream
      let frameIndex = 0;
      const frameInterval = setInterval(() => {
        if (frameIndex >= frameData.length) {
          clearInterval(frameInterval);
          recorder.stop();
          return;
        }

        ctx.putImageData(frameData[frameIndex], 0, 0);
        frameIndex++;
      }, frameDuration);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Encode frames as GIF using gif.js library
 *
 * Note: This requires gif.js to be loaded separately
 * You can add: <script src="https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js"></script>
 *
 * @param frameData - Array of captured frames
 * @param fps - Frames per second
 * @param loop - Whether animation should loop
 * @returns Promise that resolves to Blob
 */
export async function encodeGif(
  frameData: ImageData[],
  fps: number = 30,
  loop: boolean = true
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (frameData.length === 0) {
      reject(new Error('No frames to encode'));
      return;
    }

    // Check if gif.js is available
    const GifLib = (window as any).GIF;
    if (!GifLib) {
      reject(
        new Error(
          'gif.js library not loaded. Add <script src="https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js"></script> to your HTML'
        )
      );
      return;
    }

    try {
      const width = frameData[0].width;
      const height = frameData[0].height;
      const frameDuration = Math.round(1000 / fps);

      const gif = new GifLib({
        workers: 2,
        quality: 10, // 1-30, lower is better quality but slower
        width,
        height,
        workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
      });

      // Add each frame
      frameData.forEach((frame) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(frame, 0, 0);
          gif.addFrame(canvas, { delay: frameDuration });
        }
      });

      // Set loop option
      if (!loop) {
        gif.options.numFrames = frameData.length;
      }

      gif.on('finished', function (blob: Blob) {
        resolve(blob);
      });

      gif.on('error', function (error: Error) {
        reject(error);
      });

      // Start rendering
      gif.render();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Export animation frames to file
 *
 * @param format - Export format ('webm' or 'gif')
 * @param frameData - Array of captured frames
 * @param fps - Frames per second
 * @param loop - Whether animation should loop
 * @param filename - Output filename
 */
export async function exportAnimationFrames(
  format: 'webm' | 'gif',
  frameData: ImageData[],
  fps: number = 30,
  loop: boolean = true,
  filename: string = `animation.${format}`
): Promise<void> {
  try {
    let blob: Blob;

    if (format === 'gif') {
      blob = await encodeGif(frameData, fps, loop);
    } else if (format === 'webm') {
      blob = await encodeWebM(frameData, fps, loop);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(
      `Failed to export animation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
