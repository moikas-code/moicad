/**
 * FrameAnimator - Frame-by-frame animation with function re-evaluation
 *
 * Supports both JavaScript functions and OpenSCAD $t variable.
 *
 * @example JavaScript
 * ```typescript
 * const code = `export default (t) => Shape.cube(10).rotate([0, t * 360, 0]);`;
 * const animator = new FrameAnimator(code, 'javascript', {
 *   fps: 30,
 *   duration: 2000,
 *   onFrame: (geometry, t) => viewport.updateGeometry(geometry)
 * });
 * await animator.start();
 * ```
 *
 * @example OpenSCAD
 * ```typescript
 * const code = `rotate([0, $t * 360, 0]) cube(10);`;
 * const animator = new FrameAnimator(code, 'openscad', {
 *   fps: 30,
 *   duration: 2000,
 *   onFrame: (geometry, t) => viewport.updateGeometry(geometry)
 * });
 * await animator.start();
 * ```
 */

import type { Geometry } from '../types';

export type AnimationLanguage = 'javascript' | 'openscad';

export interface FrameAnimatorOptions {
  /** Frames per second (default: 30) */
  fps?: number;
  /** Total animation duration in milliseconds (default: 2000) */
  duration?: number;
  /** Whether to loop the animation (default: false) */
  loop?: boolean;
  /** Callback called for each frame with geometry and current t value */
  onFrame: (geometry: Geometry, t: number) => void;
  /** Callback called when animation completes (only if not looping) */
  onComplete?: () => void;
  /** Callback called on error */
  onError?: (error: Error) => void;
}

export class FrameAnimator {
  private code: string;
  private language: AnimationLanguage;
  private fps: number;
  private duration: number;
  private loop: boolean;
  private currentFrame: number = 0;
  private totalFrames: number;
  private animationId: number | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private lastFrameTime: number = 0;

  private onFrameCallback: (geometry: Geometry, t: number) => void;
  private onCompleteCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(
    code: string,
    language: AnimationLanguage,
    options: FrameAnimatorOptions
  ) {
    this.code = code;
    this.language = language;
    this.fps = options.fps || 30;
    this.duration = options.duration || 2000;
    this.loop = options.loop !== undefined ? options.loop : false;
    this.totalFrames = Math.floor((this.duration / 1000) * this.fps);
    this.onFrameCallback = options.onFrame;
    this.onCompleteCallback = options.onComplete;
    this.onErrorCallback = options.onError;
  }

  /**
   * Start animation from the beginning
   */
  async start(): Promise<void> {
    this.currentFrame = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    await this.animateFrame();
  }

  /**
   * Pause animation (can be resumed)
   */
  pause(): void {
    this.isPaused = true;
    this.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Resume paused animation
   */
  async resume(): Promise<void> {
    if (this.isPaused) {
      this.isPaused = false;
      this.isPlaying = true;
      this.lastFrameTime = performance.now();
      await this.animateFrame();
    }
  }

  /**
   * Stop animation and reset to beginning
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentFrame = 0;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Jump to specific frame
   */
  async setFrame(frameNumber: number): Promise<void> {
    this.currentFrame = Math.max(0, Math.min(frameNumber, this.totalFrames - 1));

    // If not playing, render this frame
    if (!this.isPlaying) {
      const t = this.currentFrame / (this.totalFrames - 1);
      try {
        const geometry = await this.evaluateWithT(t);
        this.onFrameCallback(geometry, t);
      } catch (error: any) {
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        } else {
          console.error('Animation frame error:', error);
        }
      }
    }
  }

  /**
   * Get current frame number
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * Get total number of frames
   */
  getTotalFrames(): number {
    return this.totalFrames;
  }

  /**
   * Check if animation is playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if animation is paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get current time value (0.0 to 1.0)
   */
  getCurrentT(): number {
    return this.totalFrames > 1 ? this.currentFrame / (this.totalFrames - 1) : 0;
  }

  /**
   * Main animation loop - renders frames at specified FPS
   */
  private async animateFrame(): Promise<void> {
    if (!this.isPlaying) return;

    const now = performance.now();
    const frameTime = 1000 / this.fps;
    const elapsed = now - this.lastFrameTime;

    // Only render if enough time has passed for next frame
    if (elapsed >= frameTime) {
      // Check if animation is complete
      if (this.currentFrame >= this.totalFrames) {
        if (this.loop) {
          // Loop back to beginning
          this.currentFrame = 0;
        } else {
          // Animation complete
          this.stop();
          if (this.onCompleteCallback) {
            this.onCompleteCallback();
          }
          return;
        }
      }

      // Calculate t (0.0 to 1.0)
      const t = this.totalFrames > 1 ? this.currentFrame / (this.totalFrames - 1) : 0;

      try {
        // Evaluate with current t value
        const geometry = await this.evaluateWithT(t);

        // Call frame callback
        this.onFrameCallback(geometry, t);
      } catch (error: any) {
        if (this.onErrorCallback) {
          this.onErrorCallback(error);
        } else {
          console.error('Animation frame error:', error);
        }

        // Stop on error
        this.stop();
        return;
      }

      this.currentFrame++;
      this.lastFrameTime = now - (elapsed % frameTime); // Adjust for drift
    }

    // Schedule next frame
    this.animationId = requestAnimationFrame(() => this.animateFrame());
  }

  /**
   * Evaluate code with specific t value
   */
  private async evaluateWithT(t: number): Promise<Geometry> {
    if (this.language === 'javascript') {
      // PRIMARY: JavaScript function evaluation
      // User exports: export default (t) => Shape.cube(10).rotate([0, t * 360, 0])
      const { evaluateJavaScript } = await import('../runtime');
      const result = await evaluateJavaScript(this.code, { t });

      if (!result.success || !result.geometry) {
        throw new Error(result.errors[0]?.message || 'Evaluation failed');
      }

      return result.geometry;
    } else if (this.language === 'openscad') {
      // LEGACY: OpenSCAD $t variable support
      const { parseOpenSCAD } = await import('../scad/parser');
      const { evaluateAST } = await import('../scad/evaluator');

      const parseResult = parseOpenSCAD(this.code);

      if (!parseResult.success || !parseResult.ast) {
        throw new Error(parseResult.errors[0]?.message || 'Parse failed');
      }

      const evalResult = await evaluateAST(parseResult.ast, {
        variables: new Map([['$t', t]]) // Override $t
      });

      if (!evalResult.success || !evalResult.geometry) {
        throw new Error(evalResult.errors[0]?.message || 'Evaluation failed');
      }

      return evalResult.geometry;
    }

    throw new Error(`Unsupported language: ${this.language}`);
  }
}
