/**
 * useAnimation Hook
 *
 * Manages animation state and playback for animated models
 *
 * Features:
 * - Play/pause/stop controls
 * - Frame-by-frame stepping
 * - Settings adjustment (FPS, duration, loop)
 * - Frame caching with LRU eviction
 * - Re-evaluation on frame changes
 * - requestAnimationFrame for smooth playback
 *
 * Usage:
 * ```typescript
 * const animation = useAnimation(true);
 * animation.play();
 * // animation.currentFrame, animation.isPlaying, etc.
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createInitialAnimationState,
  calculateTValue,
  calculateTotalFrames,
  updateFrame,
  FrameCache,
} from '@/lib/animation-utils';
import type { AnimationState } from '@/lib/animation-utils';

export interface UseAnimationOptions {
  initialFps?: number;
  initialDuration?: number;
  initialLoop?: boolean;
  maxCacheSize?: number;
  onFrameChange?: (t: number, frame: number, totalFrames: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseAnimationReturn extends AnimationState {
  play: () => void;
  pause: () => void;
  stop: () => void;
  setFrame: (frame: number) => void;
  setFps: (fps: number) => void;
  setDuration: (duration: number) => void;
  setLoop: (loop: boolean) => void;
  frameCache: FrameCache;
}

/**
 * Animation state hook with playback controls
 *
 * Manages:
 * - Current frame and playback state
 * - Frame rate and duration settings
 * - Loop mode
 * - Frame caching
 */
export function useAnimation(
  isAnimationCode: boolean = false,
  options: UseAnimationOptions = {}
): UseAnimationReturn {
  const {
    initialFps = 30,
    initialDuration = 2000,
    initialLoop = false,
    maxCacheSize = 100,
    onFrameChange,
    onPlayStateChange,
    onError,
  } = options;

  // Initialize state
  const [state, setState] = useState<AnimationState>(() =>
    createInitialAnimationState(initialDuration, initialFps)
  );

  // Frame cache (persistent across re-renders)
  const frameCacheRef = useRef(new FrameCache(maxCacheSize));

  // Animation frame ID for cleanup
  const animationFrameIdRef = useRef<number | null>(null);

  // Playback loop timing
  const lastFrameTimeRef = useRef<number>(0);

  /**
   * Play animation
   */
  const play = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
    }));
    onPlayStateChange?.(true);
  }, [onPlayStateChange]);

  /**
   * Pause animation
   */
  const pause = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  /**
   * Stop animation (back to frame 0)
   */
  const stop = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentFrame: 0,
      t: 0,
    }));
    onPlayStateChange?.(false);
    onFrameChange?.(0, 0, state.totalFrames);
  }, [state.totalFrames, onPlayStateChange, onFrameChange]);

  /**
   * Jump to specific frame
   */
  const setFrame = useCallback(
    (frame: number) => {
      const clamped = Math.max(0, Math.min(frame, state.totalFrames - 1));
      const t = calculateTValue(clamped, state.totalFrames);

      setState(prev => ({
        ...prev,
        currentFrame: clamped,
        t,
      }));

      onFrameChange?.(t, clamped, state.totalFrames);
    },
    [state.totalFrames, onFrameChange]
  );

  /**
   * Change FPS (frames per second)
   * Requires re-calculating total frames
   */
  const setFps = useCallback(
    (fps: number) => {
      // Must stop animation if playing
      const newTotalFrames = calculateTotalFrames(fps, state.duration);
      const newFrame = Math.min(state.currentFrame, newTotalFrames - 1);

      setState(prev => ({
        ...prev,
        fps,
        totalFrames: newTotalFrames,
        currentFrame: newFrame,
        isPlaying: false, // Force stop
        isPaused: false,
      }));

      onPlayStateChange?.(false);
    },
    [state.duration, state.currentFrame, onPlayStateChange]
  );

  /**
   * Change duration (milliseconds)
   * Requires re-calculating total frames
   */
  const setDuration = useCallback(
    (duration: number) => {
      // Must stop animation if playing
      const newTotalFrames = calculateTotalFrames(state.fps, duration);
      const newFrame = Math.min(state.currentFrame, newTotalFrames - 1);

      setState(prev => ({
        ...prev,
        duration,
        totalFrames: newTotalFrames,
        currentFrame: newFrame,
        isPlaying: false, // Force stop
        isPaused: false,
      }));

      onPlayStateChange?.(false);
    },
    [state.fps, state.currentFrame, onPlayStateChange]
  );

  /**
   * Toggle loop mode
   */
  const setLoop = useCallback((loop: boolean) => {
    setState(prev => ({
      ...prev,
      loop,
    }));
  }, []);

  /**
   * Animation playback loop using requestAnimationFrame
   *
   * Provides smooth, browser-optimized playback at target FPS
   * with drift compensation
   */
  useEffect(() => {
    if (!state.isPlaying) {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    const frameInterval = 1000 / state.fps; // ms per frame

    const animate = (now: number) => {
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = now;
      }

      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= frameInterval) {
        // Update frame
        const { nextFrame, isComplete } = updateFrame(
          state.currentFrame,
          state.totalFrames,
          state.loop
        );

        const t = calculateTValue(nextFrame, state.totalFrames);

        setState(prev => ({
          ...prev,
          currentFrame: nextFrame,
          t,
          isPlaying: !isComplete, // Stop if animation complete and not looping
        }));

        onFrameChange?.(t, nextFrame, state.totalFrames);

        // Drift compensation: adjust timing to account for frame rendering time
        lastFrameTimeRef.current = now - (elapsed % frameInterval);

        if (isComplete && !state.loop) {
          onPlayStateChange?.(false);
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      lastFrameTimeRef.current = 0;
    };
  }, [state.isPlaying, state.fps, state.currentFrame, state.totalFrames, state.loop, onFrameChange, onPlayStateChange]);

  /**
   * Clear frame cache when code changes (different animation)
   * This should be called from parent when code changes
   */
  const clearCache = useCallback(() => {
    frameCacheRef.current.clear();
  }, []);

  return {
    ...state,
    play,
    pause,
    stop,
    setFrame,
    setFps,
    setDuration,
    setLoop,
    frameCache: frameCacheRef.current,
  };
}

/**
 * Export useAnimation hook for testing and external use
 */
export default useAnimation;
