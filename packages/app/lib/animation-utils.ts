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
