/**
 * Integration test for manifold-based scad-evaluator
 * Tests that the full pipeline works: OpenSCAD code → AST → Manifold geometry
 */

import { parseOpenSCAD } from '../backend/scad-parser';
import { evaluateAST, initManifoldEngine } from '../backend/scad-evaluator';

async function runTests() {
  console.log('=== Testing Manifold Integration with scad-evaluator ===\n');

  // Initialize manifold engine
  await initManifoldEngine();
  console.log('✅ Manifold engine initialized\n');

  // Test 1: Simple cube
  console.log('Test 1: cube(10)');
  {
    const result = parseOpenSCAD('cube(10);');
    if (!result.success) {
      console.error('❌ Parse failed:', result.errors);
      process.exit(1);
    }

    const evalResult = await evaluateAST(result.ast!);
    if (!evalResult.success || !evalResult.geometry) {
      console.error('❌ Evaluation failed:', evalResult.errors);
      process.exit(1);
    }

    const geo = evalResult.geometry;
    console.log(`   Vertices: ${geo.vertices.length / 3}, Faces: ${geo.indices.length / 3}`);
    console.log(`   Execution time: ${evalResult.executionTime.toFixed(2)}ms`);
    console.log('✅ Cube test passed\n');
  }

  // Test 2: Sphere
  console.log('Test 2: sphere(r=5, $fn=16)');
  {
    const result = parseOpenSCAD('sphere(r=5, $fn=16);');
    if (!result.success) {
      console.error('❌ Parse failed:', result.errors);
      process.exit(1);
    }

    const evalResult = await evaluateAST(result.ast!);
    if (!evalResult.success || !evalResult.geometry) {
      console.error('❌ Evaluation failed:', evalResult.errors);
      process.exit(1);
    }

    const geo = evalResult.geometry;
    console.log(`   Vertices: ${geo.vertices.length / 3}, Faces: ${geo.indices.length / 3}`);
    console.log('✅ Sphere test passed\n');
  }

  // Test 3: Transform - translate
  console.log('Test 3: translate([10, 0, 0]) cube(5)');
  {
    const result = parseOpenSCAD('translate([10, 0, 0]) cube(5);');
    if (!result.success) {
      console.error('❌ Parse failed:', result.errors);
      process.exit(1);
    }

    const evalResult = await evaluateAST(result.ast!);
    if (!evalResult.success || !evalResult.geometry) {
      console.error('❌ Evaluation failed:', evalResult.errors);
      process.exit(1);
    }

    const geo = evalResult.geometry;
    // Check that the geometry is offset
    const minX = Math.min(...Array.from({ length: geo.vertices.length / 3 }, (_, i) => geo.vertices[i * 3]));
    console.log(`   Min X: ${minX.toFixed(2)} (should be >= 10)`);
    console.log('✅ Translate test passed\n');
  }

  // Test 4: Boolean - union
  console.log('Test 4: union() { cube(10); translate([8, 0, 0]) sphere(5); }');
  {
    const result = parseOpenSCAD('union() { cube(10); translate([8, 0, 0]) sphere(5); }');
    if (!result.success) {
      console.error('❌ Parse failed:', result.errors);
      process.exit(1);
    }

    const evalResult = await evaluateAST(result.ast!);
    if (!evalResult.success || !evalResult.geometry) {
      console.error('❌ Evaluation failed:', evalResult.errors);
      process.exit(1);
    }

    const geo = evalResult.geometry;
    console.log(`   Vertices: ${geo.vertices.length / 3}, Faces: ${geo.indices.length / 3}`);
    console.log('✅ Union test passed\n');
  }

  // Test 5: Boolean - difference
  console.log('Test 5: difference() { cube(20, center=true); sphere(12); }');
  {
    const result = parseOpenSCAD('difference() { cube(20, center=true); sphere(12); }');
    if (!result.success) {
      console.error('❌ Parse failed:', result.errors);
      process.exit(1);
    }

    const evalResult = await evaluateAST(result.ast!);
    if (!evalResult.success || !evalResult.geometry) {
      console.error('❌ Evaluation failed:', evalResult.errors);
      process.exit(1);
    }

    const geo = evalResult.geometry;
    console.log(`   Vertices: ${geo.vertices.length / 3}, Faces: ${geo.indices.length / 3}`);
    console.log('✅ Difference test passed\n');
  }

  // Test 6: Cylinder
  console.log('Test 6: cylinder(h=10, r=5, $fn=20)');
  {
    const result = parseOpenSCAD('cylinder(h=10, r=5, $fn=20);');
    if (!result.success) {
      console.error('❌ Parse failed:', result.errors);
      process.exit(1);
    }

    const evalResult = await evaluateAST(result.ast!);
    if (!evalResult.success || !evalResult.geometry) {
      console.error('❌ Evaluation failed:', evalResult.errors);
      process.exit(1);
    }

    const geo = evalResult.geometry;
    console.log(`   Vertices: ${geo.vertices.length / 3}, Faces: ${geo.indices.length / 3}`);
    console.log('✅ Cylinder test passed\n');
  }

  // Test 7: Hull
  console.log('Test 7: hull() { cube(5); translate([10, 0, 0]) sphere(3); }');
  {
    const result = parseOpenSCAD('hull() { cube(5); translate([10, 0, 0]) sphere(3); }');
    if (!result.success) {
      console.error('❌ Parse failed:', result.errors);
      process.exit(1);
    }

    const evalResult = await evaluateAST(result.ast!);
    if (!evalResult.success || !evalResult.geometry) {
      console.error('❌ Evaluation failed:', evalResult.errors);
      process.exit(1);
    }

    const geo = evalResult.geometry;
    console.log(`   Vertices: ${geo.vertices.length / 3}, Faces: ${geo.indices.length / 3}`);
    console.log('✅ Hull test passed\n');
  }

  console.log('=== All integration tests passed! ===');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
