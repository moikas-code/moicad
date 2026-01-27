/**
 * Example 2: Parametric Design with ISO Metric Threads
 *
 * Demonstrates creating a realistic ISO metric bolt with helical threads.
 *
 * Topics covered:
 * - Object-oriented parametric design
 * - ISO metric thread standards
 * - Helical extrusion with twist
 * - Polygon profiles for complex shapes
 * - Boolean operations (union)
 */

import { Shape } from 'moicad';

/**
 * ISO Metric Bolt with realistic helical threads
 *
 * Features:
 * - Standard ISO metric thread pitches (M3, M4, M5, M6, M8, M10, etc.)
 * - 60-degree thread profile (ISO standard)
 * - Hexagonal head with proper proportions
 * - Customizable diameter, length, and pitch
 */
class ISOMetricBolt {
  constructor(diameter, length, pitch = null) {
    this.diameter = diameter; // Nominal diameter in mm (M5 = 5mm)
    this.length = length; // Shaft length in mm
    // Use standard pitch if not specified
    this.pitch = pitch || this.getStandardPitch(diameter);
    this.threadHeight = this.pitch * 0.54; // ISO metric standard (H/2)
  }

  /**
   * Get standard coarse thread pitch for common metric sizes
   * Reference: ISO 68-1 standard
   */
  getStandardPitch(diameter) {
    const pitches = {
      3: 0.5,   // M3
      4: 0.7,   // M4
      5: 0.8,   // M5
      6: 1.0,   // M6
      8: 1.25,  // M8
      10: 1.5,  // M10
      12: 1.75, // M12
      16: 2.0,  // M16
      20: 2.5   // M20
    };
    return pitches[diameter] || 1.0;
  }

  build() {
    // Create core shaft (nominal diameter minus thread height)
    const coreRadius = (this.diameter / 2) - this.threadHeight;
    const shaft = Shape.cylinder(this.length, coreRadius);

    // Create thread profile (triangular, 60-degree ISO standard)
    // Profile is a triangle that will be revolved around the shaft
    const threadProfile = Shape.polygon([
      [coreRadius, 0],                    // Inner radius at start
      [this.diameter / 2, this.pitch / 2], // Outer radius at middle
      [coreRadius, this.pitch]            // Inner radius at end
    ]);

    // Create helical thread by extruding with twist
    const turns = this.length / this.pitch;
    const thread = threadProfile.linearExtrude(this.length, {
      twist: 360 * turns, // One full rotation per thread pitch
      $fn: 48 // Smooth resolution
    });

    // Combine shaft and thread
    const threadedShaft = shaft.union(thread);

    // Create hexagonal head (ISO standard proportions)
    const headHeight = this.diameter * 0.7;
    const headDiameter = this.diameter * 1.6; // Across flats
    const head = Shape.cylinder(headHeight, headDiameter / 2, { $fn: 6 })
      .translate([0, 0, this.length]);

    // Combine all parts
    return threadedShaft.union(head);
  }
}

// Create an M5 bolt, 20mm long (standard metric bolt)
export default new ISOMetricBolt(5, 20).build();
