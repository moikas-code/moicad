#!/usr/bin/env bun

import { parseOpenSCAD } from '../backend/scad/parser.ts';
import { evaluateAST } from '../backend/scad/evaluator.ts';
import * as wasmModule from './wasm/pkg/moicad_wasm.js';

// Wait for WASM module to initialize
await wasmModule.default();

// Our hull-focused test cases
const hullTestCases = [
  {
    name: 'hull() - two spheres',
    code: 'hull() { translate([-10, 0, 0]) sphere(5); translate([10, 0, 0]) sphere(5); }'
  },
  {
    name: 'hull() - multiple points',
    code: 'hull() { translate([0, 0, 0]) sphere(2); translate([10, 0, 0]) sphere(2); translate([5, 8, 0]) sphere(2); }'
  },
  {
    name: 'hull() - cube and sphere',
    code: 'hull() { cube(10); translate([20,0,0]) sphere(5); }'
  },
  {
    name: 'hull() - multi-child',
    code: `hull() {
      cube(5);
      translate([10,0,0]) sphere(3);
      translate([0,10,0]) cylinder(3, 8, 16);
      translate([10,10,0]) cone(3, 8, 16);
      translate([5,5,10]) sphere(2);
    }`
  },
  {
    name: 'hull() - collinear points',
    code: `hull() {
      translate([0,0,0]) sphere(1);
      translate([5,0,0]) sphere(1);
      translate([10,0,0]) sphere(1);
      translate([15,0,0]) sphere(1);
    }`
  },
  {
    name: 'hull() - coplanar points',
    code: `hull() {
      translate([0,0,0]) sphere(1);
      translate([5,0,0]) sphere(1);
      translate([0,5,0]) sphere(1);
      translate([5,5,0]) sphere(1);
    }`
  },
  {
    name: 'hull() - single child',
    code: 'hull() { sphere(10); }'
  },
  {
    name: 'hull() - nested hulls',
    code: `hull() {
      hull() {
        translate([0,0,0]) sphere(5);
        translate([10,0,0]) sphere(3);
      }
      translate([0,10,0]) cube(5);
    }`
  }
];

async function runHullTests() {
  console.log('Running hull-specific tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of hullTestCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      console.log(`Code: ${testCase.code.substring(0, 60)}${testCase.code.length > 60 ? '...' : ''}`);
      
      // Parse the code
      const parseResult = parseOpenSCAD(testCase.code);
      if (!parseResult.success) {
        console.log('❌ Parse failed:', parseResult.errors);
        failed++;
        continue;
      }
      
      console.log('✅ Parse successful');
      
      // Evaluate the AST
      const startTime = Date.now();
      const evaluateResult = await evaluateAST(parseResult.ast, testCase.code);
      const elapsed = Date.now() - startTime;
      
      if (evaluateResult.success) {
        console.log(`✅ Evaluation successful (${elapsed}ms)`);
        console.log(`  Vertex count: ${evaluateResult.geometry?.stats?.vertexCount ?? 'N/A'}`);
        console.log(`  Face count: ${evaluateResult.geometry?.stats?.faceCount ?? 'N/A'}`);
        passed++;
      } else {
        console.log('❌ Evaluation failed:', evaluateResult.errors);
        failed++;
      }
    } catch (error) {
      console.log('❌ Exception occurred:', error instanceof Error ? error.message : String(error));
      failed++;
    }
    console.log('');
  }
  
  console.log('=' .repeat(50));
  console.log(`Tests completed: ${passed} passed, ${failed} failed`);
  console.log('=' .repeat(50));
}

// Run the tests
runHullTests().catch(console.error);
