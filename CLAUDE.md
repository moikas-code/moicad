# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: moicad - Modern OpenSCAD CAD Engine

moicad is a high-performance OpenSCAD clone built as a clean Bun monorepo:
- **Runtime**: Bun (TypeScript/JavaScript)
- **CSG Engine**: manifold-3d (WebAssembly npm package)
- **Backend**: REST API + WebSocket + MCP server
- **Frontend**: Next.js 16 + React + Three.js
- **Desktop**: Tauri (optional)

---

## Development Philosophy

**AED Method**: Automate, Eliminate, Delegate
- Before optimizing: Ask "Why does this exist?"
- Don't optimize something that shouldn't exist

---

## Architecture Overview

### Core Pipeline: Code → AST → Geometry

```
OpenSCAD Code
    ↓
Parser (backend/scad/parser.ts) → AST
    ↓
Evaluator (backend/scad/evaluator.ts)
    ↓
manifold-3d CSG Engine (npm package)
    ↓
Geometry (vertices, indices, normals)
    ↓
Three.js Viewport / STL Export
```

### Three Layers

**Backend (Bun Server)**
- REST API: `/api/parse`, `/api/evaluate`, `/api/export`
- WebSocket: `/ws` for real-time updates
- MCP Server: `/ws/mcp` for AI integration
- Single-threaded job queue for evaluations

**Frontend (Next.js + React)**
- Monaco editor with OpenSCAD syntax highlighting
- Three.js viewport with interactive highlighting
- WebSocket connection for real-time updates
- File management and export UI

**CSG Engine (manifold-3d)**
- Guaranteed manifold output (no topology errors)
- Robust Boolean operations (replaces custom BSP tree)
- All geometry operations delegated to manifold-3d
- No custom Rust WASM - pure npm package integration

---

## Common Commands

### Development

```bash
# Install dependencies
bun install
cd frontend && npm install && cd ..

# Start backend (http://localhost:42069)
bun run dev

# Start frontend (http://localhost:3002) - separate terminal
bun run dev:frontend

# Run both concurrently
bun run dev:all
```

### Testing

```bash
# Quick validation
bun run test:quick

# All tests
bun run test:all

# By category
bun run test:unit
bun run test:integration
bun run test:performance
bun run test:validation

# Single test file
bun test tests/unit/primitives/cube.test.ts
```

### API Testing

```bash
# Test evaluation
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'

# Test parsing
curl -X POST http://localhost:42069/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"sphere(5);"}'

# Health check
curl http://localhost:42069/health
```

### Tauri Desktop App

```bash
# Development mode
bun run tauri:dev

# Build executable
bun run tauri:build

# Platform-specific builds
bun run tauri:build:mac
bun run tauri:build:linux
bun run tauri:build:win
```

---

## Critical Architecture Details

### Backend Structure (Domain-Driven Organization)

The backend is organized into clear domain directories for better maintainability:

**Core** (`backend/core/`)
- `index.ts`: Main server with Bun.serve() REST + WebSocket + MCP
- `config.ts`: Environment configuration and validation
- `logger.ts`: Winston logging setup
- `rate-limiter.ts`: Rate limiting middleware
- Single-threaded job queue (OpenSCAD-like)
- 30-second timeout per evaluation
- Memory management with --expose-gc

**SCAD** (`backend/scad/`)
- `parser.ts`: Tokenizer and recursive descent parser
  - Lexical analysis of OpenSCAD syntax
  - Returns: `ParseResult { ast, errors, success }`
- `evaluator.ts`: AST execution engine
  - Executes AST nodes using manifold-3d
  - Scope management: variables, functions, modules
  - Built-in functions: math, array, string operations
  - Returns: `EvaluateResult { geometry, errors, success, executionTime }`

**Manifold** (`backend/manifold/`) - CSG Engine Integration
- `engine.ts`: manifold-3d WASM module initialization
- `types.ts`: TypeScript type definitions for Manifold objects
- `geometry.ts`: Conversion between manifold ↔ Geometry format
- `primitives.ts`: cube, sphere, cylinder, cone, polygon, polyhedron
- `csg.ts`: union, difference, intersection, hull, minkowski
- `transforms.ts`: translate, rotate, scale, mirror, multmatrix
- `2d.ts`: offset, projection
- `extrude.ts`: linear_extrude, rotate_extrude
- `text.ts`: ASCII text rendering with bitmap font
- `surface.ts`: Heightmap surface generation

