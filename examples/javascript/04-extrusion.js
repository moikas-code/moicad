/**
 * Example 4: 2D to 3D with Extrusion
 *
 * Demonstrates creating 3D shapes from 2D profiles using extrusion.
 *
 * Topics covered:
 * - Creating 2D shapes (circle, square, polygon)
 * - Linear extrusion with twist and scale
 * - Rotational extrusion (lathe operation)
 * - Creating complex profiles
 */

import { Shape } from 'moicad';

// Example 1: Twisted tower
const twistedTower = Shape.square(10)
  .linearExtrude(50, { twist: 180, scale: 0.5 });

// Example 2: Vase using rotate extrude
const vaseProfile = Shape.polygon([
  [10, 0],
  [12, 10],
  [11, 20],
  [12, 30],
  [10, 40],
  [9, 40],
  [9, 0]
]);
const vase = vaseProfile.rotateExtrude({ $fn: 64 });

// Example 3: Gear-like shape
const gearProfile = Shape.circle(15, { $fn: 8 });
const gear = gearProfile.linearExtrude(5, { scale: 0.9 });

// Position all examples
export default Shape.union(
  twistedTower,
  vase.translate([40, 0, 0]),
  gear.translate([80, 0, 0])
);
