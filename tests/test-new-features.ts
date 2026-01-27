/**
 * Test new manifold features: surface, text, projection, minkowski, offset
 */

import { evaluateAST, initManifoldEngine } from '../backend/scad/evaluator';
import { parseOpenSCAD } from '../backend/scad/parser';

async function runTest(name: string, code: string) {
  console.log(`\n--- Testing: ${name} ---`);
  console.log(`Code: ${code}`);

  try {
    const parseResult = parseOpenSCAD(code);
    if (!parseResult.success) {
      console.log(`❌ Parse failed:`, parseResult.errors);
      return false;
    }

    const result = await evaluateAST(parseResult.ast!);
    if (!result.success) {
      console.log(`❌ Eval failed:`, result.errors);
      return false;
    }

    const geom = result.geometry;
    console.log(`✅ Success: ${geom?.stats?.vertexCount} vertices, ${geom?.stats?.faceCount} faces`);

    // Check for warnings (not errors)
    if (result.errors && result.errors.length > 0) {
      console.log(`   Warnings:`, result.errors.map(e => e.message));
    }

    return true;
  } catch (error: any) {
    console.log(`❌ Exception: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Initializing manifold engine...');
  await initManifoldEngine();
  console.log('Manifold engine initialized.');

  let passed = 0;
  let total = 0;

  // Test 1: text()
  total++;
  if (await runTest('text() primitive', 'text("Hello");')) passed++;

  // Test 2: text() with size
  total++;
  if (await runTest('text() with size', 'text("Hi", size=20);')) passed++;

  // Test 3: minkowski()
  total++;
  if (await runTest('minkowski() operation', 'minkowski() { cube(10); sphere(2); }')) passed++;

  // Test 4: projection() with cut
  total++;
  if (await runTest('projection(cut=true)', 'projection(cut=true) sphere(10);')) passed++;

  // Test 5: projection() without cut
  total++;
  if (await runTest('projection(cut=false)', 'projection(cut=false) cube(10);')) passed++;

  // Test 6: offset() on 2D shape
  total++;
  if (await runTest('offset() operation', 'offset(r=2) square(10);')) passed++;

  // Test 7: complex minkowski
  total++;
  if (await runTest('minkowski() with cube+cylinder', 'minkowski() { cube(5); cylinder(r=1, h=1); }')) passed++;

  // Test 8: nested operations
  total++;
  if (await runTest('nested operations', `
    difference() {
      minkowski() {
        cube(10);
        sphere(1);
      }
      translate([5,5,5]) sphere(3);
    }
  `)) passed++;

  console.log(`\n=== Results: ${passed}/${total} tests passed ===`);

  if (passed < total) {
    process.exit(1);
  }
}

main().catch(console.error);
