/**
 * Test script for Phase 2 JavaScript API features
 * Run with: bun run test-javascript-api-phase2.ts
 */

import { Shape } from './backend/javascript/shape';
import { evaluateJavaScript } from './backend/javascript/runtime';
import { initManifold } from './backend/manifold/engine';

async function main() {
  console.log('🧪 Testing moicad JavaScript API - Phase 2 Features...\n');

  // Initialize manifold engine
  await initManifold();
  console.log('✅ Manifold engine initialized\n');

  // Test 1: Text primitive
  console.log('Test 1: Text primitive');
  try {
    const text = await Shape.text('Hello', { size: 10, halign: 'center' });
    const geometry = text.getGeometry();
    console.log(`  ✅ Created text: ${geometry.stats.vertexCount} vertices`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 2: Linear extrude
  console.log('\nTest 2: Linear extrude');
  try {
    const profile = Shape.circle(5);
    const extruded = profile.linearExtrude(20);
    const geometry = extruded.getGeometry();
    console.log(`  ✅ Linear extruded circle: ${geometry.stats.vertexCount} vertices, volume ${geometry.stats.volume.toFixed(2)}`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 3: Linear extrude with twist and scale
  console.log('\nTest 3: Linear extrude with twist and scale');
  try {
    const profile = Shape.square(10, true);
    const twisted = profile.linearExtrude(30, { twist: 180, scale: 0.5 });
    const geometry = twisted.getGeometry();
    console.log(`  ✅ Twisted extrusion: ${geometry.stats.vertexCount} vertices`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 4: Rotate extrude with polygon
  console.log('\nTest 4: Rotate extrude with polygon');
  try {
    const profile = Shape.polygon([[10, 0], [15, 0], [15, 20], [10, 20]]);
    const vase = profile.rotateExtrude();
    const geometry = vase.getGeometry();
    console.log(`  ✅ Rotated extrusion: ${geometry.stats.vertexCount} vertices, volume ${geometry.stats.volume.toFixed(2)}`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 5: Offset operation
  console.log('\nTest 5: Offset operation');
  try {
    const square = Shape.square(20, true);
    const expanded = square.offset(5);
    const geometry = expanded.getGeometry();
    console.log(`  ✅ Offset square: ${geometry.stats.vertexCount} vertices`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 6: Projection
  console.log('\nTest 6: Projection');
  try {
    const sphere = Shape.sphere(10);
    const projected = sphere.projection();
    const geometry = projected.getGeometry();
    console.log(`  ✅ Projected sphere: ${geometry.stats.vertexCount} vertices`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 7: Hull operation
  console.log('\nTest 7: Hull operation');
  try {
    const sphere1 = Shape.sphere(5);
    const sphere2 = Shape.sphere(5).translate([20, 0, 0]);
    const sphere3 = Shape.sphere(5).translate([10, 20, 0]);
    const hull = Shape.hull(sphere1, sphere2, sphere3);
    const geometry = hull.getGeometry();
    console.log(`  ✅ Hull of 3 spheres: ${geometry.stats.vertexCount} vertices, volume ${geometry.stats.volume.toFixed(2)}`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 8: Minkowski sum
  console.log('\nTest 8: Minkowski sum');
  try {
    const cube = Shape.cube(10, true);
    const sphere = Shape.sphere(2);
    const rounded = cube.minkowski(sphere);
    const geometry = rounded.getGeometry();
    console.log(`  ✅ Minkowski sum (rounded cube): ${geometry.stats.vertexCount} vertices`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 9: Complex JavaScript code with polygon vase
  console.log('\nTest 9: JavaScript code evaluation with polygon vase');
  try {
    const code = `
      import { Shape } from 'moicad';

      // Create a vase using rotate extrude with a complex polygon profile
      const profile = Shape.polygon([
        [10, 0],
        [12, 10],
        [11, 20],
        [12, 30],
        [10, 40],
        [9, 40],
        [9, 0]
      ]);

      export default profile.rotateExtrude({ $fn: 32 });
    `;
    const result = await evaluateJavaScript(code);
    if (result.success && result.geometry) {
      console.log(`  ✅ Vase design: ${result.geometry.stats.vertexCount} vertices, ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.error(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 10: Gear with teeth using hull
  console.log('\nTest 10: Parametric gear with teeth (hull-based)');
  try {
    const code = `
      import { Shape } from 'moicad';

      class SimpleGear {
        constructor(teeth = 8, radius = 15, height = 5) {
          this.teeth = teeth;
          this.radius = radius;
          this.height = height;
        }

        build() {
          // Create gear teeth using hull
          const base = Shape.cylinder(this.height, this.radius, { center: true });

          const toothAngle = 360 / this.teeth;
          const teeth = [];

          for (let i = 0; i < this.teeth; i++) {
            const angle = i * toothAngle;
            const tooth = Shape.cube([2, 4, this.height], true)
              .translate([this.radius + 1, 0, 0])
              .rotate([0, 0, angle]);
            teeth.push(tooth);
          }

          const gear = base.union(...teeth);

          // Add center hole
          const hole = Shape.cylinder(this.height * 1.2, this.radius * 0.3, { center: true });

          return gear.subtract(hole);
        }
      }

      export default new SimpleGear(12, 20, 6).build();
    `;
    const result = await evaluateJavaScript(code);
    if (result.success && result.geometry) {
      console.log(`  ✅ Gear design: ${result.geometry.stats.vertexCount} vertices, ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.error(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  console.log('\n✨ Phase 2 tests completed!');
}

main().catch(console.error);
