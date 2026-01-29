/**
 * Animation module for moicad
 *
 * Provides frame-by-frame animation capabilities for CAD models,
 * including animation playback, frame capture, and export to GIF/video.
 *
 * @example Animation playback
 * ```typescript
 * import { FrameAnimator } from '@moicad/sdk/animation';
 *
 * const code = `export default (t) => Shape.cube(10).rotate([0, t * 360, 0]);`;
 * const animator = new FrameAnimator(code, 'javascript', {
 *   fps: 30,
 *   duration: 2000,
 *   onFrame: (geometry, t) => {
 *     viewport.updateGeometry(geometry);
 *   }
 * });
 *
 * await animator.start();
 * ```
 *
 * @example Export to GIF
 * ```typescript
 * import { FrameCapture, encodeGIF, downloadBlob } from '@moicad/sdk/animation';
 *
 * const capture = new FrameCapture(renderer, scene, camera, { width: 800, height: 600 });
 * const frames = await capture.captureAnimation(code, 'javascript', 30, 2000, updateGeometry);
 * const gif = await encodeGIF(frames, { width: 800, height: 600, fps: 30 });
 * downloadBlob(gif, 'animation.gif');
 * ```
 */

// Frame-by-frame animation engine
export { FrameAnimator, type FrameAnimatorOptions, type AnimationLanguage } from './frame-animator';

// Frame capture from viewport
export { FrameCapture, type CaptureOptions, type CapturedFrame } from './frame-capture';

// GIF encoding
export { encodeGIF, downloadBlob, estimateGIFSize, type GIFOptions } from './gif-encoder';

// Video encoding (WebM/MP4)
export {
  encodeVideo,
  encodeVideoWebCodecs,
  checkVideoEncoderSupport,
  downloadVideoBlob,
  estimateVideoSize,
  getRecommendedBitrate,
  type VideoOptions,
  type VideoEncoderSupport,
} from './video-encoder';
