/**
 * Example 1: Basic Shapes
 *
 * Demonstrates creating basic 3D primitives using the JavaScript API.
 *
 * Topics covered:
 * - Importing the Shape class
 * - Creating cubes, spheres, cylinders
 * - Positioning shapes with translate
 * - Combining shapes with union
 */

import { Shape } from 'moicad';

// Create a cube
const cube = Shape.cube(10);

// Create a sphere with custom detail
const sphere = Shape.sphere(5, { $fn: 32 });

// Create a cylinder
const cylinder = Shape.cylinder(20, 3);

// Position them in a row
const positioned = Shape.union(
  cube,
  sphere.translate([15, 0, 0]),
  cylinder.translate([30, 0, 0])
);

export default positioned;
