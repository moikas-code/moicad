/**
 * useAnimation - Hook for managing FrameAnimator state
 *
 * Manages animation playback, frame control, and settings.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Geometry } from '@moicad/sdk';

export interface UseAnimationOptions {
  /** Initial FPS (default: 30) */
  fps?: number;
  /** Initial duration in milliseconds (default: 2000) */
  duration?: number;
  /** Initial loop setting (default: false) */
  loop?: boolean;
  /** Callback when geometry is updated */
  onGeometryUpdate?: (geometry: Geometry, t: number) => void;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseAnimationReturn {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;
  totalFrames: number;

  // Settings
  fps: number;
  duration: number;
  loop: boolean;

  // Controls
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setFrame: (frame: number) => Promise<void>;
  setFps: (fps: number) => void;
  setDuration: (duration: number) => void;
  setLoop: (loop: boolean) => void;

  // Animation setup
  startAnimation: (code: string, language: 'javascript' | 'openscad') => Promise<void>;
  isAnimationReady: boolean;
}

export function useAnimation(options: UseAnimationOptions = {}): UseAnimationReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [fps, setFpsState] = useState(options.fps || 30);
  const [duration, setDurationState] = useState(options.duration || 2000);
  const [loop, setLoopState] = useState(options.loop || false);
  const [isAnimationReady, setIsAnimationReady] = useState(false);

  const animatorRef = useRef<any>(null); // FrameAnimator instance
  const frameIntervalRef = useRef<any>(null);

  // Calculate total frames when fps or duration changes
  useEffect(() => {
    const frames = Math.floor((duration / 1000) * fps);
    setTotalFrames(frames);
  }, [fps, duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animatorRef.current) {
        animatorRef.current.stop();
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  const startAnimation = useCallback(async (code: string, language: 'javascript' | 'openscad') => {
    try {
      // Dynamically import FrameAnimator
      const { FrameAnimator } = await import('@moicad/sdk/animation');

      // Stop existing animation if any
      if (animatorRef.current) {
        animatorRef.current.stop();
      }

      // Create new animator
      const animator = new FrameAnimator(code, language, {
        fps,
        duration,
        loop,
        onFrame: (geometry, t) => {
          setCurrentFrame(animator.getCurrentFrame());
          options.onGeometryUpdate?.(geometry, t);
        },
        onComplete: () => {
          setIsPlaying(false);
          setIsPaused(false);
          options.onComplete?.();
        },
        onError: (error) => {
          setIsPlaying(false);
          setIsPaused(false);
          options.onError?.(error);
        }
      });

      animatorRef.current = animator;
      setIsAnimationReady(true);
      setCurrentFrame(0);
    } catch (error) {
      console.error('Failed to start animation:', error);
      options.onError?.(error as Error);
      setIsAnimationReady(false);
    }
  }, [fps, duration, loop, options]);

  const play = useCallback(async () => {
    if (!animatorRef.current) {
      console.warn('Animation not ready. Call startAnimation() first.');
      return;
    }

    try {
      if (isPaused) {
        await animatorRef.current.resume();
      } else {
        await animatorRef.current.start();
      }
      setIsPlaying(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to play animation:', error);
      options.onError?.(error as Error);
    }
  }, [isPaused, options]);

  const pause = useCallback(() => {
    if (!animatorRef.current) return;

    animatorRef.current.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  const stop = useCallback(() => {
    if (!animatorRef.current) return;

    animatorRef.current.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentFrame(0);
  }, []);

  const setFrame = useCallback(async (frame: number) => {
    if (!animatorRef.current) return;

    try {
      await animatorRef.current.setFrame(frame);
      setCurrentFrame(frame);
    } catch (error) {
      console.error('Failed to set frame:', error);
      options.onError?.(error as Error);
    }
  }, [options]);

  const setFps = useCallback((newFps: number) => {
    setFpsState(newFps);

    // If animation is ready, recreate it with new settings
    // (FrameAnimator doesn't support live FPS changes)
    if (animatorRef.current && isAnimationReady) {
      const wasPlaying = isPlaying;
      stop();

      // Note: User needs to recall startAnimation() or we need to store code/language
      // For now, just update the state
    }
  }, [isPlaying, isAnimationReady, stop]);

  const setDuration = useCallback((newDuration: number) => {
    setDurationState(newDuration);

    // Same as setFps - requires recreation
    if (animatorRef.current && isAnimationReady) {
      const wasPlaying = isPlaying;
      stop();
    }
  }, [isPlaying, isAnimationReady, stop]);

  const setLoop = useCallback((newLoop: boolean) => {
    setLoopState(newLoop);

    // Update loop on existing animator if possible
    // Note: Current FrameAnimator doesn't have setLoop() method
    // Would need to recreate animator or add the method
  }, []);

  return {
    // State
    isPlaying,
    isPaused,
    currentFrame,
    totalFrames,
    fps,
    duration,
    loop,

    // Controls
    play,
    pause,
    stop,
    setFrame,
    setFps,
    setDuration,
    setLoop,

    // Setup
    startAnimation,
    isAnimationReady,
  };
}
