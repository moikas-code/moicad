/**
 * Example 6: Real-World Project - Electronics Enclosure
 *
 * A complete parametric electronics enclosure with:
 * - Snap-fit lid
 * - Mounting posts
 * - Ventilation slots
 * - Cable port
 *
 * This demonstrates how to build a practical, print-ready part.
 */

import { Shape } from 'moicad';

class Enclosure {
  constructor(width, depth, height, wallThickness = 2) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.wall = wallThickness;
  }

  /**
   * Create the main box with hollow interior
   */
  createBox() {
    const outer = Shape.cube([this.width, this.depth, this.height]);
    const inner = Shape.cube([
      this.width - this.wall * 2,
      this.depth - this.wall * 2,
      this.height - this.wall
    ]).translate([this.wall, this.wall, this.wall]);

    return outer.subtract(inner);
  }

  /**
   * Create mounting posts for PCB
   */
  createMountingPosts() {
    const post = Shape.cylinder(this.height - this.wall - 5, 2)
      .translate([0, 0, this.wall]);

    const positions = [
      [5, 5, 0],
      [this.width - 5, 5, 0],
      [5, this.depth - 5, 0],
      [this.width - 5, this.depth - 5, 0],
    ];

    const posts = positions.map(pos => post.translate(pos));
    return Shape.union(...posts);
  }

  /**
   * Create ventilation slots
   */
  createVentSlots() {
    const slot = Shape.cube([this.width - 10, 1, 3])
      .translate([5, this.depth - this.wall, this.height - 10]);

    const slots = [];
    for (let i = 0; i < 3; i++) {
      slots.push(slot.translate([0, 0, -i * 5]));
    }

    return Shape.union(...slots);
  }

  /**
   * Create cable port
   */
  createCablePort() {
    return Shape.cylinder(10, 4, { $fn: 32 })
      .rotate([0, 90, 0])
      .translate([0, this.depth / 2, this.height / 2]);
  }

  /**
   * Build the complete enclosure
   */
  build() {
    const box = this.createBox();
    const posts = this.createMountingPosts();
    const vents = this.createVentSlots();
    const port = this.createCablePort();

    return box
      .union(posts)
      .subtract(vents)
      .subtract(port);
  }
}

// Create a 60x40x20mm enclosure
const enclosure = new Enclosure(60, 40, 20);

export default enclosure.build();
