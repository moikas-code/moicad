/**
 * Quick test for functional API
 * Run with: bun run test-functional-api.ts
 */

import { cube, sphere, translate, union, difference } from './backend/javascript/index';
import { initManifold } from './backend/manifold/engine';

async function main() {
  console.log('🧪 Testing moicad Functional API...\n');

  await initManifold();
  console.log('✅ Manifold engine initialized\n');

  // Test 1: Functional union
  console.log('Test 1: Functional union');
  try {
    const combined = union(
      cube(10),
      translate([15, 0, 0], sphere(5))
    );
    const geometry = combined.getGeometry();
    console.log(`  ✅ Union: ${geometry.stats.vertexCount} vertices, volume ${geometry.stats.volume.toFixed(2)}`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  // Test 2: Functional difference
  console.log('\nTest 2: Functional difference');
  try {
    const result = difference(
      cube([20, 20, 10]),
      translate([10, 10, 0], sphere(8))
    );
    const geometry = result.getGeometry();
    console.log(`  ✅ Difference: ${geometry.stats.vertexCount} vertices, volume ${geometry.stats.volume.toFixed(2)}`);
  } catch (error: any) {
    console.error(`  ❌ Failed:`, error.message);
  }

  console.log('\n✨ Functional API tests completed!');
}

main().catch(console.error);
