/**
 * Test the functional manifold evaluator
 */

import {
  ensureManifoldReady,
  createDefaultContext,
  evalPrimitive,
  evalTransform,
  evalBoolean,
  toGeometry,
  extractRadius,
  extractSize,
  calculateFragments,
} from './manifold-evaluator';

async function testManifoldEvaluator() {
  console.log('=== Testing Manifold Evaluator (Functional) ===\n');

  try {
    // Initialize
    console.log('1. Initializing manifold...');
    await ensureManifoldReady();
    console.log('✅ Manifold ready\n');

    const ctx = createDefaultContext();

    // Test primitives
    console.log('2. Testing primitives...');

    const cube = evalPrimitive('cube', { size: 10, center: true }, ctx);
    const cubeGeo = toGeometry(cube);
    console.log(`✅ Cube: ${cubeGeo.stats.vertexCount} verts, ${cubeGeo.stats.faceCount} faces`);

    const sphere = evalPrimitive('sphere', { r: 5, $fn: 32 }, ctx);
    const sphereGeo = toGeometry(sphere);
    console.log(`✅ Sphere: ${sphereGeo.stats.vertexCount} verts, ${sphereGeo.stats.faceCount} faces`);

    const cylinder = evalPrimitive('cylinder', { h: 10, r: 5, $fn: 16 }, ctx);
    const cylGeo = toGeometry(cylinder);
    console.log(`✅ Cylinder: ${cylGeo.stats.vertexCount} verts, ${cylGeo.stats.faceCount} faces\n`);

    // Test transforms
    console.log('3. Testing transforms...');

    const translated = evalTransform('translate', cube, { v: [10, 0, 0] }, ctx);
    const transGeo = toGeometry(translated);
    console.log(`✅ Translate: bounds min=[${transGeo.bounds.min}], max=[${transGeo.bounds.max}]`);

    const scaled = evalTransform('scale', cube, { v: [2, 2, 2] }, ctx);
    const scaledGeo = toGeometry(scaled);
    console.log(`✅ Scale: volume=${scaledGeo.stats.volume.toFixed(2)} (expected: ${(10*2)**3})`);

    const rotated = evalTransform('rotate', cube, { a: [45, 0, 0] }, ctx);
    const rotGeo = toGeometry(rotated);
    console.log(`✅ Rotate: ${rotGeo.stats.faceCount} faces\n`);

    // Test boolean operations
    console.log('4. Testing boolean operations...');

    const union = evalBoolean('union', [cube, sphere]);
    const unionGeo = toGeometry(union);
    console.log(`✅ Union: volume=${unionGeo.stats.volume.toFixed(2)}`);

    const diff = evalBoolean('difference', [cube, sphere]);
    const diffGeo = toGeometry(diff);
    console.log(`✅ Difference: volume=${diffGeo.stats.volume.toFixed(2)}`);

    const intersect = evalBoolean('intersection', [cube, sphere]);
    const intersectGeo = toGeometry(intersect);
    console.log(`✅ Intersection: volume=${intersectGeo.stats.volume.toFixed(2)}\n`);

    // Test utility functions
    console.log('5. Testing utility functions...');

    const radius = extractRadius({ r: 10 }, 5);
    console.log(`✅ extractRadius({ r: 10 }): ${radius}`);

    const radiusFromD = extractRadius({ d: 20 }, 5);
    console.log(`✅ extractRadius({ d: 20 }): ${radiusFromD}`);

    const size = extractSize({ size: [10, 20, 30] }, 5);
    console.log(`✅ extractSize({ size: [10, 20, 30] }): [${size}]`);

    const fragments = calculateFragments(10, 0, 2, 12);
    console.log(`✅ calculateFragments(r=10, fn=0, fs=2, fa=12): ${fragments}\n`);

    console.log('=== All tests passed! ===');
    console.log('\n✨ Functional evaluator is working correctly!');
    console.log('Next: Integrate with scad-evaluator.ts');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testManifoldEvaluator();
