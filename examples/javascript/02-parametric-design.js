/**
 * Example 2: Parametric Design with Classes
 *
 * Demonstrates creating reusable parametric components using classes.
 *
 * Topics covered:
 * - Creating classes for reusable designs
 * - Constructor parameters for customization
 * - Combining multiple operations
 * - Subtractive modeling (difference)
 */

import { Shape } from 'moicad';

/**
 * A parametric bolt with customizable dimensions
 */
class Bolt {
  constructor(length, diameter, headHeight = null) {
    this.length = length;
    this.diameter = diameter;
    this.headHeight = headHeight || diameter * 0.7;
    this.headDiameter = diameter * 1.8;
  }

  build() {
    // Shaft
    const shaft = Shape.cylinder(this.length, this.diameter / 2);

    // Hexagonal head
    const head = Shape.cylinder(this.headHeight, this.headDiameter / 2, { $fn: 6 })
      .translate([0, 0, this.length]);

    // Combine shaft and head
    return shaft.union(head);
  }
}

// Create bolts with different sizes
const smallBolt = new Bolt(15, 4).build();
const mediumBolt = new Bolt(25, 6).build().translate([15, 0, 0]);
const largeBolt = new Bolt(35, 8).build().translate([35, 0, 0]);

export default Shape.union(smallBolt, mediumBolt, largeBolt);