**CRITICAL: TypedArray Serialization**
- manifold-3d returns Float32Array/Uint32Array
- JSON.stringify() serializes these as objects `{"0": val, "1": val}`
- MUST convert to regular arrays: `Array.from(typedArray)`
- See `backend/manifold/geometry.ts` lines 34-39 for implementation

**MCP** (`backend/mcp/`) - Model Context Protocol
- `server.ts`: MCP WebSocket server for real-time collaboration
- `api.ts`: REST API endpoints for project/session management
- `store.ts`: In-memory data stores for users, projects, sessions
- `ai-adapter.ts`: Pluggable AI provider system
- `session-recorder.ts`: Session recording and playback
- `middleware.ts`: Authentication and validation middleware
- `operational-transform.ts`: OT algorithm for concurrent editing
- `suggestion-engine.ts`: AI suggestion generation
- `stub-ai.ts`: Stub AI provider for testing

**Middleware** (`backend/middleware/`)
- `security.ts`: Security headers, timeouts, size limits
- `health.ts`: Health checks, metrics, probes

**Utils** (`backend/utils/`)
- `file-utils.ts`: File I/O utilities with security sandboxing

### Frontend Structure

**Main Page** (`frontend/app/page.tsx`)
- Editor + Viewport split layout
- WebSocket integration for real-time updates
- File management (open, save, export)

**Editor** (`frontend/components/Editor.tsx`)
- Monaco editor with OpenSCAD syntax highlighting
- Real-time parsing and error display
- Alt+R shortcut for render

**Viewport** (`frontend/components/Viewport.tsx`)
- Three.js SceneManager for 3D rendering
- Interactive highlighting: hover, click selection, multi-select
- Camera controls: orbit, pan, zoom
- Printer bed visualization

**Three.js Utils** (`frontend/lib/three-utils.ts`)
- SceneManager: Scene setup, lighting, rendering
- Geometry rendering from vertices/indices/normals
- Raycasting for interactive object selection
- Material management with modifier support

**API Client** (`frontend/lib/api-client.ts`)
- Type-safe REST API calls
- Error handling and progress tracking
- WebSocket connection management

### Shared Types (`shared/`)

**types.ts**
- `ScadNode`: AST node types (primitive, transform, boolean, module, etc.)
- `Geometry`: Vertices (number[]), indices (number[]), normals (number[]), bounds, stats
- `ParseResult`: AST + errors + success
- `EvaluateResult`: Geometry + errors + success + executionTime
- `WsMessage`: WebSocket message types

**constants.ts**
- `SCAD_KEYWORDS`: OpenSCAD reserved words
- `PRIMITIVES`, `TRANSFORMS`, `BOOLEAN_OPS`: Available operations
- `DEFAULT_PARAMS`: Default values (e.g., cube size=10, sphere detail=20)
- `API_ENDPOINTS`: URLs for REST and WebSocket

---

## OpenSCAD Compatibility (98-99%)

### Fully Supported ✅

**Primitives**: cube, sphere, cylinder, cone, circle, square, polygon, polyhedron, text, surface

**Transformations**: translate, rotate, scale, mirror, multmatrix

**CSG Operations**: union, difference, intersection, hull, minkowski

**2D Operations**: linear_extrude, rotate_extrude, offset, projection

**Language Features**:
- Variables, functions, modules
- Conditionals (if/else), loops (for)
- Expressions: arithmetic, logical, comparison, ternary
- List comprehensions
- Built-in functions: abs, ceil, floor, round, sqrt, pow, sin, cos, tan, min, max, len, norm, cross, concat, str
- File imports: include, use (with library path resolution)
- Special variables: $fn, $fa, $fs, $t, $vpr, $vpt, $vpd, $vpf, $preview
- OpenSCAD modifiers: # (debug), % (transparent), ! (root), * (disable)
- Debug utilities: echo(), assert()

**Interactive Features**: Real-time hover highlighting, click selection, multi-select, code-to-geometry mapping

---

## API Specification

### POST /api/parse
```json
Request: { "code": "cube(10);" }
Response: { "ast": [...], "errors": [], "success": true }
```

### POST /api/evaluate
```json
Request: { "code": "sphere(10);" }
Response: {
  "geometry": {
    "vertices": [...],  // number[] (NOT TypedArray!)
    "indices": [...],   // number[]
    "normals": [...],   // number[]
    "bounds": { "min": [x,y,z], "max": [x,y,z] },
    "stats": { "vertexCount": N, "faceCount": N, "volume": V }
  },
  "errors": [],
  "success": true,
  "executionTime": 45.2
}
```

### POST /api/export
```json
Request: { "geometry": {...}, "format": "stl" }
Response: Binary STL file (application/octet-stream)
```

