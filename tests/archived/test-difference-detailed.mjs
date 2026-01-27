#!/usr/bin/env bun

/**
 * Detailed test to understand normal calculations
 */

import init, * as wasm from './wasm/pkg/moicad_wasm.js';

console.log('🔧 Testing difference() normal calculation in detail...\n');

// Initialize WASM
await init();

// Create two spheres - same as user's test case
const sphere1 = wasm.create_sphere(10.0, 32);
const sphere2 = wasm.create_sphere(10.0, 32);

// Translate second sphere
const translatedSphere2 = wasm.translate(sphere2, 12.0, 0.0, 0.0);

// Perform difference
console.log('Computing difference() { sphere(r=10); translate([12,0,0]) sphere(r=10); }');
const result = wasm.difference(sphere1, translatedSphere2);

// Get geometry
const geometry = JSON.parse(result.to_json());

console.log('\n📊 Geometry Statistics:');
console.log(`  Vertices: ${geometry.vertices.length / 3}`);
console.log(`  Triangles: ${geometry.indices.length / 3}`);
console.log(`  Normals: ${geometry.normals ? geometry.normals.length / 3 : 0}`);

// Analyze first 10 triangles in detail
console.log('\n🔍 First 10 triangles analysis:');
for (let tri = 0; tri < Math.min(10, geometry.indices.length / 3); tri++) {
    const i0 = geometry.indices[tri * 3] * 3;
    const i1 = geometry.indices[tri * 3 + 1] * 3;
    const i2 = geometry.indices[tri * 3 + 2] * 3;

    const v0 = [geometry.vertices[i0], geometry.vertices[i0 + 1], geometry.vertices[i0 + 2]];
    const v1 = [geometry.vertices[i1], geometry.vertices[i1 + 1], geometry.vertices[i1 + 2]];
    const v2 = [geometry.vertices[i2], geometry.vertices[i2 + 1], geometry.vertices[i2 + 2]];

    const n0 = [geometry.normals[i0], geometry.normals[i0 + 1], geometry.normals[i0 + 2]];
    const n1 = [geometry.normals[i1], geometry.normals[i1 + 1], geometry.normals[i1 + 2]];
    const n2 = [geometry.normals[i2], geometry.normals[i2 + 1], geometry.normals[i2 + 2]];

    // Calculate face normal from triangle winding
    const edge1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
    const edge2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];
    const faceNormal = [
        edge1[1]*edge2[2] - edge1[2]*edge2[1],
        edge1[2]*edge2[0] - edge1[0]*edge2[2],
        edge1[0]*edge2[1] - edge1[1]*edge2[0]
    ];
    const faceLen = Math.sqrt(faceNormal[0]**2 + faceNormal[1]**2 + faceNormal[2]**2);
    faceNormal[0] /= faceLen;
    faceNormal[1] /= faceLen;
    faceNormal[2] /= faceLen;

    // Calculate triangle center
    const center = [
        (v0[0] + v1[0] + v2[0]) / 3,
        (v0[1] + v1[1] + v2[1]) / 3,
        (v0[2] + v1[2] + v2[2]) / 3
    ];

    // Average vertex normal
    const avgNormal = [
        (n0[0] + n1[0] + n2[0]) / 3,
        (n0[1] + n1[1] + n2[1]) / 3,
        (n0[2] + n1[2] + n2[2]) / 3
    ];

    // Check if vertex normal matches face normal
    const normalDot = avgNormal[0]*faceNormal[0] + avgNormal[1]*faceNormal[1] + avgNormal[2]*faceNormal[2];
    const direction = normalDot > 0 ? '✓ same' : '✗ opposite';

    console.log(`Triangle ${tri}: center=[${center.map(c=>c.toFixed(2)).join(', ')}]`);
    console.log(`  Face normal: [${faceNormal.map(n=>n.toFixed(3)).join(', ')}]`);
    console.log(`  Avg vertex normal: [${avgNormal.map(n=>n.toFixed(3)).join(', ')}]`);
    console.log(`  Direction: ${direction} (dot=${normalDot.toFixed(3)})`);
}

console.log('\n✅ Test complete');
