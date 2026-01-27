#!/usr/bin/env bun

/**
 * Comprehensive mesh quality diagnostic for BSP difference() result
 */

import init, * as wasm from './wasm/pkg/moicad_wasm.js';

console.log('🔬 BSP Mesh Quality Diagnostic\n');
console.log('='.repeat(60));

await init();

// Create the problematic difference operation
const sphere1 = wasm.create_sphere(10.0, 32);
const sphere2 = wasm.create_sphere(10.0, 32);
const translatedSphere2 = wasm.translate(sphere2, 12.0, 0.0, 0.0);
const result = wasm.difference(sphere1, translatedSphere2);

const geometry = JSON.parse(result.to_json());

console.log(`\n📊 Basic Statistics:`);
console.log(`  Vertices: ${geometry.vertices.length / 3}`);
console.log(`  Triangles: ${geometry.indices.length / 3}`);
console.log(`  Normals: ${geometry.normals.length / 3}`);

// Test 1: Degenerate Triangles
console.log(`\n🔍 Test 1: Degenerate Triangles`);
let degenerateCount = 0;
let zeroAreaCount = 0;
let tinyAreaCount = 0;

for (let i = 0; i < geometry.indices.length; i += 3) {
    const i0 = geometry.indices[i] * 3;
    const i1 = geometry.indices[i + 1] * 3;
    const i2 = geometry.indices[i + 2] * 3;

    const v0 = [geometry.vertices[i0], geometry.vertices[i0 + 1], geometry.vertices[i0 + 2]];
    const v1 = [geometry.vertices[i1], geometry.vertices[i1 + 1], geometry.vertices[i1 + 2]];
    const v2 = [geometry.vertices[i2], geometry.vertices[i2 + 1], geometry.vertices[i2 + 2]];

    // Check for duplicate vertices
    const dist01 = Math.sqrt((v1[0]-v0[0])**2 + (v1[1]-v0[1])**2 + (v1[2]-v0[2])**2);
    const dist12 = Math.sqrt((v2[0]-v1[0])**2 + (v2[1]-v1[1])**2 + (v2[2]-v1[2])**2);
    const dist20 = Math.sqrt((v0[0]-v2[0])**2 + (v0[1]-v2[1])**2 + (v0[2]-v2[2])**2);

    if (dist01 < 1e-6 || dist12 < 1e-6 || dist20 < 1e-6) {
        degenerateCount++;
    }

    // Check triangle area
    const edge1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
    const edge2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];
    const cross = [
        edge1[1]*edge2[2] - edge1[2]*edge2[1],
        edge1[2]*edge2[0] - edge1[0]*edge2[2],
        edge1[0]*edge2[1] - edge1[1]*edge2[0]
    ];
    const area = Math.sqrt(cross[0]**2 + cross[1]**2 + cross[2]**2) / 2;

    if (area < 1e-10) {
        zeroAreaCount++;
    } else if (area < 1e-6) {
        tinyAreaCount++;
    }
}

console.log(`  Degenerate (duplicate vertices): ${degenerateCount}`);
console.log(`  Zero area (< 1e-10): ${zeroAreaCount}`);
console.log(`  Tiny area (< 1e-6): ${tinyAreaCount}`);
console.log(`  ${degenerateCount + zeroAreaCount > 0 ? '❌ FAIL' : '✅ PASS'}`);

// Test 2: Non-Manifold Edges
console.log(`\n🔍 Test 2: Non-Manifold Edges`);
const edgeMap = new Map();

for (let i = 0; i < geometry.indices.length; i += 3) {
    const i0 = geometry.indices[i];
    const i1 = geometry.indices[i + 1];
    const i2 = geometry.indices[i + 2];

    const edges = [
        [Math.min(i0, i1), Math.max(i0, i1)],
        [Math.min(i1, i2), Math.max(i1, i2)],
        [Math.min(i2, i0), Math.max(i2, i0)]
    ];

    for (const edge of edges) {
        const key = `${edge[0]},${edge[1]}`;
        edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }
}

let boundaryEdges = 0;
let manifoldEdges = 0;
let nonManifoldEdges = 0;

for (const count of edgeMap.values()) {
    if (count === 1) boundaryEdges++;
    else if (count === 2) manifoldEdges++;
    else nonManifoldEdges++;
}

console.log(`  Boundary edges (count=1): ${boundaryEdges}`);
console.log(`  Manifold edges (count=2): ${manifoldEdges}`);
console.log(`  Non-manifold edges (count>2): ${nonManifoldEdges}`);
console.log(`  ${nonManifoldEdges > 0 ? '⚠️  WARNING' : '✅ PASS'}`);

// Test 3: Duplicate Triangles
console.log(`\n🔍 Test 3: Duplicate Triangles`);
const triangleSet = new Set();
let duplicates = 0;

