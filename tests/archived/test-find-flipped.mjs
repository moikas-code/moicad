#!/usr/bin/env bun

/**
 * Find where the flipped normals are in the mesh
 */

import init, * as wasm from './wasm/pkg/moicad_wasm.js';

console.log('🔧 Finding flipped normals in difference() result...\n');

// Initialize WASM
await init();

// Create two spheres
const sphere1 = wasm.create_sphere(10.0, 32);
const sphere2 = wasm.create_sphere(10.0, 32);
const translatedSphere2 = wasm.translate(sphere2, 12.0, 0.0, 0.0);

// Perform difference
const result = wasm.difference(sphere1, translatedSphere2);
const geometry = JSON.parse(result.to_json());

console.log(`Total triangles: ${geometry.indices.length / 3}\n`);

// Find triangles where face normal doesn't match vertex normal direction
let mismatchCount = 0;
const mismatches = [];

for (let tri = 0; tri < geometry.indices.length / 3; tri++) {
    const i0 = geometry.indices[tri * 3] * 3;
    const i1 = geometry.indices[tri * 3 + 1] * 3;
    const i2 = geometry.indices[tri * 3 + 2] * 3;

    const v0 = [geometry.vertices[i0], geometry.vertices[i0 + 1], geometry.vertices[i0 + 2]];
    const v1 = [geometry.vertices[i1], geometry.vertices[i1 + 1], geometry.vertices[i1 + 2]];
    const v2 = [geometry.vertices[i2], geometry.vertices[i2 + 1], geometry.vertices[i2 + 2]];

    const n0 = [geometry.normals[i0], geometry.normals[i0 + 1], geometry.normals[i0 + 2]];

    // Calculate face normal from triangle winding
    const edge1 = [v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2]];
    const edge2 = [v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2]];
    const faceNormal = [
        edge1[1]*edge2[2] - edge1[2]*edge2[1],
        edge1[2]*edge2[0] - edge1[0]*edge2[2],
        edge1[0]*edge2[1] - edge1[1]*edge2[0]
    ];
    const faceLen = Math.sqrt(faceNormal[0]**2 + faceNormal[1]**2 + faceNormal[2]**2);

    if (faceLen < 1e-6) continue; // Skip degenerate triangles

    faceNormal[0] /= faceLen;
    faceNormal[1] /= faceLen;
    faceNormal[2] /= faceLen;

    // Check if vertex normal opposes face normal
    const normalDot = n0[0]*faceNormal[0] + n0[1]*faceNormal[1] + n0[2]*faceNormal[2];

    if (normalDot < 0) {
        mismatchCount++;
        if (mismatches.length < 5) {
            const center = [(v0[0]+v1[0]+v2[0])/3, (v0[1]+v1[1]+v2[1])/3, (v0[2]+v1[2]+v2[2])/3];
            mismatches.push({
                tri,
                center,
                faceNormal,
                vertexNormal: n0,
                dot: normalDot
            });
        }
    }
}

console.log(`Found ${mismatchCount} triangles where vertex normal opposes face normal (${(mismatchCount/(geometry.indices.length/3)*100).toFixed(1)}%)\n`);

if (mismatches.length > 0) {
    console.log('First 5 mismatches:');
    mismatches.forEach(m => {
        console.log(`\nTriangle ${m.tri}: center=[${m.center.map(c=>c.toFixed(2)).join(', ')}]`);
        console.log(`  Face normal: [${m.faceNormal.map(n=>n.toFixed(3)).join(', ')}]`);
        console.log(`  Vertex normal: [${m.vertexNormal.map(n=>n.toFixed(3)).join(', ')}]`);
        console.log(`  Dot product: ${m.dot.toFixed(3)} (negative = opposing)`);
    });
} else {
    console.log('✅ No mismatches found! All vertex normals match face normals.');
}

console.log('\n✅ Test complete');
