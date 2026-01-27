/**
 * Quick test script for JavaScript API
 * Run with: bun run test-javascript-api.ts
 */

import { Shape } from './backend/javascript/shape';
import { evaluateJavaScript } from './backend/javascript/runtime';
import { initManifold } from './backend/manifold/engine';

async function main() {
  console.log('🧪 Testing moicad JavaScript API...\n');

  // Initialize manifold engine
  await initManifold();
  console.log('✅ Manifold engine initialized\n');

  // Test 1: Direct Shape API
  console.log('Test 1: Direct Shape API');
  try {
    const cube = Shape.cube(10);
    const geometry = cube.getGeometry();
    console.log(`  ✅ Created cube: ${geometry.stats.vertexCount} vertices, volume: ${geometry.stats.volume.toFixed(2)}`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 2: Transform chaining
  console.log('\nTest 2: Transform chaining');
  try {
    const cube = Shape.cube(10)
      .translate([5, 0, 0])
      .rotate([0, 0, 45])
      .scale(2);
    const geometry = cube.getGeometry();
    console.log(`  ✅ Transformed cube: ${geometry.stats.vertexCount} vertices`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 3: Boolean operations
  console.log('\nTest 3: Boolean operations');
  try {
    const cube = Shape.cube(20);
    const sphere = Shape.sphere(8);
    const result = cube.subtract(sphere);
    const geometry = result.getGeometry();
    console.log(`  ✅ Cube - Sphere: volume ${geometry.stats.volume.toFixed(2)}`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 4: JavaScript code evaluation
  console.log('\nTest 4: JavaScript code evaluation');
  try {
    const code = `
      import { Shape } from 'moicad';
      export default Shape.cube(10);
    `;
    const result = await evaluateJavaScript(code);
    if (result.success && result.geometry) {
      console.log(`  ✅ Evaluated JS code: ${result.geometry.stats.vertexCount} vertices, ${result.executionTime.toFixed(2)}ms`);
    } else {
      console.error(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 5: Complex design
  console.log('\nTest 5: Complex parametric design');
  try {
    const code = `
      import { Shape } from 'moicad';

      class Bolt {
        constructor(length, diameter) {
          this.length = length;
          this.diameter = diameter;
        }

        build() {
          return Shape.cylinder(this.length, this.diameter / 2)
            .union(
              Shape.sphere(this.diameter / 2)
                .translate([0, 0, this.length])
            );
        }
      }

      export default new Bolt(20, 5).build();
    `;
    const result = await evaluateJavaScript(code);
    if (result.success && result.geometry) {
      console.log(`  ✅ Parametric bolt: ${result.geometry.stats.vertexCount} vertices, volume ${result.geometry.stats.volume.toFixed(2)}`);
    } else {
      console.error(`  ❌ Failed:`, result.errors);
    }
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 6: Static union method
  console.log('\nTest 6: Static union method');
  try {
    const shapes = [
      Shape.cube(5),
      Shape.sphere(3).translate([10, 0, 0]),
      Shape.cylinder(8, 2).translate([20, 0, 0])
    ];
    const combined = Shape.union(...shapes);
    const geometry = combined.getGeometry();
    console.log(`  ✅ Combined 3 shapes: ${geometry.stats.vertexCount} vertices`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  console.log('\n✨ All tests completed!');
}

main().catch(console.error);
