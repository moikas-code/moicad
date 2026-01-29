import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import type { Geometry } from '../types';

export class GLBLoader {
  private loader: GLTFLoader;

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load GLB file and convert to moicad Geometry format
   */
  async load(glbData: ArrayBuffer | string): Promise<Geometry> {
    return new Promise((resolve, reject) => {
      this.loader.parse(
        glbData,
        '',
        (gltf) => {
          try {
            const geometry = this.extractGeometry(gltf.scene);
            resolve(geometry);
          } catch (error) {
            reject(error);
          }
        },
        (error) => reject(error)
      );
    });
  }

  /**
   * Extract and merge all geometries from GLTF scene
   */
  private extractGeometry(scene: THREE.Object3D): Geometry {
    const meshes: THREE.Mesh[] = [];

    // Traverse scene and collect all meshes
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        meshes.push(child);
      }
    });

    if (meshes.length === 0) {
      throw new Error('No meshes found in GLB file');
    }

    // Merge all geometries
    const mergedGeometry = this.mergeGeometries(meshes);

    // Convert to moicad Geometry format
    const positionAttr = mergedGeometry.attributes.position;
    const normalAttr = mergedGeometry.attributes.normal;
    const indexAttr = mergedGeometry.index;

    if (!positionAttr || !indexAttr) {
      throw new Error('Invalid geometry: missing position or index data');
    }

    // CRITICAL: Convert TypedArrays to regular arrays for JSON serialization
    const vertices = Array.from(positionAttr.array);
    const indices = Array.from(indexAttr.array);
    const normals = normalAttr ? Array.from(normalAttr.array) : [];

    // Calculate bounding box
    mergedGeometry.computeBoundingBox();
    const bbox = mergedGeometry.boundingBox!;
    const bounds = {
      min: [bbox.min.x, bbox.min.y, bbox.min.z] as [number, number, number],
      max: [bbox.max.x, bbox.max.y, bbox.max.z] as [number, number, number]
    };

    return {
      vertices,
      indices,
      normals: normals.length > 0 ? normals : this.computeVertexNormals(vertices, indices),
      bounds,
      stats: {
        vertexCount: vertices.length / 3,
        faceCount: indices.length / 3
      }
    };
  }

  /**
   * Merge multiple mesh geometries into one
   */
  private mergeGeometries(meshes: THREE.Mesh[]): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    for (const mesh of meshes) {
      const geometry = mesh.geometry.clone();

      // Apply mesh transformation to geometry
      geometry.applyMatrix4(mesh.matrixWorld);

      geometries.push(geometry);
    }

    // Use Three.js mergeGeometries utility
    const merged = BufferGeometryUtils.mergeGeometries(geometries, false);

    if (!merged) {
      throw new Error('Failed to merge geometries');
    }

    return merged;
  }

  /**
   * Compute vertex normals if not provided
   */
  private computeVertexNormals(vertices: number[], indices: number[]): number[] {
    const normals = new Float32Array(vertices.length);

    // For each face, compute face normal and accumulate to vertices
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      // Get triangle vertices
      const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
      const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
      const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];

      // Compute face normal (cross product)
      const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

      const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
      ];

      // Accumulate to vertices
      for (let j = 0; j < 3; j++) {
        const idx = indices[i + j] * 3;
        normals[idx] += normal[0];
        normals[idx + 1] += normal[1];
        normals[idx + 2] += normal[2];
      }
    }

    // Normalize all normals
    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.sqrt(
        normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2
      );
      if (length > 0) {
        normals[i] /= length;
        normals[i + 1] /= length;
        normals[i + 2] /= length;
      }
    }

    return Array.from(normals);
  }
}
