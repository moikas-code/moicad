#!/usr/bin/env bun

import { parseOpenSCAD } from '../backend/scad/parser.js';
import { evaluateAST } from '../backend/scad/evaluator.js';
import { initializeWASM } from '../backend/core/index.js';

// Initialize WASM module
const wasmModule = await initializeWASM();
console.log("WASM Initialized:", !!wasmModule);

// Test cases
const testCases = [
  // Test Case 1: Simple hull case
  {
    name: "Simple hull case",
    code: "hull() { cube(10); translate([20,0,0]) sphere(5); }",
    description: "Basic hull between a cube and a sphere"
  },
  
  // Test Case 2: Complex multi-child hull
  {
    name: "Multi-child hull",
    code: `hull() {
      cube(5);
      translate([10,0,0]) sphere(3);
      translate([0,10,0]) cylinder(3, 8, 16);
    }`,
    description: "Hull with multiple children"
  },
  
  // Test Case 3: Degenerate hull cases
  {
    name: "Degenerate hull: Points on a line",
    code: `hull() {
      translate([0,0,0]) sphere(1);
      translate([5,0,0]) sphere(1);
      translate([10,0,0]) sphere(1);
    }`,
    description: "Hull of collinear points"
  },
  
  // Test Case 4: Single child hull
  {
    name: "Single child hull",
    code: "hull() { sphere(10); }",
    description: "Hull with a single child"
  }
];

// Function to test a single case
async function testHullCase(testCase) {
  console.log(`\n=== Testing: ${testCase.name} ===`);
  console.log(`${testCase.description}`);
  console.log(`Code: ${testCase.code.substring(0, 60)}${testCase.code.length > 60 ? '...' : ''}`);
  
  try {
    // Parse the code
    const parseResult = parseOpenSCAD(testCase.code);
    if (!parseResult.success) {
      console.log("✗ PARSE FAILED");
      console.log(`  - Errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
      return;
    }
    
    console.log("✓ Parsed successfully");
    
    // Evaluate the AST
    const startTime = Date.now();
    const evaluateResult = await evaluateAST(parseResult.ast, testCase.code);
    const elapsed = Date.now() - startTime;
    
    if (evaluateResult.success) {
      console.log("✓ EVALUATED SUCCESSFULLY");
      console.log(`  - Execution time: ${elapsed}ms`);
      console.log(`  - Vertex count: ${evaluateResult.geometry?.stats?.vertexCount ?? 'N/A'}`);
      console.log(`  - Face count: ${evaluateResult.geometry?.stats?.faceCount ?? 'N/A'}`);
    } else {
      console.log("✗ EVALUATION FAILED");
      console.log(`  - Errors: ${evaluateResult.errors.map(e => e.message).join(', ')}`);
    }
  } catch (error) {
    console.log("✗ EXCEPTION");
    console.log(`  - Exception: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Run all test cases
async function runAllTests() {
  console.log("Running hull behavior test cases...");
  
  for (const testCase of testCases) {
    await testHullCase(testCase);
  }
  
  console.log("\n=== Test Summary ===");
  console.log("Completed hull behavior tests. Review results above for any issues.");
}

// Run the tests
runAllTests().catch(console.error);
