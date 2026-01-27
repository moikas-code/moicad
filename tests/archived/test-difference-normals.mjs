#!/usr/bin/env bun

/**
 * Test to verify difference() geometry and normals
 */

import init, * as wasm from "./wasm/pkg/moicad_wasm.js";

console.log("🔧 Testing difference() geometry and normals...\n");

// Initialize WASM
await init();
if (wasm.set_panic_hook) {
  wasm.set_panic_hook();
}

// Create two spheres - same as user's test case
const sphere1 = wasm.create_sphere(10.0, 32);
const sphere2 = wasm.create_sphere(10.0, 32);

// Translate second sphere
const translatedSphere2 = wasm.translate(sphere2, 12.0, 0.0, 0.0);

// Perform difference
console.log(
  "Computing difference() { sphere(r=10); translate([12,0,0]) sphere(r=10); }",
);
const result = wasm.difference(sphere1, translatedSphere2);

// Get geometry
const geometry = JSON.parse(result.to_json());

console.log("\n📊 Geometry Statistics:");
console.log(`  Vertices: ${geometry.vertices.length / 3}`);
console.log(`  Triangles: ${geometry.indices.length / 3}`);
console.log(`  Normals: ${geometry.normals ? geometry.normals.length / 3 : 0}`);

// Check for degenerate triangles
let degenerateCount = 0;
let zeroAreaCount = 0;
for (let i = 0; i < geometry.indices.length; i += 3) {
  const i0 = geometry.indices[i] * 3;
  const i1 = geometry.indices[i + 1] * 3;
  const i2 = geometry.indices[i + 2] * 3;

  const v0 = [
    geometry.vertices[i0],
    geometry.vertices[i0 + 1],
    geometry.vertices[i0 + 2],
  ];
  const v1 = [
    geometry.vertices[i1],
    geometry.vertices[i1 + 1],
    geometry.vertices[i1 + 2],
  ];
  const v2 = [
    geometry.vertices[i2],
    geometry.vertices[i2 + 1],
    geometry.vertices[i2 + 2],
  ];

  // Check for duplicate vertices
  const v0v1 = Math.sqrt(
    (v1[0] - v0[0]) ** 2 + (v1[1] - v0[1]) ** 2 + (v1[2] - v0[2]) ** 2,
  );
  const v1v2 = Math.sqrt(
    (v2[0] - v1[0]) ** 2 + (v2[1] - v1[1]) ** 2 + (v2[2] - v1[2]) ** 2,
  );
  const v2v0 = Math.sqrt(
    (v0[0] - v2[0]) ** 2 + (v0[1] - v2[1]) ** 2 + (v0[2] - v2[2]) ** 2,
  );

  if (v0v1 < 1e-6 || v1v2 < 1e-6 || v2v0 < 1e-6) {
    degenerateCount++;
  }

  // Check for zero-area triangles
  const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
  const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
  const cross = [
    edge1[1] * edge2[2] - edge1[2] * edge2[1],
    edge1[2] * edge2[0] - edge1[0] * edge2[2],
    edge1[0] * edge2[1] - edge1[1] * edge2[0],
  ];
  const area = Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2) / 2;

  if (area < 1e-6) {
    zeroAreaCount++;
  }
}

console.log(`\n🔍 Geometry Quality:`);
console.log(`  Degenerate triangles (duplicate vertices): ${degenerateCount}`);
console.log(`  Zero-area triangles: ${zeroAreaCount}`);

// Check normals
if (geometry.normals) {
  let invalidNormals = 0;
  let flippedNormals = 0;

  for (let i = 0; i < geometry.normals.length; i += 3) {
    const nx = geometry.normals[i];
    const ny = geometry.normals[i + 1];
    const nz = geometry.normals[i + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

    // Check if normal is normalized
    if (Math.abs(len - 1.0) > 0.01) {
      invalidNormals++;
    }

    // Check if normal points inward (negative for a sphere centered near origin)
    const vx = geometry.vertices[i];
    const vy = geometry.vertices[i + 1];
    const vz = geometry.vertices[i + 2];
    const dot = nx * vx + ny * vy + nz * vz;

    if (dot < 0) {
      flippedNormals++;
    }
  }

  console.log(`\n🧭 Normal Quality:`);
  console.log(`  Invalid (not normalized): ${invalidNormals}`);
  console.log(`  Potentially flipped: ${flippedNormals}`);
}

// Sample some vertices and normals
console.log(`\n📍 Sample vertices and normals (first 3):`);
for (let i = 0; i < Math.min(3, geometry.vertices.length / 3); i++) {
  const vi = i * 3;
  const v = [
    geometry.vertices[vi].toFixed(3),
    geometry.vertices[vi + 1].toFixed(3),
    geometry.vertices[vi + 2].toFixed(3),
  ];
  const n = geometry.normals
    ? [
        geometry.normals[vi].toFixed(3),
        geometry.normals[vi + 1].toFixed(3),
        geometry.normals[vi + 2].toFixed(3),
      ]
    : ["N/A", "N/A", "N/A"];

  console.log(`  Vertex ${i}: [${v.join(", ")}]  Normal: [${n.join(", ")}]`);
}

console.log("\n✅ Test complete");
