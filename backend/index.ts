/**
 * moicad Backend Server
 * Bun.serve() with REST API and WebSocket support
 */

import { parseOpenSCAD } from './scad-parser';
import { evaluateAST, setWasmModule } from './scad-evaluator';
import type { EvaluateMessage, EvaluateResponse, ParseResult, EvaluateResult } from '../shared/types';

// Dynamic import for WASM
let wasmModule: any = null;

async function initWasm() {
  try {
    // Import and initialize WASM module
    const imported = await import('../wasm/pkg/moicad_wasm.js');

    // The default export is the init function, call it to initialize
    if (imported.default) {
      await imported.default();
    }

    // Now store the module with all exported functions
    wasmModule = imported;
    globals.wasmModule = imported;
    setWasmModule(imported);
    console.log('✓ WASM module initialized');
    return true;
  } catch (err) {
    console.error('Failed to load WASM module:', err);
    console.warn('⚠ Running without WASM CSG engine - geometry operations will be limited');
    return false;
  }
}

const globals = { wasmModule: null as any };

// Initialize WASM before starting server
await initWasm();

interface WebSocketData {
  requestId?: string;
}

const server = Bun.serve<WebSocketData>({
  port: 3000,
  hostname: '0.0.0.0',

  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // WebSocket upgrade
    if (path === '/ws' && req.headers.get('upgrade') === 'websocket') {
      return server.upgrade(req, { data: {} }) as any;
    }

    // API Routes
    if (path === '/api/parse' && req.method === 'POST') {
      return handleParse(req);
    }

    if (path === '/api/evaluate' && req.method === 'POST') {
      return handleEvaluate(req);
    }

    if (path === '/api/export' && req.method === 'POST') {
      return handleExport(req);
    }

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', wasmLoaded: !!wasmModule }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Default 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },

  websocket: {
    open(ws) {
      console.log('✓ WebSocket client connected');
    },

    async message(ws, message) {
      try {
        const data = typeof message === 'string'
          ? JSON.parse(message)
          : message;

        if (data.type === 'evaluate') {
          const result = await handleEvaluateWs(data);
          ws.send(JSON.stringify(result));
        } else if (data.type === 'parse') {
          const result = handleParseWs(data);
          ws.send(JSON.stringify(result));
        }
      } catch (err: any) {
        ws.send(JSON.stringify({
          type: 'error',
          error: err.message,
        }));
      }
    },

    close(ws) {
      console.log('✓ WebSocket client disconnected');
    },

    error(ws, error) {
      console.error('WebSocket error:', error);
    },
  },
});

console.log(`
╔════════════════════════════════════════════════════════════╗
║         🏗️  moicad CAD Engine Server                       ║
║                                                            ║
║  Server running at: http://localhost:3000                ║
║  WebSocket:        ws://localhost:3000/ws               ║
║  Health check:     http://localhost:3000/health         ║
║                                                            ║
║  API Endpoints:                                           ║
║    POST /api/parse     - Parse OpenSCAD code             ║
║    POST /api/evaluate  - Parse and evaluate to geometry   ║
║    POST /api/export    - Export geometry to STL/OBJ       ║
╚════════════════════════════════════════════════════════════╝
`);

// ============================================================================
// Request Handlers
// ============================================================================

async function handleParse(req: Request): Promise<Response> {
  try {
    const { code } = await req.json() as { code: string };

    if (!code) {
      return sendJson({ error: 'code is required' }, 400);
    }

    const result = parseOpenSCAD(code);

    return sendJson(result);
  } catch (err: any) {
    return sendJson({
      error: err.message,
      success: false,
    }, 500);
  }
}

async function handleEvaluate(req: Request): Promise<Response> {
  try {
    const { code } = await req.json() as { code: string };

    if (!code) {
      return sendJson({ error: 'code is required' }, 400);
    }

    if (!wasmModule) {
      return sendJson({
        error: 'WASM module not loaded',
        success: false,
      }, 503);
    }

    // Parse
    const parseResult = parseOpenSCAD(code);
    if (!parseResult.success || !parseResult.ast) {
      return sendJson({
        geometry: null,
        errors: parseResult.errors,
        success: false,
        executionTime: 0,
      });
    }

    // Evaluate
    const evalResult = await evaluateAST(parseResult.ast);

    return sendJson(evalResult);
  } catch (err: any) {
    return sendJson({
      geometry: null,
      errors: [{ message: err.message }],
      success: false,
      executionTime: 0,
    }, 500);
  }
}

