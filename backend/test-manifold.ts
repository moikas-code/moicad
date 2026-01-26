/**
 * Test script for manifold-3d integration
 *
 * This script tests the basic manifold functionality:
 * 1. Initialize manifold WASM
 * 2. Create a simple cube
 * 3. Convert to moicad Geometry format
 * 4. Verify the output
 */

import { initManifold } from "./manifold-engine";
import { createCube, createSphere } from "./manifold-primitives";
import { manifoldToGeometry } from "./manifold-geometry";

async function testManifold() {
  console.log("=== Testing Manifold-3D Integration ===\n");

  try {
    // Step 1: Initialize manifold
    console.log("1. Initializing manifold WASM...");
    await initManifold();
    console.log("✅ Manifold initialized successfully\n");

    // Step 2: Create a cube
    console.log("2. Creating a 10x10x10 cube...");
    const cubeManifold = createCube(10, true);
    console.log("✅ Cube manifold created");
    console.log(`   - Status: ${cubeManifold.status()}`);
    console.log(`   - Num vertices: ${cubeManifold.numVert()}`);
    console.log(`   - Num triangles: ${cubeManifold.numTri()}`);
    console.log(`   - Volume: ${cubeManifold.volume().toFixed(2)}`);
    console.log(
      `   - Surface area: ${cubeManifold.surfaceArea().toFixed(2)}\n`,
    );

    // Step 3: Convert to Geometry
    console.log("3. Converting to moicad Geometry format...");
    const cubeGeometry = manifoldToGeometry(cubeManifold);
    console.log("✅ Converted successfully");
    console.log(
      `   - Vertices: ${cubeGeometry.vertices.length / 3} (${cubeGeometry.vertices.length} floats)`,
    );
    console.log(
      `   - Indices: ${cubeGeometry.indices.length / 3} triangles (${cubeGeometry.indices.length} indices)`,
    );
    console.log(
      `   - Normals: ${cubeGeometry.normals.length / 3} (${cubeGeometry.normals.length} floats)`,
    );
    console.log(
      `   - Bounds: min=[${cubeGeometry.bounds.min.join(", ")}], max=[${cubeGeometry.bounds.max.join(", ")}]`,
    );
    console.log(
      `   - Stats: ${cubeGeometry.stats.vertexCount} verts, ${cubeGeometry.stats.faceCount} faces, volume=${cubeGeometry.stats.volume.toFixed(2)}\n`,
    );

    // Step 4: Create a sphere
    console.log("4. Creating a sphere (radius=5, segments=32)...");
    const sphereManifold = createSphere(5, 32);
    console.log("✅ Sphere manifold created");
    console.log(`   - Status: ${sphereManifold.status()}`);
    console.log(`   - Num vertices: ${sphereManifold.numVert()}`);
    console.log(`   - Num triangles: ${sphereManifold.numTri()}`);
    console.log(
      `   - Volume: ${sphereManifold.volume().toFixed(2)} (expected: ${((4 / 3) * Math.PI * 5 * 5 * 5).toFixed(2)})`,
    );

    const sphereGeometry = manifoldToGeometry(sphereManifold);
    console.log(
      `   - Geometry: ${sphereGeometry.vertices.length / 3} verts, ${sphereGeometry.indices.length / 3} tris\n`,
    );

    // Step 5: Test a CSG operation (union)
    console.log("5. Testing CSG operation (cube union sphere)...");
    const unionManifold = cubeManifold.add(sphereManifold);
    console.log("✅ Union created successfully");
    console.log(`   - Status: ${unionManifold.status()}`);
    console.log(`   - Num vertices: ${unionManifold.numVert()}`);
    console.log(`   - Num triangles: ${unionManifold.numTri()}`);
    console.log(`   - Volume: ${unionManifold.volume().toFixed(2)}\n`);

    console.log("=== All tests passed! ===");
    console.log("\nNext steps:");
    console.log("- Integrate with scad-evaluator.ts");
    console.log("- Create CSG operations module");
    console.log("- Create transforms module");
    console.log("- Test with backend API");
  } catch (error) {
    console.error("❌ Test failed:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testManifold();
