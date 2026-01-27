#!/usr/bin/env bun

/**
 * Test if normals point outward from the local surface
 */

import init, * as wasm from './wasm/pkg/moicad_wasm.js';

console.log('🔧 Testing if normals point outward from surface...\n');

await init();

// Create two spheres
const sphere1 = wasm.create_sphere(10.0, 32);
const sphere2 = wasm.create_sphere(10.0, 32);
const translatedSphere2 = wasm.translate(sphere2, 12.0, 0.0, 0.0);

// Perform difference
const result = wasm.difference(sphere1, translatedSphere2);
const geometry = JSON.parse(result.to_json());

console.log(`Testing ${geometry.indices.length / 3} triangles...\n`);

// For each triangle, check if the normal points outward
// A normal points outward if it points away from the triangle interior
// We can test this by checking neighboring triangles

let inwardCount = 0;
let samples = [];

for (let tri = 0; tri < geometry.indices.length / 3; tri++) {
    const i0 = geometry.indices[tri * 3] * 3;
    const i1 = geometry.indices[tri * 3 + 1] * 3;
    const i2 = geometry.indices[tri * 3 + 2] * 3;

    const v0 = [geometry.vertices[i0], geometry.vertices[i0 + 1], geometry.vertices[i0 + 2]];
    const v1 = [geometry.vertices[i1], geometry.vertices[i1 + 1], geometry.vertices[i1 + 2]];
    const v2 = [geometry.vertices[i2], geometry.vertices[i2 + 1], geometry.vertices[i2 + 2]];

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

    // Triangle center
    const center = [
        (v0[0] + v1[0] + v2[0]) / 3,
        (v0[1] + v1[1] + v2[1]) / 3,
        (v0[2] + v1[2] + v2[2]) / 3
    ];

    // Test point: move slightly in the normal direction
    const testDist = 0.01;
    const testPoint = [
        center[0] + faceNormal[0] * testDist,
        center[1] + faceNormal[1] * testDist,
        center[2] + faceNormal[2] * testDist
    ];

    // Count how many triangles the test point is "inside"
    // This is a simple heuristic - if test point is "more inside" than center,
    // then the normal points inward

    // For a sphere difference, we can use a simpler test:
    // Check distance to first sphere center (0,0,0) and second sphere center (12,0,0)
    const distToCenter1 = Math.sqrt(center[0]**2 + center[1]**2 + center[2]**2);
    const distToCenter2 = Math.sqrt((center[0]-12)**2 + center[1]**2 + center[2]**2);

    const testDistToCenter1 = Math.sqrt(testPoint[0]**2 + testPoint[1]**2 + testPoint[2]**2);
    const testDistToCenter2 = Math.sqrt((testPoint[0]-12)**2 + testPoint[1]**2 + testPoint[2]**2);

    // For the difference result, outward means:
    // - Away from sphere1 center (if on sphere1 surface)
    // - Toward sphere2 center (if on sphere2 cavity surface)

    // Simple test: is the triangle on the outer surface or inner cavity?
    const onOuterSurface = distToCenter1 > 5.0; // More than halfway to radius
    const onInnerCavity = distToCenter2 < 8.0;  // Close to sphere2

    let pointsInward = false;

    if (onOuterSurface) {
        // Should point away from center1
        pointsInward = testDistToCenter1 < distToCenter1;
    } else if (onInnerCavity) {
        // Should point toward center2 (into the cavity)
        pointsInward = testDistToCenter2 > distToCenter2;
    }

    if (pointsInward) {
        inwardCount++;
        if (samples.length < 5) {
            samples.push({
                tri,
                center,
                normal: faceNormal,
                onOuterSurface,
                onInnerCavity
            });
        }
    }
}

console.log(`Found ${inwardCount} triangles with inward-pointing normals\n`);

if (samples.length > 0) {
    console.log('Sample inward-pointing triangles:');
    samples.forEach(s => {
        console.log(`Triangle ${s.tri}: center=[${s.center.map(c=>c.toFixed(2)).join(', ')}]`);
        console.log(`  Normal: [${s.normal.map(n=>n.toFixed(3)).join(', ')}]`);
        console.log(`  Surface: ${s.onOuterSurface ? 'outer' : s.onInnerCavity ? 'cavity' : 'junction'}`);
    });
}

console.log('\n✅ Test complete');
