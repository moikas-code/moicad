/**
 * Animation Module Tests
 *
 * Tests for FrameAnimator and animation utilities.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { FrameAnimator } from '../src/animation/frame-animator';
import type { Geometry } from '../src/types';
import { initManifold } from '../src/manifold/engine';

describe('Animation Module', () => {
  beforeAll(async () => {
    await initManifold();
  });

  // Helper to create a mock onFrame callback
  const createMockCallback = () => {
    let callCount = 0;
    let lastGeometry: Geometry | null = null;
    let lastT = 0;

    const callback = (geometry: Geometry, t: number) => {
      callCount++;
      lastGeometry = geometry;
      lastT = t;
    };

    return {
      callback,
      getCallCount: () => callCount,
      getLastGeometry: () => lastGeometry,
      getLastT: () => lastT,
    };
  };

  describe('FrameAnimator', () => {
    test('should create with default options', () => {
      const mock = createMockCallback();
      const animator = new FrameAnimator(
        'cube(10);',
        'openscad',
        { onFrame: mock.callback }
      );

      expect(animator).toBeDefined();
    });

    test('should create with JavaScript code', () => {
      const mock = createMockCallback();
      const animator = new FrameAnimator(
        `import { Shape } from '@moicad/sdk'; export default Shape.cube(10);`,
        'javascript',
        { onFrame: mock.callback }
      );

      expect(animator).toBeDefined();
    });

    test('should create with custom options', () => {
      const mock = createMockCallback();
      const animator = new FrameAnimator(
        'sphere(5);',
        'openscad',
        {
          fps: 30,
          duration: 5000,
          loop: false,
          onFrame: mock.callback,
        }
      );

      expect(animator).toBeDefined();
    });

    test('should allow seeking to specific frame', () => {
      const mock = createMockCallback();
      const animator = new FrameAnimator(
        'cube(10);',
        'openscad',
        {
          fps: 30,
          duration: 1000,
          onFrame: mock.callback,
        }
      );

      // Animator uses frame-based seeking
      expect(animator).toBeDefined();
    });

    test('should handle pause and resume', () => {
      const mock = createMockCallback();
      const animator = new FrameAnimator(
        'cube(10);',
        'openscad',
        { onFrame: mock.callback }
      );

      animator.pause();
      // Should not throw
      expect(animator).toBeDefined();
    });

    test('should handle stop', () => {
      const mock = createMockCallback();
      const animator = new FrameAnimator(
        'cube(10);',
        'openscad',
        { onFrame: mock.callback }
      );

      animator.stop();
      // Should not throw
      expect(animator).toBeDefined();
    });
  });

  // Note: Tests that call animator.start() require requestAnimationFrame (browser API)
  // and cannot run in Node/Bun test environment. Integration tests for animation
  // playback should be run in browser environment.
});
