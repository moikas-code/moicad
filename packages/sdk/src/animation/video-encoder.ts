/**
 * Video Encoder - Encode captured frames to video (WebM/MP4)
 *
 * Uses the native MediaRecorder API for encoding.
 * WebM is widely supported, MP4 requires browser support.
 *
 * @example
 * ```typescript
 * const frames = await capture.captureAnimation(...);
 * const video = await encodeVideo(frames, {
 *   width: 800,
 *   height: 600,
 *   fps: 30,
 *   format: 'webm',
 * }, (percent) => console.log(`Encoding: ${percent}%`));
 *
 * // Download the video
 * downloadBlob(video, 'animation.webm');
 * ```
 */

import type { CapturedFrame } from './frame-capture';

export interface VideoOptions {
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Frames per second */
  fps: number;
  /** Video format */
  format: 'webm' | 'mp4';
  /** Video bitrate in bits per second (default: 5Mbps) */
  bitrate?: number;
  /** Video codec (default: auto-select based on format) */
  codec?: string;
}

export interface VideoEncoderSupport {
  webm: boolean;
  mp4: boolean;
  codecs: string[];
}

/**
 * Check browser support for video encoding
 */
export function checkVideoEncoderSupport(): VideoEncoderSupport {
  if (typeof MediaRecorder === 'undefined') {
    return { webm: false, mp4: false, codecs: [] };
  }

  const codecs: string[] = [];
  const testCodecs = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];

  for (const codec of testCodecs) {
    if (MediaRecorder.isTypeSupported(codec)) {
      codecs.push(codec);
    }
  }

  return {
    webm: codecs.some(c => c.includes('webm')),
    mp4: codecs.some(c => c.includes('mp4')),
    codecs,
  };
}

/**
 * Encode frames to video using canvas-based approach
 *
 * @param frames - Array of captured frames
 * @param options - Video encoding options
 * @param onProgress - Progress callback (0-100)
 * @returns Blob containing the video
 */
export async function encodeVideo(
  frames: CapturedFrame[],
  options: VideoOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  // Check support
  const support = checkVideoEncoderSupport();

  if (options.format === 'mp4' && !support.mp4) {
    throw new Error('MP4 encoding not supported in this browser. Try WebM instead.');
  }

  if (options.format === 'webm' && !support.webm) {
    throw new Error('WebM encoding not supported in this browser.');
  }

  // Create canvas for rendering frames
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d')!;

  // Get the best supported codec
  const mimeType = getBestCodec(options.format, support.codecs);

  // Create media stream from canvas
  const stream = canvas.captureStream(options.fps);

  // Create media recorder
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: options.bitrate || 5000000, // 5 Mbps default
  });

  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      onProgress?.(100);
      resolve(blob);
    };

    mediaRecorder.onerror = (e) => {
      reject(new Error(`MediaRecorder error: ${e}`));
    };

    // Start recording
    mediaRecorder.start();

    // Render frames at specified FPS
    const frameDelay = 1000 / options.fps;
    let frameIndex = 0;

    const renderNextFrame = async () => {
      if (frameIndex >= frames.length) {
        // Stop recording after small delay to ensure last frame is captured
        setTimeout(() => mediaRecorder.stop(), frameDelay * 2);
        return;
      }

      const frame = frames[frameIndex];

      try {
        // Load and draw frame
        const img = await loadImage(frame.dataUrl);
        ctx.clearRect(0, 0, options.width, options.height);
        ctx.drawImage(img, 0, 0, options.width, options.height);

        // Report progress
        onProgress?.(Math.round((frameIndex / frames.length) * 100));

        frameIndex++;

        // Schedule next frame
        setTimeout(renderNextFrame, frameDelay);
      } catch (error) {
        mediaRecorder.stop();
        reject(new Error(`Failed to render frame ${frameIndex}: ${error}`));
      }
    };

    // Start rendering frames
    renderNextFrame();
  });
}

/**
 * Encode video using WebCodecs API (more efficient, but less browser support)
 * Falls back to MediaRecorder if WebCodecs not available
 */
export async function encodeVideoWebCodecs(
  frames: CapturedFrame[],
  options: VideoOptions,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  // Check for WebCodecs support
  if (typeof VideoEncoder === 'undefined') {
    // Fall back to MediaRecorder
    return encodeVideo(frames, options, onProgress);
  }

  // WebCodecs implementation would go here
  // For now, fall back to MediaRecorder
  return encodeVideo(frames, options, onProgress);
}

/**
 * Get the best supported codec for the format
 */
function getBestCodec(format: 'webm' | 'mp4', supportedCodecs: string[]): string {
  if (format === 'webm') {
    // Prefer VP9 for better quality, fall back to VP8
    const vp9 = supportedCodecs.find(c => c.includes('vp9'));
    if (vp9) return vp9;

    const vp8 = supportedCodecs.find(c => c.includes('vp8'));
    if (vp8) return vp8;

    const webm = supportedCodecs.find(c => c.includes('webm'));
    if (webm) return webm;

    return 'video/webm';
  } else {
    // MP4 with H.264
    const avc = supportedCodecs.find(c => c.includes('avc1'));
    if (avc) return avc;

    const h264 = supportedCodecs.find(c => c.includes('h264'));
    if (h264) return h264;

    const mp4 = supportedCodecs.find(c => c.includes('mp4'));
    if (mp4) return mp4;

    return 'video/mp4';
  }
}

/**
 * Load image from data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Helper function to download a blob
 */
export function downloadVideoBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get estimated file size for video
 */
export function estimateVideoSize(
  durationMs: number,
  bitrate: number = 5000000
): number {
  // Bitrate is in bits per second
  return Math.round((durationMs / 1000) * (bitrate / 8));
}

/**
 * Get recommended bitrate based on resolution
 */
export function getRecommendedBitrate(width: number, height: number): number {
  const pixels = width * height;

  if (pixels <= 480 * 360) return 1000000;     // 480p: 1 Mbps
  if (pixels <= 854 * 480) return 2500000;     // 480p: 2.5 Mbps
  if (pixels <= 1280 * 720) return 5000000;    // 720p: 5 Mbps
  if (pixels <= 1920 * 1080) return 8000000;   // 1080p: 8 Mbps
  return 12000000;                              // 4K+: 12 Mbps
}