### WebSocket /ws
```json
Client → Server: { "type": "evaluate", "code": "cube(10);", "requestId": "abc" }
Server → Client: { "type": "evaluate_response", "requestId": "abc", "geometry": {...}, "executionTime": 42 }
```

### MCP WebSocket /ws/mcp

Model Context Protocol for AI integration. Claude Desktop connects here.

---

## Key Implementation Details

### Single-Threaded Job Queue

Backend processes one OpenSCAD evaluation at a time (like OpenSCAD):
- Jobs queued with `evaluationQueue.enqueue()`
- 30-second timeout per job
- Memory limit: 1GB per job
- Prevents concurrent manifold-3d operations (not thread-safe)

### EvaluateResult vs Geometry

**CRITICAL BUG FIXED (backend/index.ts line 434)**:
```typescript
// WRONG: Double-nesting
const geometry = await evaluateAST(parseResult.ast);
return { geometry, errors: [], success: true }; // geometry is already EvaluateResult!

// CORRECT: Extract fields
const evalResult = await evaluateAST(parseResult.ast);
return {
  geometry: evalResult.geometry,  // Just the Geometry object
  errors: evalResult.errors,
  success: evalResult.success,
  executionTime
};
```

`evaluateAST()` returns `EvaluateResult`, not `Geometry`. Don't wrap it again!

### TypedArray Serialization

**CRITICAL BUG FIXED (manifold-geometry.ts lines 34-39)**:
```typescript
// WRONG: Float32Array serializes as object
return { vertices, indices, normals };

// CORRECT: Convert to regular arrays
return {
  vertices: Array.from(vertices),
  indices: Array.from(indices),
  normals: Array.from(normals)
};
```

Three.js expects number[], not TypedArray. JSON.stringify() breaks TypedArrays.

### Manifold WASM Initialization

```typescript
// manifold-engine.ts
let manifoldWasm: any = null;
let Manifold: any = null;

export async function initManifold() {
  if (!manifoldWasm) {
    manifoldWasm = await Module();  // Import from manifold-3d
    manifoldWasm.setup();
    Manifold = manifoldWasm.Manifold;
  }
  return { manifoldWasm, Manifold };
}
```

Call `initManifold()` once at server start, reuse throughout.

### File Import Security

File imports (include/use) have security sandboxing:
- Path traversal protection (blocks `../../../etc/passwd`)
- File extension filtering (only `.scad`, `.csg`)
- File size limits (1MB max)
- Circular dependency detection
- Library path resolution (current dir → lib/ → modules/ → OPENSCADPATH)

---

## Development Workflows

### Adding New Primitives

1. Add to `backend/manifold-primitives.ts`:
```typescript
export async function createMyShape(params) {
  const { Manifold } = await initManifold();
  // Use manifold API
  return Manifold.myOperation(...);
}
```

2. Add case in `backend/scad-evaluator.ts` `evaluatePrimitive()`:
```typescript
case 'myshape':
  const params = evaluateParams(node.params, scope);
  return await createMyShape(params);
```

3. Update `shared/constants.ts` `PRIMITIVES` array

4. Add tests in `tests/unit/primitives/myshape.test.ts`

### Adding New CSG Operations

1. Add to `backend/manifold-csg.ts`:
```typescript
export async function myOperation(manifoldA, manifoldB) {
  // Use manifold API: add, subtract, intersect, hull, etc.
  return manifoldA.myOp(manifoldB);
}
```

2. Add case in `backend/scad-evaluator.ts` `evaluateBoolean()`:
```typescript
case 'myoperation':
  const children = await evaluateChildren(node.children, scope);
  return children.reduce((acc, curr) => myOperation(acc, curr));
```

3. Update `shared/constants.ts` `BOOLEAN_OPS` array

4. Add tests in `tests/unit/boolean-ops/myoperation.test.ts`

### Debugging Parser Issues

1. Add logging in `scad-parser.ts` Tokenizer:
```typescript
const tokens = this.tokenize(code);
console.log('Tokens:', tokens); // Inspect token stream
```

2. Use `/api/parse` endpoint to inspect AST:
```bash
curl -X POST http://localhost:42069/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"YOUR CODE"}' | jq '.ast'
```

3. Check error positions (line/column) in ParseResult

4. Test with progressively simpler code to isolate issue

### Debugging Geometry Issues

1. Check stats: `geometry.stats.vertexCount`, `geometry.stats.faceCount`

2. Verify bounds: `geometry.bounds.min`, `geometry.bounds.max`

