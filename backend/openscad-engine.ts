/**
 * OpenSCAD WASM Engine
 * Uses the official OpenSCAD WASM port for accurate geometry generation
 */

import { createOpenSCAD, type OpenSCADInstance } from "openscad-wasm";
import type { Geometry } from "../shared/types";

let openscadInstance: OpenSCADInstance | null = null;

/**
 * Initialize the OpenSCAD WASM instance
 */
export async function initOpenSCAD(): Promise<void> {
  if (openscadInstance) return;

  try {
    openscadInstance = await createOpenSCAD({
      noInitialRun: true,
      print: (text: string) => console.log(`[OpenSCAD]: ${text}`),
      printErr: (text: string) => console.error(`[OpenSCAD]: ${text}`),
    });
    console.log("OpenSCAD WASM initialized successfully");
  } catch (error) {
    console.error("Failed to initialize OpenSCAD WASM:", error);
    throw error;
  }
}

/**
 * Evaluate OpenSCAD code and return geometry
 */
export async function evaluateOpenSCAD(code: string): Promise<Geometry> {
  if (!openscadInstance) {
    await initOpenSCAD();
  }

  try {
    // Use the high-level renderToStl API
    const stlString = await openscadInstance!.renderToStl(code);

    // Convert string to Uint8Array for binary parsing
    const encoder = new TextEncoder();
    const stlBytes = encoder.encode(stlString);

    console.log(`Received STL data: ${stlBytes.length} bytes`);

    // Parse STL data to Geometry format
    const geometry = parseSTL(stlBytes);

    return geometry;
  } catch (error: any) {
    console.error("OpenSCAD evaluation failed:", error);
    throw new Error(error?.message || String(error));
  }
}

/**
 * Parse binary STL data into Geometry format
 */
function parseSTL(data: Uint8Array): Geometry {
  // STL binary format:
  // - 80 bytes: header
  // - 4 bytes: number of triangles (uint32)
  // - For each triangle (50 bytes total):
  //   - 12 bytes: normal vector (3× float32)
  //   - 12 bytes: vertex 1 (3× float32)
  //   - 12 bytes: vertex 2 (3× float32)
  //   - 12 bytes: vertex 3 (3× float32)
  //   - 2 bytes: attribute byte count (usually 0)

  if (data.length < 84) {
    throw new Error(
      `STL file too small: ${data.length} bytes (minimum 84 bytes required)`,
    );
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Read number of triangles
  const triangleCount = view.getUint32(80, true); // little-endian

  // Validate expected file size
  const expectedSize = 84 + triangleCount * 50;
  if (data.length < expectedSize) {
    console.warn(
      `STL file size mismatch: ${data.length} bytes, expected ${expectedSize} bytes for ${triangleCount} triangles`,
    );
  }

  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  let offset = 84; // Start after header + triangle count
  let vertexIndex = 0;

  for (let i = 0; i < triangleCount; i++) {
    // Check if we have enough data for this triangle
    if (offset + 50 > data.length) {
      console.warn(
        `Truncated STL at triangle ${i}/${triangleCount}, stopping parse`,
      );
      break;
    }

    // Read normal
    const nx = view.getFloat32(offset, true);
    const ny = view.getFloat32(offset + 4, true);
    const nz = view.getFloat32(offset + 8, true);
    offset += 12;

    // Read 3 vertices
    for (let j = 0; j < 3; j++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      offset += 12;

      vertices.push(x, y, z);
      normals.push(nx, ny, nz); // Same normal for all 3 vertices (flat shading)
      indices.push(vertexIndex++);
    }

    offset += 2; // Skip attribute byte count
  }

  // Calculate bounds
  const bounds = calculateBounds(vertices);

  console.log(
    `Parsed STL: ${vertices.length / 3} vertices, ${indices.length / 3} triangles`,
  );

  return {
    vertices,
    normals,
    indices,
    bounds,
    stats: {
      vertexCount: vertices.length / 3,
      faceCount: indices.length / 3,
      volume: 0, // TODO: calculate volume from STL
    },
  };
}

/**
 * Calculate bounding box from vertices
 */
function calculateBounds(vertices: number[]): {
  min: [number, number, number];
  max: [number, number, number];
} {
  if (vertices.length === 0) {
    return { min: [0, 0, 0], max: [0, 0, 0] };
  }

  let minX = vertices[0],
    minY = vertices[1],
    minZ = vertices[2];
  let maxX = vertices[0],
    maxY = vertices[1],
    maxZ = vertices[2];

  for (let i = 3; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
  };
}
