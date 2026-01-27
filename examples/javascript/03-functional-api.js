/**
 * Example 3: Functional API Style
 *
 * Demonstrates the functional programming approach as an alternative to the fluent API.
 *
 * Topics covered:
 * - Functional imports
 * - Function composition
 * - Difference and intersection operations
 * - Point-free style programming
 */

import { cube, sphere, cylinder, translate, rotate, difference, intersection } from 'moicad';

// Create a cube with a spherical hole
const hollowCube = difference(
  cube([20, 20, 20]),
  sphere(10)
);

// Create a cylinder aligned on X-axis
const xCylinder = rotate(
  [0, 90, 0],
  cylinder(30, 5)
);

// Find the intersection
const result = intersection(
  hollowCube,
  xCylinder
);

export default result;
