#!/usr/bin/env bun

/**
 * Test hull() with linear_extrude shapes
 * This is the specific failing case that was reported
 */

import { parseOpenSCAD } from "./backend/scad-parser.ts";
import { evaluateAST, setWasmModule } from "./backend/scad-evaluator.ts";
import * as wasmModule from "./wasm/pkg/moicad_wasm.js";

// Initialize WASM module
await wasmModule.default();
setWasmModule(wasmModule);
console.log("WASM Initialized");

const testCases = [
  // The original failing case: hull of two linear_extrude shapes
  {
    name: "hull() - two linear_extrude squares",
    code: `hull() {
      linear_extrude(height=10) square(5);
      translate([20, 0, 0]) linear_extrude(height=10) square(5);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // Variant with different 2D shapes
  {
    name: "hull() - linear_extrude square and circle",
    code: `hull() {
      linear_extrude(height=10) square(5);
      translate([20, 0, 0]) linear_extrude(height=10) circle(3, $fn=16);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // Two circles (many coplanar points)
  {
    name: "hull() - two linear_extrude circles",
    code: `hull() {
      linear_extrude(height=10) circle(5, $fn=32);
      translate([20, 0, 0]) linear_extrude(height=10) circle(5, $fn=32);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // Different heights
  {
    name: "hull() - linear_extrude with different heights",
    code: `hull() {
      linear_extrude(height=5) square(5);
      translate([20, 0, 0]) linear_extrude(height=15) square(5);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // With slices parameter (more coplanar vertices)
  {
    name: "hull() - linear_extrude with slices",
    code: `hull() {
      linear_extrude(height=10, slices=20) square(5);
      translate([20, 0, 0]) linear_extrude(height=10, slices=20) square(5);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // Three linear_extrude shapes
  {
    name: "hull() - three linear_extrude shapes",
    code: `hull() {
      linear_extrude(height=10) square(5);
      translate([20, 0, 0]) linear_extrude(height=10) square(5);
      translate([10, 15, 0]) linear_extrude(height=10) circle(3, $fn=16);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // Mixed: linear_extrude and regular primitive
  {
    name: "hull() - linear_extrude and cube",
    code: `hull() {
      linear_extrude(height=10) square(5);
      translate([20, 0, 0]) cube(10);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // Mixed: linear_extrude and sphere
  {
    name: "hull() - linear_extrude and sphere",
    code: `hull() {
      linear_extrude(height=10) circle(5, $fn=16);
      translate([20, 0, 0]) sphere(5, $fn=16);
    }`,
    minVertices: 8,
    minFaces: 4,
  },

  // Edge case: very close linear_extrude shapes
  {
    name: "hull() - overlapping linear_extrude shapes",
    code: `hull() {
      linear_extrude(height=10) square(5);
      translate([3, 0, 0]) linear_extrude(height=10) square(5);
    }`,
    minVertices: 4,
    minFaces: 4,
  },

  // Edge case: identical linear_extrude shapes
  {
    name: "hull() - identical linear_extrude shapes",
    code: `hull() {
      linear_extrude(height=10) square(5);
      linear_extrude(height=10) square(5);
    }`,
    minVertices: 4,
    minFaces: 4,
  },
];

async function runTests() {
  console.log("=".repeat(60));
  console.log("Testing hull() with linear_extrude shapes");
  console.log("=".repeat(60));
  console.log("");

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);

      // Parse the code
      const parseResult = parseOpenSCAD(testCase.code);
      if (!parseResult.success) {
        const errMsgs = parseResult.errors
          .map((e) =>
            typeof e === "string" ? e : e.message || JSON.stringify(e),
          )
          .join(", ");
        console.log(`  PARSE FAILED: ${errMsgs}`);
        failed++;
        failures.push({
          name: testCase.name,
          error: `Parse failed: ${errMsgs}`,
        });
        continue;
      }

      // Evaluate the AST
      const startTime = Date.now();
      const evalResult = await evaluateAST(parseResult.ast, testCase.code);
      const elapsed = Date.now() - startTime;

      if (!evalResult.success) {
        const errMsgs = evalResult.errors
          .map((e) =>
            typeof e === "string" ? e : e.message || JSON.stringify(e),
          )
          .join(", ");
        console.log(`  EVAL FAILED: ${errMsgs}`);
        failed++;
        failures.push({
          name: testCase.name,
          error: `Eval failed: ${errMsgs}`,
        });
        continue;
      }

      // Check geometry
      const geometry = evalResult.geometry;
      if (!geometry || !geometry.vertices || geometry.vertices.length === 0) {
        console.log(`  FAILED: No geometry produced`);
        failed++;
        failures.push({ name: testCase.name, error: "No geometry produced" });
        continue;
      }

      const vertexCount =
        geometry.stats?.vertexCount ?? geometry.vertices.length;
      const faceCount =
        geometry.stats?.faceCount ?? Math.floor(geometry.indices.length / 3);

      // Validate minimum geometry
      if (vertexCount < testCase.minVertices) {
        console.log(
          `  FAILED: Too few vertices (${vertexCount} < ${testCase.minVertices})`,
        );
        failed++;
        failures.push({
          name: testCase.name,
          error: `Too few vertices: ${vertexCount}`,
        });
        continue;
      }

      if (faceCount < testCase.minFaces) {
        console.log(
          `  FAILED: Too few faces (${faceCount} < ${testCase.minFaces})`,
        );
        failed++;
        failures.push({
          name: testCase.name,
          error: `Too few faces: ${faceCount}`,
        });
        continue;
      }

      console.log(
        `  PASSED (${elapsed}ms) - ${vertexCount} vertices, ${faceCount} faces`,
      );
      passed++;
    } catch (error) {
      console.log(
        `  ERROR: ${error instanceof Error ? error.message : String(error)}`,
      );
      failed++;
      failures.push({
        name: testCase.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    console.log("");
  }

  // Print summary
  console.log("=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