for (let i = 0; i < geometry.indices.length; i += 3) {
    const tri = [geometry.indices[i], geometry.indices[i+1], geometry.indices[i+2]].sort((a,b) => a-b);
    const key = tri.join(',');
    if (triangleSet.has(key)) {
        duplicates++;
    } else {
        triangleSet.add(key);
    }
}

console.log(`  Duplicate triangles: ${duplicates}`);
console.log(`  ${duplicates > 0 ? '⚠️  WARNING' : '✅ PASS'}`);

// Test 4: Overlapping/Coincident Triangles
console.log(`\n🔍 Test 4: Overlapping Triangles (Z-fighting potential)`);
const triangleCenters = [];

for (let i = 0; i < geometry.indices.length; i += 3) {
    const i0 = geometry.indices[i] * 3;
    const i1 = geometry.indices[i + 1] * 3;
    const i2 = geometry.indices[i + 2] * 3;

    const v0 = [geometry.vertices[i0], geometry.vertices[i0 + 1], geometry.vertices[i0 + 2]];
    const v1 = [geometry.vertices[i1], geometry.vertices[i1 + 1], geometry.vertices[i1 + 2]];
    const v2 = [geometry.vertices[i2], geometry.vertices[i2 + 1], geometry.vertices[i2 + 2]];

    const center = [
        (v0[0] + v1[0] + v2[0]) / 3,
        (v0[1] + v1[1] + v2[1]) / 3,
        (v0[2] + v1[2] + v2[2]) / 3
    ];

    triangleCenters.push(center);
}

let nearbyPairs = 0;
for (let i = 0; i < triangleCenters.length; i++) {
    for (let j = i + 1; j < Math.min(i + 100, triangleCenters.length); j++) {
        const dist = Math.sqrt(
            (triangleCenters[i][0] - triangleCenters[j][0])**2 +
            (triangleCenters[i][1] - triangleCenters[j][1])**2 +
            (triangleCenters[i][2] - triangleCenters[j][2])**2
        );
        if (dist < 0.01) {
            nearbyPairs++;
        }
    }
}

console.log(`  Triangle pairs with centers < 0.01 apart: ${nearbyPairs}`);
console.log(`  ${nearbyPairs > 100 ? '⚠️  WARNING' : '✅ PASS'}`);

// Test 5: Normal Consistency
console.log(`\n🔍 Test 5: Normal Consistency`);
let inconsistentNormals = 0;

for (let i = 0; i < geometry.indices.length; i += 3) {
    const i0 = geometry.indices[i] * 3;
    const i1 = geometry.indices[i + 1] * 3;
    const i2 = geometry.indices[i + 2] * 3;

    const v0 = [geometry.vertices[i0], geometry.vertices[i0 + 1], geometry.vertices[i0 + 2]];
    const v1 = [geometry.vertices[i1], geometry.vertices[i1 + 1], geometry.vertices[i1 + 2]];
    const v2 = [geometry.vertices[i2], geometry.vertices[i2 + 1], geometry.vertices[i2 + 2]];

    const n0 = [geometry.normals[i0], geometry.normals[i0 + 1], geometry.normals[i0 + 2]];

    // Calculate face normal from winding
    const edge1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
    const edge2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];
    const faceNormal = [
        edge1[1]*edge2[2] - edge1[2]*edge2[1],
        edge1[2]*edge2[0] - edge1[0]*edge2[2],
        edge1[0]*edge2[1] - edge1[1]*edge2[0]
    ];
    const faceLen = Math.sqrt(faceNormal[0]**2 + faceNormal[1]**2 + faceNormal[2]**2);

    if (faceLen < 1e-6) continue;

    faceNormal[0] /= faceLen;
    faceNormal[1] /= faceLen;
    faceNormal[2] /= faceLen;

    const dot = n0[0]*faceNormal[0] + n0[1]*faceNormal[1] + n0[2]*faceNormal[2];

    if (dot < 0.9) {
        inconsistentNormals++;
    }
}

console.log(`  Triangles with inconsistent normals: ${inconsistentNormals}`);
console.log(`  ${inconsistentNormals > 0 ? '⚠️  WARNING' : '✅ PASS'}`);

// Summary
console.log(`\n${'='.repeat(60)}`);
console.log(`📋 Summary:`);
console.log(`  ${degenerateCount + zeroAreaCount === 0 ? '✅' : '❌'} No degenerate triangles`);
console.log(`  ${nonManifoldEdges === 0 ? '✅' : '⚠️ '} ${nonManifoldEdges === 0 ? 'Manifold' : 'Non-manifold'} mesh`);
console.log(`  ${duplicates === 0 ? '✅' : '⚠️ '} No duplicate triangles`);
console.log(`  ${nearbyPairs < 100 ? '✅' : '⚠️ '} ${nearbyPairs < 100 ? 'Minimal' : 'Many'} overlapping triangles`);
console.log(`  ${inconsistentNormals === 0 ? '✅' : '⚠️ '} Normal consistency`);

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Diagnostic complete`);
