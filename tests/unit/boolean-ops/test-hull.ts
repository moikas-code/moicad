#!/usr/bin/env bun
/**
 * Comprehensive test cases for hull behavior in moicad
 * Tests various edge cases to identify potential degradation scenarios
 */

import { parseAndEvaluate } from './backend/scad-evaluator';
import { initializeWASM } from './backend/index';

// Initialize WASM first
await initializeWASM();

interface TestCase {
  name: string;
  code: string;
  description: string;
  expectSuccess?: boolean;
}

const testCases: TestCase[] = [
  // Test Case 1: Simple hull case
  {
    name: "Simple hull case",
    code: "hull() { cube(10); translate([20,0,0]) sphere(5); }",
    description: "Basic hull between a cube and a sphere. Should produce a smooth convex hull connecting both shapes."
  },
  
  // Test Case 2: Complex multi-child hull
  {
    name: "Complex multi-child hull",
    code: `hull() {
      cube(5);
      translate([10,0,0]) sphere(3);
      translate([0,10,0]) cylinder(3, 8, 16);
      translate([10,10,0]) cone(3, 8, 16);
      translate([5,5,10]) sphere(2);
      translate([0,0,10]) cube([2,2,2]);
      translate([10,0,10]) sphere(1);
      translate([0,10,10]) cylinder(1, 4, 16);
      translate([10,10,10]) cone(1, 4, 16);
      translate([5,0,5]) sphere(1);
      translate([0,5,5]) cube([1,1,1]);
      translate([10,5,5]) cylinder(0.5, 2, 16);
    }`,
    description: "Hull with many children (>10 objects). Tests performance and correctness of the hull algorithm with complex inputs."
  },
  
  // Test Case 3: Degenerate hull cases
  {
    name: "Degenerate hull: Points on a line",
    code: `hull() {
      translate([0,0,0]) sphere(1);
      translate([5,0,0]) sphere(1);
      translate([10,0,0]) sphere(1);
      translate([15,0,0]) sphere(1);
    }`,
    description: "Hull of points lying on a straight line. Should produce a thin hull connecting the endpoints."
  },
  
  {
    name: "Degenerate hull: Coplanar points",
    code: `hull() {
      translate([0,0,0]) sphere(1);
      translate([5,0,0]) sphere(1);
      translate([0,5,0]) sphere(1);
      translate([5,5,0]) sphere(1);
    }`,
    description: "Hull of coplanar points. Should produce a flat hull in the XY plane."
  },
  
  {
    name: "Degenerate hull: Nearly identical objects",
    code: `hull() {
      translate([0,0,0]) sphere(5);
      translate([0.1,0.1,0.1]) sphere(5);
      translate([0.2,0.2,0.2]) sphere(5);
    }`,
    description: "Hull with nearly identical objects. Should handle near-degenerate cases gracefully."
  },
  
  // Test Case 4: Large geometry hull
  {
    name: "Large geometry hull",
    code: "hull() { sphere(10, \$fn=100); translate([30,0,0]) sphere(10, \$fn=100); }",
    description: "Hull with high-detail spheres (thousands of vertices each). Tests performance with large inputs."
  },
  
  // Test Case 5: Nested hull
  {
    name: "Nested hull",
    code: `hull() {
      hull() {
        translate([0,0,0]) sphere(5);
        translate([10,0,0]) sphere(3);
      }
      translate([0,10,0]) cube(5);
    }`,
    description: "Nested hull operations. Tests the behavior when hull() contains another hull()."
  },
  
  // Additional edge cases
  
  // Empty hull
  {
    name: "Empty hull",
    code: "hull() {}",
    description: "Hull with no children. Should produce empty or minimal geometry.",
    expectSuccess: true // Depending on implementation, this might be valid
  },
  
  // Single child hull
  {
    name: "Single child hull",
    code: "hull() { sphere(10); }",
    description: "Hull with a single child. Should behave like identity operation (return the child unchanged)."
  },
  
  // Hull with zero-volume objects
  {
    name: "Hull with zero-volume objects",
    code: `hull() {
      translate([0,0,0]) sphere(0);
      translate([10,0,0]) sphere(0);
    }`,
    description: "Hull with zero-sized objects. Tests robustness with degenerate inputs."
  },
  
  // Hull with transformed objects
  {
    name: "Hull with scaled objects",
    code: `hull() {
      scale([2,1,1]) sphere(5);
      translate([15,0,0]) scale([0.5,0.5,0.5]) sphere(10);
    }`,
    description: "Hull with non-uniformly scaled objects. Tests transformation handling in hull computation."
  }
];

async function runTestCase(testCase: TestCase): Promise<void> {
  console.log(`\n=== Testing: \${testCase.name} ===`);
  console.log(`Description: \${testCase.description}`);
  console.log(`Code: \${testCase.code}`);
  
  try {
    const result = await parseAndEvaluate(testCase.code);
    
    if (result.success) {
      console.log("✓ SUCCESS");
      console.log(`  - Execution time: \${result.executionTime?.toFixed(2)}ms`);
      console.log(`  - Vertex count: \${result.geometry?.stats?.vertexCount ?? 'N/A'}`);
      console.log(`  - Face count: \${result.geometry?.stats?.faceCount ?? 'N/A'}`);
      
      // Check if geometry seems reasonable
      if (result.geometry?.vertices && result.geometry.vertices.length > 0) {
        console.log("  - Generated geometry with vertices and indices");
      } else {
        console.log("  - Generated geometry appears empty or invalid");
      }
    } else {
      console.log("✗ FAILED");
      console.log(`  - Errors: \${result.errors.join(', ')}`);
    }
  } catch (error) {
    console.log("✗ ERROR");
    console.log(`  - Exception: \${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runAllTests(): Promise<void> {
  console.log("Running hull behavior test cases...\\n");
  
  for (const testCase of testCases) {
    await runTestCase(testCase);
  }
  
  console.log("\\n=== Test Summary ===");
  console.log("Check results above to identify any issues with hull behavior.");
  console.log("If any test case fails unexpectedly, investigate the hull implementation.");
}

// Run the tests
runAllTests().catch(console.error);
