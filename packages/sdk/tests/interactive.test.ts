/**
 * Interactive Module Tests
 *
 * Tests for constraint solver, interactive API, and related utilities.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { initManifold } from '../src/manifold/engine';
import { Shape } from '../src/shape';
import {
  interactive,
  fixedPart,
  hingePart,
  sliderPart,
  ballJointPart,
  linkedPart,
  createBoxWithLid,
  createDrawer,
  ConstraintSolver,
} from '../src/interactive';
import type {
  Constraint,
  InteractiveModel,
  InteractivePart,
  Transform,
} from '../src/interactive';

describe('Interactive Module', () => {
  beforeAll(async () => {
    await initManifold();
  });

  describe('interactive() API', () => {
    test('should create interactive model with parts', () => {
      const model = interactive({
        parts: [
          {
            id: 'base',
            shape: Shape.cube(10),
            constraint: { type: 'fixed' },
          },
        ],
      });

      expect(model).toBeDefined();
      expect(model.parts).toHaveLength(1);
      expect(model.parts[0].id).toBe('base');
    });

    test('should create model with multiple parts', () => {
      const model = interactive({
        parts: [
          { id: 'base', shape: Shape.cube(10), constraint: { type: 'fixed' } },
          { id: 'arm', shape: Shape.cylinder(20, 2), constraint: { type: 'hinge', axis: [1, 0, 0] } },
        ],
      });

      expect(model.parts).toHaveLength(2);
    });

    test('should validate interactive model structure', () => {
      const model = interactive({
        parts: [
          {
            id: 'test',
            shape: Shape.sphere(5),
            constraint: {
              type: 'slider',
              axis: [0, 1, 0],
              range: [0, 50],
            },
          },
        ],
        metadata: {
          name: 'Test Model',
          author: 'Test',
        },
      });

      expect(model.metadata?.name).toBe('Test Model');
      expect(model.parts[0].constraint?.range).toEqual([0, 50]);
    });
  });

  describe('Part Helper Functions', () => {
    test('fixedPart should create fixed constraint', () => {
      const part = fixedPart('base', Shape.cube(10));

      expect(part.id).toBe('base');
      expect(part.constraint?.type).toBe('fixed');
    });

    test('hingePart should create hinge constraint', () => {
      const part = hingePart('door', Shape.cube([10, 1, 20]), {
        axis: [0, 0, 1],
        pivot: [0, 0, 0],
        range: [0, 90],
      });

      expect(part.id).toBe('door');
      expect(part.constraint?.type).toBe('hinge');
      expect(part.constraint?.axis).toEqual([0, 0, 1]);
      expect(part.constraint?.range).toEqual([0, 90]);
    });

    test('sliderPart should create slider constraint', () => {
      const part = sliderPart('drawer', Shape.cube([20, 10, 5]), {
        axis: [0, 1, 0],
        range: [0, 30],
        springBack: true,
      });

      expect(part.constraint?.type).toBe('slider');
      expect(part.constraint?.springBack).toBe(true);
    });

    test('ballJointPart should create ball constraint', () => {
      const part = ballJointPart('joint', Shape.sphere(3), {
        pivot: [0, 0, 10],
        range: [-45, 45],
      });

      expect(part.constraint?.type).toBe('ball');
      expect(part.constraint?.pivot).toEqual([0, 0, 10]);
    });

    test('linkedPart should create linked constraint', () => {
      const part = linkedPart('gear2', Shape.cylinder(5, 10), 'gear1', -0.5, {
        type: 'hinge',
        axis: [0, 0, 1],
      });

      expect(part.linkedTo?.partId).toBe('gear1');
      expect(part.linkedTo?.ratio).toBe(-0.5);
    });
  });

  describe('Preset Creators', () => {
    test('createBoxWithLid should create valid model factory', () => {
      const modelFactory = createBoxWithLid(30, 30, 20, 2);

      // createBoxWithLid returns a factory function
      expect(typeof modelFactory).toBe('function');

      // Call factory with Shape class to get the model
      const model = modelFactory(Shape);

      expect(model.parts).toHaveLength(2);

      const base = model.parts.find(p => p.id === 'base');
      const lid = model.parts.find(p => p.id === 'lid');

      expect(base?.constraint?.type).toBe('fixed');
      expect(lid?.constraint?.type).toBe('hinge');
    });

    test('createDrawer should create valid model factory', () => {
      const modelFactory = createDrawer(40, 30, 50, 8, 25);

      // createDrawer returns a factory function
      expect(typeof modelFactory).toBe('function');

      // Call factory with Shape class to get the model
      const model = modelFactory(Shape);

      expect(model.parts).toHaveLength(2);

      const cabinet = model.parts.find(p => p.id === 'cabinet');
      const drawer = model.parts.find(p => p.id === 'drawer');

      expect(cabinet?.constraint?.type).toBe('fixed');
      expect(drawer?.constraint?.type).toBe('slider');
      expect(drawer?.constraint?.range).toEqual([0, 25]);
    });
  });

  describe('ConstraintSolver', () => {
    let solver: ConstraintSolver;

    beforeAll(() => {
      solver = new ConstraintSolver();
    });

    test('fixed constraint should not allow movement', () => {
      const constraint: Constraint = { type: 'fixed' };
      const current: Transform = {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      const result = solver.applyConstraint(constraint, current, { rotation: [45, 0, 0] }, 0);

      // Fixed should return same transform
      expect(result.transform.position).toEqual([0, 0, 0]);
      expect(result.value).toBe(0);
    });

    test('hinge constraint should limit rotation to range', () => {
      const constraint: Constraint = {
        type: 'hinge',
        axis: [1, 0, 0],
        range: [0, 90],
      };
      const current: Transform = {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      // Try to rotate 45 degrees - should succeed
      const result1 = solver.applyConstraint(constraint, current, { rotation: [45, 0, 0] }, 0);
      expect(result1.value).toBeCloseTo(45, 5);

      // Try to rotate past 90 - should clamp
      const result2 = solver.applyConstraint(constraint, current, { rotation: [120, 0, 0] }, 0);
      expect(result2.value).toBeCloseTo(90, 5);

      // Try negative - should clamp to 0
      const result3 = solver.applyConstraint(constraint, current, { rotation: [-30, 0, 0] }, 0);
      expect(result3.value).toBeCloseTo(0, 5);
    });

    test('slider constraint should limit translation to range', () => {
      const constraint: Constraint = {
        type: 'slider',
        axis: [0, 1, 0],
        range: [0, 50],
      };
      const current: Transform = {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      // Move 25 units - should succeed
      const result1 = solver.applyConstraint(constraint, current, { position: [0, 25, 0] }, 0);
      expect(result1.value).toBe(25);

      // Try to move 60 - should clamp to 50
      const result2 = solver.applyConstraint(constraint, current, { position: [0, 60, 0] }, 0);
      expect(result2.value).toBe(50);
    });

    test('free constraint should allow any movement', () => {
      const constraint: Constraint = { type: 'free' };
      const current: Transform = {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };

      const result = solver.applyConstraint(constraint, current, {
        position: [100, 200, 300],
        rotation: [45, 90, 180],
      }, 0);

      expect(result.transform.position).toEqual([100, 200, 300]);
      expect(result.transform.rotation).toEqual([45, 90, 180]);
    });

    test('isAtLimit should detect constraint limits', () => {
      const constraint: Constraint = {
        type: 'hinge',
        range: [0, 90],
      };

      expect(solver.isAtLimit(constraint, 0)).toBe('min');
      expect(solver.isAtLimit(constraint, 90)).toBe('max');
      expect(solver.isAtLimit(constraint, 45)).toBe(null);
    });

    test('applySpringBack should move toward initial value', () => {
      const constraint: Constraint = {
        type: 'slider',
        springBack: true,
        springStrength: 0.5,
      };

      const newValue = solver.applySpringBack(constraint, 50, 0, 0.1);
      expect(newValue).toBeLessThan(50);
      expect(newValue).toBeGreaterThan(0);
    });

    test('constraint without springBack should not spring', () => {
      const constraint: Constraint = {
        type: 'slider',
        springBack: false,
      };

      const newValue = solver.applySpringBack(constraint, 50, 0, 0.1);
      expect(newValue).toBe(50);
    });
  });

  describe('Complex Interactive Models', () => {
    test('should create robotic arm model', () => {
      const model = interactive({
        parts: [
          fixedPart('base', Shape.cylinder(15, 10)),
          hingePart('shoulder', Shape.cube([5, 5, 30]).translate([0, 0, 10]), {
            axis: [0, 1, 0],
            pivot: [0, 0, 10],
            range: [-90, 90],
          }),
          hingePart('elbow', Shape.cube([5, 5, 25]).translate([0, 0, 40]), {
            axis: [0, 1, 0],
            pivot: [0, 0, 40],
            range: [0, 135],
          }),
          ballJointPart('wrist', Shape.sphere(4).translate([0, 0, 65]), {
            pivot: [0, 0, 65],
            range: [-45, 45],
          }),
        ],
        metadata: {
          name: 'Robotic Arm',
          description: '4-DOF robotic arm',
        },
      });

      expect(model.parts).toHaveLength(4);
      expect(model.metadata?.name).toBe('Robotic Arm');
    });

    test('should create gear train with linked parts', () => {
      const model = interactive({
        parts: [
          {
            id: 'drive',
            shape: Shape.cylinder(5, 20),
            constraint: {
              type: 'hinge',
              axis: [0, 0, 1],
              range: [-Infinity, Infinity],
            },
          },
          linkedPart('driven', Shape.cylinder(5, 30).translate([50, 0, 0]), 'drive', -20 / 30, {
            type: 'hinge',
            axis: [0, 0, 1],
          }),
        ],
      });

      expect(model.parts).toHaveLength(2);
      expect(model.parts[1].linkedTo?.ratio).toBeCloseTo(-0.667, 2);
    });
  });
});