3. Export to STL and open in slicer (Cura, Prusaslicer):
```bash
curl -X POST http://localhost:42069/api/export \
  -H "Content-Type: application/json" \
  -d '{"geometry":{...},"format":"stl"}' > model.stl
```

4. Check normals: Should be normalized (length ~1.0)

5. Inspect manifold-3d errors in backend logs

---

## MCP Integration

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "moicad": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moicad/backend/index.ts"],
      "env": {
        "MCP_ENABLED": "true"
      }
    }
  }
}
```

Restart Claude Desktop. Now Claude can evaluate OpenSCAD code via natural language!

### MCP Tools Available

- **evaluate_scad**: Evaluate OpenSCAD code to geometry
- **parse_scad**: Parse code to AST (for syntax checking)
- **export_geometry**: Export geometry to STL/OBJ
- **list_examples**: Get example OpenSCAD files
- **get_documentation**: Get OpenSCAD language documentation

---

## Test Suite Organization

```
tests/
├── unit/                # Unit tests by feature
│   ├── primitives/     # Cube, sphere, cylinder, etc.
│   ├── transformations/# Translate, rotate, scale, etc.
│   ├── boolean-ops/    # Union, difference, intersection, hull
│   ├── language/       # Variables, functions, modules
│   └── advanced/       # Text, surface, special variables
├── integration/        # API and workflow tests
│   ├── api/           # REST endpoints
│   ├── imports/       # File import tests
│   └── complex-workflows/
├── performance/        # Benchmarks
├── e2e/               # End-to-end UI tests
├── fixtures/          # Test assets
├── validation/        # OpenSCAD compatibility tests
└── utils/             # Test helpers
```

Run with: `bun run test:unit`, `bun run test:integration`, etc.

---

## Performance Characteristics

- **Parse**: ~10-30ms (typical)
- **Evaluate**: ~20-100ms (typical)
- **Memory**: ~50-200MB per job
- **Job timeout**: 30 seconds
- **WebSocket latency**: <50ms
- **Three.js FPS**: 60 FPS

---

## Known Patterns

### Bun Server with WebSocket

```typescript
Bun.serve({
  port: 42069,
  fetch(req, server) {
    if (server.upgrade(req)) return; // WebSocket upgrade
    // Handle HTTP requests
  },
  websocket: {
    open(ws) { /* connection opened */ },
    message(ws, message) { /* handle message */ },
    close(ws) { /* connection closed */ }
  }
});
```

### Manifold-3d Usage Pattern

```typescript
const { Manifold } = await initManifold();

// Create primitives
const cube = Manifold.cube([10, 10, 10], true);
const sphere = Manifold.sphere(5, 32);

// CSG operations
const result = cube.add(sphere);        // union
const diff = cube.subtract(sphere);     // difference
const inter = cube.intersect(sphere);   // intersection

// Transform
const moved = result.translate([5, 0, 0]);
const rotated = moved.rotate([45, 0, 0]);

// Extract mesh
const mesh = result.getMesh();
const vertices = mesh.vertProperties;  // Float32Array
const indices = mesh.triVerts;         // Uint32Array
```

### Three.js SceneManager Pattern

```typescript
class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  
  updateGeometry(geometry: Geometry) {
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute('position', 
      new THREE.Float32BufferAttribute(geometry.vertices, 3));
    bufferGeometry.setIndex(geometry.indices);
    bufferGeometry.setAttribute('normal',
      new THREE.Float32BufferAttribute(geometry.normals, 3));
    
    const mesh = new THREE.Mesh(bufferGeometry, material);
    this.scene.add(mesh);
  }
}
```

---

## Documentation Files

- **README.md**: Project overview, quick start
- **ARCHITECTURE.md**: Complete system architecture
- **BUILD_GUIDE.md**: Detailed build instructions
- **IMPLEMENTATION_STATUS.md**: Feature implementation status
- **MCP_INTEGRATION_GUIDE.md**: Claude Desktop integration
- **BACKEND_STRUCTURE.md**: Backend file organization
- **FINAL_CLEANUP_STATUS.md**: Codebase cleanup summary

---

## Important Notes

- **No Rust WASM**: Entire `wasm/` directory removed, replaced by manifold-3d npm package
- **No custom WebGL**: Use Three.js standard renderer (manifold guarantees clean geometry)
- **Bun exclusive**: Don't use Node.js commands (npm, node), use Bun equivalents
- **TypedArray conversion**: Always convert to regular arrays before JSON serialization
- **Single-threaded queue**: One evaluation at a time (OpenSCAD-like behavior)
- **Memory management**: Use --expose-gc flag for garbage collection
- **MCP local only**: Don't expose MCP server to internet (security risk)