async function handleExport(req: Request): Promise<Response> {
  try {
    const { geometry, format } = await req.json() as {
      geometry: any;
      format: 'stl' | 'obj' | '3mf';
    };

    if (!geometry) {
      return sendJson({ error: 'geometry is required' }, 400);
    }

    if (!['stl', 'obj', '3mf'].includes(format)) {
      return sendJson({ error: 'Invalid format. Use: stl, obj, or 3mf' }, 400);
    }

    let data: string | ArrayBuffer;
    let contentType: string;
    let filename: string;

    if (format === 'stl') {
      data = geometryToSTL(geometry, true);
      contentType = 'application/octet-stream';
      filename = 'model.stl';
    } else if (format === 'obj') {
      data = geometryToOBJ(geometry);
      contentType = 'text/plain';
      filename = 'model.obj';
    } else {
      // 3MF would require more complex handling
      return sendJson({ error: '3MF export not yet implemented' }, 501);
    }

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (err: any) {
    return sendJson({
      error: err.message,
    }, 500);
  }
}

// ============================================================================
// WebSocket Handlers
// ============================================================================

function handleParseWs(data: any): any {
  const result = parseOpenSCAD(data.code);
  return {
    type: 'parse_response',
    requestId: data.requestId,
    result,
  };
}

async function handleEvaluateWs(data: EvaluateMessage): Promise<EvaluateResponse> {
  if (!wasmModule) {
    return {
      type: 'evaluate_response',
      requestId: data.requestId,
      geometry: null,
      errors: [{ message: 'WASM module not loaded' }],
      executionTime: 0,
    };
  }

  const parseResult = parseOpenSCAD(data.code);
  if (!parseResult.success || !parseResult.ast) {
    return {
      type: 'evaluate_response',
      requestId: data.requestId,
      geometry: null,
      errors: parseResult.errors,
      executionTime: 0,
    };
  }

  const evalResult = await evaluateAST(parseResult.ast);
  return {
    type: 'evaluate_response',
    requestId: data.requestId,
    geometry: evalResult.geometry,
    errors: evalResult.errors,
    executionTime: evalResult.executionTime,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function sendJson(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * Convert geometry to binary STL format
 */
function geometryToSTL(geometry: any, binary = true): string | ArrayBuffer {
  if (!geometry || !geometry.indices) {
    throw new Error('Invalid geometry');
  }

  const vertices = geometry.vertices;
  const indices = geometry.indices;
  const normals = geometry.normals || computeNormals(vertices, indices);

  if (binary) {
    // Binary STL
    const buffer = new ArrayBuffer(84 + indices.length / 3 * 50);
    const view = new DataView(buffer);

    // Header
    view.setUint32(80, indices.length / 3, true); // Number of triangles

    let offset = 84;
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      // Normal
      const nx = normals[i0 * 3];
      const ny = normals[i0 * 3 + 1];
      const nz = normals[i0 * 3 + 2];

      view.setFloat32(offset, nx, true); offset += 4;
      view.setFloat32(offset, ny, true); offset += 4;
      view.setFloat32(offset, nz, true); offset += 4;

      // Vertices
      for (const idx of [i0, i1, i2]) {
        view.setFloat32(offset, vertices[idx * 3], true); offset += 4;
        view.setFloat32(offset, vertices[idx * 3 + 1], true); offset += 4;
        view.setFloat32(offset, vertices[idx * 3 + 2], true); offset += 4;
      }

      // Attribute byte count (unused)
      view.setUint16(offset, 0, true); offset += 2;
    }

    return buffer;
  } else {
    // ASCII STL
    let stl = 'solid model\n';

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const nx = normals[i0 * 3];
      const ny = normals[i0 * 3 + 1];
      const nz = normals[i0 * 3 + 2];

      stl += `  facet normal ${nx} ${ny} ${nz}\n`;
      stl += '    outer loop\n';

      for (const idx of [i0, i1, i2]) {
        stl += `      vertex ${vertices[idx * 3]} ${vertices[idx * 3 + 1]} ${vertices[idx * 3 + 2]}\n`;
      }

      stl += '    endloop\n';
      stl += '  endfacet\n';
    }

    stl += 'endsolid model\n';
    return stl;
  }
}

/**
 * Convert geometry to OBJ format
 */
function geometryToOBJ(geometry: any): string {
  if (!geometry || !geometry.indices) {
    throw new Error('Invalid geometry');
  }

  const vertices = geometry.vertices;
  const indices = geometry.indices;
  const normals = geometry.normals || computeNormals(vertices, indices);

  let obj = '# moicad exported model\n';
  obj += 'mtllib model.mtl\n';
  obj += 'usemtl default\n';

  // Vertices
  for (let i = 0; i < vertices.length; i += 3) {
    obj += `v ${vertices[i]} ${vertices[i + 1]} ${vertices[i + 2]}\n`;
  }

  obj += '\n';

  // Normals
  for (let i = 0; i < normals.length; i += 3) {
    obj += `vn ${normals[i]} ${normals[i + 1]} ${normals[i + 2]}\n`;
  }

  obj += '\n';

  // Faces
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] + 1;
    const i1 = indices[i + 1] + 1;
    const i2 = indices[i + 2] + 1;
    obj += `f ${i0}//${i0} ${i1}//${i1} ${i2}//${i2}\n`;
  }

  return obj;
}

/**
 * Compute normals from vertices and indices
 */
function computeNormals(vertices: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(vertices.length);

  // Accumulate face normals
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    const v0 = [vertices[i0 * 3], vertices[i0 * 3 + 1], vertices[i0 * 3 + 2]];
    const v1 = [vertices[i1 * 3], vertices[i1 * 3 + 1], vertices[i1 * 3 + 2]];
    const v2 = [vertices[i2 * 3], vertices[i2 * 3 + 1], vertices[i2 * 3 + 2]];

    const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
    const e2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

    const normal = [
      e1[1] * e2[2] - e1[2] * e2[1],
      e1[2] * e2[0] - e1[0] * e2[2],
      e1[0] * e2[1] - e1[1] * e2[0],
    ];

    const len = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
    if (len > 0) {
      normal[0] /= len;
      normal[1] /= len;
      normal[2] /= len;
    }

    normals[i0 * 3] += normal[0];
    normals[i0 * 3 + 1] += normal[1];
    normals[i0 * 3 + 2] += normal[2];

    normals[i1 * 3] += normal[0];
    normals[i1 * 3 + 1] += normal[1];
    normals[i1 * 3 + 2] += normal[2];

    normals[i2 * 3] += normal[0];
    normals[i2 * 3 + 1] += normal[1];
    normals[i2 * 3 + 2] += normal[2];
  }

  // Normalize accumulated normals
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
    if (len > 0) {
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    }
  }

  return normals;
}
