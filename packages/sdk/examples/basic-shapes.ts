/**
 * Basic Shape Examples for moicad-sdk
 */

import { Shape } from '../src/index.js';

// Example 1: Basic cube
export function basicCube() {
  return Shape.cube(10);
}

// Example 2: Colored sphere
export function coloredSphere() {
  return Shape.sphere(5).color('red');
}

// Example 3: Bolt with chain
export function bolt() {
  return Shape.cylinder(20, 2.5)
    .union(Shape.sphere(3).translate([0, 0, 20]))
    .color('silver');
}

// Example 4: Functional style bolt
export function functionalBolt() {
  const { cylinder, sphere, translate, union } = require('../src/index.js');
  
  return union(
    cylinder(20, 2.5),
    translate([0, 0, 20], sphere(3))
  );
}

// Example 5: 2D to 3D
export function extrudedShape() {
  return Shape.circle(10)
    .linearExtrude(20, { twist: 180, scale: 0.5 })
    .color('blue');
}

// Example 6: Boolean operations
export function booleanOperations() {
  const cube = Shape.cube(20);
  const sphere = Shape.sphere(12);
  return cube.subtract(sphere).color('cyan');
}

console.log('SDK Examples Loaded');