/**
 * FrameCapture - Capture frames from Three.js viewport for animation export
 *
 * @example
 * ```typescript
 * const capture = new FrameCapture(renderer, { width: 800, height: 600 });
 *
 * // Capture single frame
 * const frame = await capture.capture();
 *
 * // Capture all animation frames
 * const frames = await capture.captureAnimation(animator, (frame, total) => {
 *   console.log(`Capturing frame ${frame}/${total}`);
 * });
 * ```
 */

import * as THREE from 'three';
import type { FrameAnimator } from './frame-animator';
import type { Geometry } from '../types';

export interface CaptureOptions {
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Image format */
  format?: 'png' | 'jpeg';
  /** Quality for JPEG (0-1) */
  quality?: number;
  /** Background color (default: transparent for PNG, black for JPEG) */
  backgroundColor?: string;
}

export interface CapturedFrame {
  /** Frame number (0-indexed) */
  index: number;
  /** Animation time (0.0 to 1.0) */
  t: number;
  /** Image data as Blob */
  blob: Blob;
  /** Image data as data URL */
  dataUrl: string;
}

export class FrameCapture {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private options: Required<CaptureOptions>;

  // Offscreen rendering
  private offscreenRenderer: THREE.WebGLRenderer | null = null;
  private renderTarget: THREE.WebGLRenderTarget | null = null;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: CaptureOptions
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.options = {
      width: options.width,
      height: options.height,
      format: options.format || 'png',
      quality: options.quality || 0.92,
      backgroundColor: options.backgroundColor || (options.format === 'jpeg' ? '#000000' : 'transparent'),
    };
  }

  /**
   * Initialize offscreen renderer for capturing
   */
  private initOffscreenRenderer(): void {
    if (this.offscreenRenderer) return;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;

    // Create offscreen renderer
    this.offscreenRenderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: this.options.format === 'png',
    });
    this.offscreenRenderer.setSize(this.options.width, this.options.height);
    this.offscreenRenderer.setPixelRatio(1); // Use 1:1 for consistent output

    // Set background
    if (this.options.backgroundColor !== 'transparent') {
      this.offscreenRenderer.setClearColor(new THREE.Color(this.options.backgroundColor), 1);
    } else {
      this.offscreenRenderer.setClearColor(0x000000, 0);
    }
  }

  /**
   * Capture current frame from the scene
   */
  async capture(): Promise<CapturedFrame> {
    this.initOffscreenRenderer();

    // Update camera aspect ratio if perspective
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const originalAspect = this.camera.aspect;
      this.camera.aspect = this.options.width / this.options.height;
      this.camera.updateProjectionMatrix();

      // Render to offscreen canvas
      this.offscreenRenderer!.render(this.scene, this.camera);

      // Restore aspect ratio
      this.camera.aspect = originalAspect;
      this.camera.updateProjectionMatrix();
    } else {
      this.offscreenRenderer!.render(this.scene, this.camera);
    }

    // Get canvas data
    const canvas = this.offscreenRenderer!.domElement;
    const mimeType = this.options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, this.options.quality);

    // Convert to blob
    const blob = await this.dataUrlToBlob(dataUrl);

    return {
      index: 0,
      t: 0,
      blob,
      dataUrl,
    };
  }

  /**
   * Capture all frames from an animation
   *
   * @param code - Animation code to evaluate
   * @param language - 'javascript' or 'openscad'
   * @param fps - Frames per second
   * @param duration - Animation duration in milliseconds
   * @param updateGeometry - Callback to update scene with new geometry
   * @param onProgress - Progress callback
   */
  async captureAnimation(
    code: string,
    language: 'javascript' | 'openscad',
    fps: number,
    duration: number,
    updateGeometry: (geometry: Geometry) => void,
    onProgress?: (frame: number, total: number) => void
  ): Promise<CapturedFrame[]> {
    const { FrameAnimator } = await import('./frame-animator');

    const totalFrames = Math.floor((duration / 1000) * fps);
    const frames: CapturedFrame[] = [];

    this.initOffscreenRenderer();

    // Capture each frame sequentially
    for (let i = 0; i < totalFrames; i++) {
      const t = totalFrames > 1 ? i / (totalFrames - 1) : 0;

      // Evaluate geometry at this t value
      const geometry = await this.evaluateAtT(code, language, t);

      // Update the scene
      updateGeometry(geometry);

      // Small delay to allow render
      await new Promise(resolve => setTimeout(resolve, 10));

      // Capture the frame
      const frame = await this.capture();
      frames.push({
        ...frame,
        index: i,
        t,
      });

      // Report progress
      onProgress?.(i + 1, totalFrames);
    }

    return frames;
  }

  /**
   * Capture frames using an existing FrameAnimator
   */
  async captureFromAnimator(
    animator: FrameAnimator,
    updateGeometry: (geometry: Geometry) => void,
    onProgress?: (frame: number, total: number) => void
  ): Promise<CapturedFrame[]> {
    const totalFrames = animator.getTotalFrames();
    const frames: CapturedFrame[] = [];

    this.initOffscreenRenderer();

    // Store original frame
    const originalFrame = animator.getCurrentFrame();

    // Capture each frame
    for (let i = 0; i < totalFrames; i++) {
      // Set animator to this frame (this triggers geometry update via callback)
      await animator.setFrame(i);

      const t = animator.getCurrentT();

      // Small delay to allow render
      await new Promise(resolve => setTimeout(resolve, 10));

      // Capture the frame
      const frame = await this.capture();
      frames.push({
        ...frame,
        index: i,
        t,
      });

      // Report progress
      onProgress?.(i + 1, totalFrames);
    }

    // Restore original frame
    await animator.setFrame(originalFrame);

    return frames;
  }

  /**
   * Evaluate code at specific t value
   */
  private async evaluateAtT(
    code: string,
    language: 'javascript' | 'openscad',
    t: number
  ): Promise<Geometry> {
    if (language === 'javascript') {
      const { evaluateJavaScript } = await import('../runtime');
      const result = await evaluateJavaScript(code, { t });

      if (!result.success || !result.geometry) {
        throw new Error(result.errors[0]?.message || 'Evaluation failed');
      }

      return result.geometry;
    } else {
      const { parseOpenSCAD } = await import('../scad/parser');
      const { evaluateAST } = await import('../scad/evaluator');

      const parseResult = parseOpenSCAD(code);
      if (!parseResult.success || !parseResult.ast) {
        throw new Error(parseResult.errors[0]?.message || 'Parse failed');
      }

      const evalResult = await evaluateAST(parseResult.ast, {
        variables: new Map([['$t', t]])
      });

      if (!evalResult.success || !evalResult.geometry) {
        throw new Error(evalResult.errors[0]?.message || 'Evaluation failed');
      }

      return evalResult.geometry;
    }
  }

  /**
   * Convert data URL to Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  /**
   * Update capture options
   */
  setOptions(options: Partial<CaptureOptions>): void {
    this.options = { ...this.options, ...options };

    // Recreate offscreen renderer if size changed
    if (options.width || options.height) {
      this.dispose();
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.offscreenRenderer) {
      this.offscreenRenderer.dispose();
      this.offscreenRenderer = null;
    }
    if (this.renderTarget) {
      this.renderTarget.dispose();
      this.renderTarget = null;
    }
  }
}
