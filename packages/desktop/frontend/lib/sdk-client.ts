import { GeometryResponse, EvaluateResult } from '@/lib/api-client';
import { initManifold, Shape } from '@moicad/sdk';
import type { RenderProgress } from '@moicad/sdk';

/**
 * SDK-based geometry evaluator
 * Replaces the REST API calls with direct SDK usage
 */

let manifoldInitialized = false;

// Initialize the manifold engine (required for geometry operations)
async function ensureManifoldInitialized() {
  if (!manifoldInitialized) {
    await initManifold();
    manifoldInitialized = true;
  }
}

/**
 * Convert SDK geometry to API-compatible format
 */
function convertSDKGeometryToAPI(sdkGeometry: any): GeometryResponse | null {
  if (!sdkGeometry) return null;

  // Handle different SDK geometry formats
  if (sdkGeometry.vertices && sdkGeometry.indices) {
    return {
      vertices: sdkGeometry.vertices,
      indices: sdkGeometry.indices,
      normals: sdkGeometry.normals || [],
      bounds: sdkGeometry.bounds || {
        min: [0, 0, 0],
        max: [0, 0, 0],
      },
      stats: {
        vertexCount: sdkGeometry.vertices.length / 3,
        faceCount: sdkGeometry.indices.length / 3,
      },
      color: sdkGeometry.color,
      modifier: sdkGeometry.modifier,
      objects: sdkGeometry.objects,
    };
  }

  return null;
}

/**
 * Convert SDK errors to API-compatible format
 */
function convertSDKErrorsToAPI(sdkErrors: any[]): { message: string; line?: number }[] {
  if (!sdkErrors || !Array.isArray(sdkErrors)) return [];

  return sdkErrors.map(error => ({
    message: error.message || String(error),
    line: error.line,
  }));
}

/**
 * Evaluate JavaScript code using the SDK (replaces API call)
 */
export async function evaluateCodeWithSDK(
  code: string,
  onProgress?: (progress: RenderProgress) => void,
): Promise<EvaluateResult> {
  const startTime = Date.now();

  try {
    onProgress?.({ 
      stage: 'initializing', 
      progress: 10, 
      message: 'Initializing geometry engine.' 
    });

    // Ensure manifold engine is ready
    await ensureManifoldInitialized();

    onProgress?.({ 
      stage: 'evaluating', 
      progress: 30, 
      message: 'Executing JavaScript code.' 
    });

    // Execute JavaScript code to create geometry
    // Use Function constructor for safer evaluation than eval
    let geometry;
    try {
      // Create a function that returns the Shape from user code
      const userFunction = new Function('Shape', 'return ' + code);
      const userShape = userFunction(Shape);
      
      // Convert to geometry data
      geometry = await userShape.toGeometry();
    } catch (execError) {
      throw new Error(`JavaScript execution failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`);
    }

    onProgress?.({
      stage: 'complete',
      progress: 90,
      message: 'Finalizing geometry.',
      details: {
        estimatedTimeRemainingMs: 0
      }
    });

    // Convert SDK geometry to API-compatible format
    const apiGeometry = convertSDKGeometryToAPI(geometry);

    return {
      geometry: apiGeometry,
      errors: [],
      success: true,
      executionTime: Date.now() - startTime,
    };

  } catch (error) {
    console.error('SDK evaluation error:', error);
    
    return {
      geometry: null,
      errors: [{ 
        message: `SDK evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }],
      success: false,
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Check if SDK is available and initialized
 */
export async function checkSDKHealth(): Promise<boolean> {
  try {
    await ensureManifoldInitialized();
    return true;
  } catch {
    return false;
  }
}