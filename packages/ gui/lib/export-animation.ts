/**
 * Animation Export Integration
 *
 * Handles the complete flow of:
 * 1. Capturing frames from viewport
 * 2. Rendering each frame with t parameter
 * 3. Encoding to GIF/WebM
 * 4. Downloading the file
 */

import type { ExportSettings } from './animation-utils';
import { exportAnimationFrames, initializeFrameCapture, captureFrame } from './animation-utils';

/**
 * Animation frame renderer callback
 * Should render the animation with the given t value and return a canvas
 */
export type FrameRenderer = (t: number) => Promise<HTMLCanvasElement | null>;

/**
 * Progress callback during export
 */
export type ExportProgressCallback = (progress: number) => void;

/**
 * Export animation by rendering frames and encoding to video
 *
 * @param renderer - Function that renders a frame for a given t value
 * @param settings - Export settings (format, resolution, fps, etc.)
 * @param totalFrames - Total number of frames to render
 * @param onProgress - Callback for progress updates (0-100)
 */
export async function exportAnimation(
  renderer: FrameRenderer,
  settings: ExportSettings,
  totalFrames: number,
  onProgress?: ExportProgressCallback
): Promise<void> {
  try {
    // Initialize frame capture canvas
    const frameCapture = initializeFrameCapture(settings.width, settings.height);

    // Render and capture all frames
    for (let i = 0; i < totalFrames; i++) {
      const t = totalFrames > 1 ? i / (totalFrames - 1) : 0;

      try {
        // Render frame
        const frameCanvas = await renderer(t);
        if (!frameCanvas) {
          throw new Error(`Failed to render frame ${i}`);
        }

        // Resize if needed (handle different viewport sizes)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = settings.width;
        tempCanvas.height = settings.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          throw new Error('Could not get canvas context');
        }

        // Scale source canvas to fit target resolution
        const sourceWidth = frameCanvas.width;
        const sourceHeight = frameCanvas.height;
        const sourceAspect = sourceWidth / sourceHeight;
        const targetAspect = settings.width / settings.height;

        let drawWidth = settings.width;
        let drawHeight = settings.height;

        if (sourceAspect > targetAspect) {
          // Source is wider
          drawHeight = settings.width / sourceAspect;
        } else {
          // Source is taller
          drawWidth = settings.height * sourceAspect;
        }

        // Center the scaled image
        const x = (settings.width - drawWidth) / 2;
        const y = (settings.height - drawHeight) / 2;

        // Fill background with white
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, settings.width, settings.height);

        // Draw scaled frame
        tempCtx.drawImage(frameCanvas, x, y, drawWidth, drawHeight);

        // Capture the frame
        captureFrame(tempCanvas, frameCapture);

        // Update progress
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalFrames) * 100));
        }
      } catch (error) {
        throw new Error(
          `Failed to render frame ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Encode frames to selected format
    const filename =
      settings.format === 'gif'
        ? `animation-${Date.now()}.gif`
        : `animation-${Date.now()}.webm`;

    await exportAnimationFrames(
      settings.format,
      frameCapture.frameData,
      settings.fps,
      settings.loop,
      filename
    );
  } catch (error) {
    throw new Error(
      `Animation export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get supported export formats based on browser capabilities
 */
export function getSupportedFormats(): ('webm' | 'gif')[] {
  const formats: ('webm' | 'gif')[] = [];

  // Check WebM support via MediaRecorder
  if (typeof MediaRecorder !== 'undefined') {
    const testMimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    if (testMimeTypes.some((mimeType) => MediaRecorder.isTypeSupported(mimeType))) {
      formats.push('webm');
    }
  }

  // Check GIF support (requires gif.js library)
  if ((window as any).GIF) {
    formats.push('gif');
  }

  return formats;
}

/**
 * Check if a specific export format is available
 */
export function isFormatSupported(format: 'webm' | 'gif'): boolean {
  return getSupportedFormats().includes(format);
}

/**
 * Get warning message if format is not available
 */
export function getFormatWarning(format: 'webm' | 'gif'): string | null {
  if (format === 'webm' && !isFormatSupported('webm')) {
    return 'WebM export is not supported in your browser. Try GIF instead.';
  }

  if (format === 'gif' && !isFormatSupported('gif')) {
    return 'GIF export requires gif.js library. Check browser console for details.';
  }

  return null;
}
