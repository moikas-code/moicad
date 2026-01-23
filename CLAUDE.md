# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: moicad - OpenSCAD Clone with WASM CSG Engine

moicad is a web-based OpenSCAD clone built with:
- **Backend**: Bun server with REST API + WebSocket
- **WASM**: Rust-based CSG geometry engine (production-ready)
- **Frontend**: Next.js + React (pending - to be built)
- **3D Rendering**: Three.js (pending)
- **MCP Integration**: AI-assisted CAD operations (pending)

---

## Architecture Overview

### Core Pipeline: Code → AST → Geometry

```
OpenSCAD Code (string)
    ↓
Parser (backend/scad-parser.ts)
    ↓
AST (Abstract Syntax Tree)
    ↓
Evaluator (backend/scad-evaluator.ts)
    ↓
WASM CSG Engine (wasm/src/)
    ↓
Geometry (vertices, indices, normals)
    ↓
Three.js Viewport (frontend - pending) / STL Export
```

### Three Layers

1. **Frontend (Next.js + React)** - Not yet built
   - Monaco editor for code input
   - Three.js canvas for 3D visualization
   - WebSocket connection to backend
   - File management UI

2. **Backend (Bun Server)** - ✅ Complete
   - REST API: `/api/parse`, `/api/evaluate`, `/api/export`
   - WebSocket: `/ws` for real-time updates
   - Parser: Tokenizes and parses OpenSCAD syntax
   - Evaluator: Executes AST using WASM engine
   - Export: STL (binary/ASCII) and OBJ formats

3. **WASM CSG Engine (Rust)** - ✅ Complete
   - Primitives: cube, sphere, cylinder, cone, circle, square
   - Transformations: translate, rotate, scale, mirror, multmatrix
   - CSG ops: union, difference, intersection
   - Math: 3D vectors, 4x4 matrices
   - Geometry: mesh, normals, bounds

---

## Common Development Tasks

### Build & Run

```bash
# Build WASM module (must run before backend)
cd wasm && wasm-pack build --target web && cd ..

# Install dependencies
bun install

# Start backend server (http://localhost:3000)
bun --hot ./backend/index.ts

# Test API endpoints
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'

# Check server health
curl http://localhost:3000/health
```

### Testing Backend

```bash
# Test parsing
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"translate([5,0,0]) sphere(10);"}'

# Test complex geometry
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"union(cube(10), translate([8,0,0]) sphere(5));"}'

# Export to STL
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"geometry":{"vertices":[...],"indices":[...]},"format":"stl"}' \
  > model.stl
```

### WebSocket Testing

```javascript
// JavaScript console (when frontend exists)
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'evaluate',
    code: 'cube(10);',
    requestId: 'test-1'
  }));
};

ws.onmessage = (event) => {
  console.log(JSON.parse(event.data));
};
```

### Modify WASM

After any changes to `wasm/src/`:
```bash
cd wasm
wasm-pack build --target web
cd ..
```

Backend will use newly built module. No need to restart server if it's running with `bun --hot`.

---

## File Organization & Key Concepts

### Backend Structure

- **`backend/index.ts`** - Bun.serve() entry point
  - Routes: `/api/parse`, `/api/evaluate`, `/api/export`
  - WebSocket handler at `/ws`
  - STL/OBJ export functions
  - WASM module initialization
  - Dynamic WASM import with fallback

- **`backend/scad-parser.ts`** - Tokenizer + Parser
  - `Tokenizer` class: Lexical analysis (keywords, numbers, strings, operators, ternary)
  - `Parser` class: Full recursive descent parser with expression support
  - `parseOpenSCAD()`: Public entry point
  - Returns: `ParseResult` with AST, errors, success flag
  - **Full OpenSCAD support**: variables, functions, modules, if/else, expressions
  - Expression precedence: ternary → logical OR → logical AND → comparison → arithmetic → unary
  - Handles comments (single/multi-line), strings, arrays, parameters

- **`backend/scad-evaluator.ts`** - AST Execution
  - `evaluateAST()`: Main evaluation function
  - Evaluates all node types: primitives, transforms, booleans, for loops, modules, functions, if/else
  - Calls WASM functions for geometry operations
  - **Full scope management**: Variables, functions, and modules with proper scoping
  - Built-in math functions: abs, ceil, floor, round, sqrt, sin, cos, tan, min, max, pow, len
  - Expression evaluation: arithmetic, logical, comparison, ternary operators
  - Converts WASM geometry to standard Geometry format

### WASM Structure (Rust)

- **`wasm/Cargo.toml`** - Rust project manifest
  - Target: `cdylib` (C-compatible library)
  - Dependencies: `wasm-bindgen`, `serde`, `serde_json`
  - Optimizations: LTO enabled for size

- **`wasm/src/lib.rs`** - WASM module entry
  - `WasmMesh` wrapper: Exported to JavaScript
  - Primitive functions: `create_cube()`, `create_sphere()`, etc.
  - CSG operations: `union()`, `difference()`, `intersection()`
  - Transformations: `translate()`, `rotate_x/y/z()`, `scale()`, `mirror_x/y/z()`, `multmatrix()`
  - All marked with `#[wasm_bindgen]` for JavaScript interop

- **`wasm/src/math.rs`** - Vector & Matrix Math
  - `Vec3`: 3D vectors with operations (add, subtract, scale, dot, cross, normalize, length)
  - `Mat4`: 4x4 transformation matrices
  - Helper functions for conversions
  - All floating point (f32) for WebAssembly efficiency

- **`wasm/src/geometry.rs`** - Mesh & Geometry
  - `Bounds`: Min/max bounding box, volume calculation
  - `Mesh`: Vertices, indices, normals
  - `calculate_normals()`: Smooth shading normals from face normals
  - `transform()`: Generic transformation with callback
  - `to_json()`: Serializes to `MeshJson` for transport
  - Stores `MeshStats`: vertex count, face count, volume

- **`wasm/src/primitives.rs`** - Shape Generators
  - `cube(size)`: 8 vertices, 12 triangles (6 faces)
  - `sphere(radius, detail)`: Parametric UV sphere
  - `cylinder(radius, height, detail)`: With caps and sides
  - `cone(radius, height, detail)`: Single apex
  - `circle(radius, detail)`: 2D shape
  - `square(size)`: 2D square
  - All return `Mesh` with proper normals

- **`wasm/src/csg.rs`** - CSG Operations
  - `union()`: Merges vertices and indices
  - `difference()`: Placeholder (returns first mesh)
  - `intersection()`: Placeholder (returns first mesh)
  - `transform_mesh()`: Generic transformation
  - `translate()`, `rotate_x/y/z()`, `scale()`: Specific transforms
  - `mirror_x/y/z()`: Scale by -1 on axis
  - `multmatrix()`: Custom 4x4 transformation

### Shared Types

- **`shared/types.ts`** - TypeScript interfaces
  - `ScadNode[]`: AST node types (primitive, transform, boolean, etc.)
  - `Geometry`: Vertices, indices, normals, bounds, stats
  - `ParseResult`: AST + errors + success flag
  - `EvaluateResult`: Geometry + errors + execution time
  - `WsMessage`: WebSocket message types

- **`shared/constants.ts`** - Configuration
  - `SCAD_KEYWORDS`: OpenSCAD reserved words
  - `PRIMITIVES`, `TRANSFORMS`, `BOOLEAN_OPS`: Available operations
  - `DEFAULT_PARAMS`: Default parameter values for shapes
  - `API_ENDPOINTS`: REST and WebSocket URLs
  - `THREE_JS_CONFIG`, `UI_CONFIG`, `PERFORMANCE_TARGETS`

---

## Supported OpenSCAD Features - Full Language Support! 🎉

moicad now supports most OpenSCAD language features, making it a viable OpenSCAD replacement!

### Primitives
- `cube(size)` - Default 10
- `sphere(r or radius or d/diameter, $fn or detail)` - Default detail 20
- `cylinder(r/radius, h/height, $fn, r1, r2)` - Default radius 5, height 10
- `cone(r/radius, h/height, $fn)` - Default radius 5, height 10
- `circle(r/radius, d/diameter, $fn)` - Default radius 5
- `square(size)` - Default 10

### Transformations
- `translate([x, y, z])` - Move geometry
- `rotate(angle)` or `rotate(angle, [x, y, z])` - Rotate (default: Z-axis, degrees)
- `scale([x, y, z])` - Scale geometry
- `mirror([x, y, z])` - Reflect geometry
- `multmatrix([[16 matrix elements]])` - Custom 4x4 transformation

### Boolean Operations
- `union()` - Combine shapes ✅
- `difference()` - Subtract (currently returns first shape - placeholder)
- `intersection()` - Overlap (currently returns first shape - placeholder)

### Variables & Assignments ✅ NEW!
```scad
size = 10;
width = size * 2;
cube(width);
```

### Functions ✅ NEW!
```scad
function double(x) = x * 2;
function area(w, h) = w * h;
size = double(5);
cube(size);
```

### Modules ✅ NEW!
```scad
module box(w, h, d) {
    cube([w, h, d]);
}

module keycap(size) {
    difference() {
        cube(size);
        translate([1,1,1]) cube(size-2);
    }
}

box(10, 20, 5);
keycap(18);
```

### Conditional Statements ✅ NEW!
```scad
enable_feature = true;

if (enable_feature) {
    cube(10);
} else {
    sphere(5);
}
```

### Expressions & Operators ✅ NEW!
- **Arithmetic**: `+`, `-`, `*`, `/`, `%`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Logical**: `&&`, `||`, `!`
- **Ternary**: `condition ? true_value : false_value`

```scad
size = 10;
expanded = size * 1.5 + 2;
is_large = size > 5;
result = is_large ? 20 : 10;
cube(result);
```

### Built-in Math Functions ✅ NEW!
- `abs(x)`, `ceil(x)`, `floor(x)`, `round(x)`
- `sqrt(x)`, `pow(x, y)`
- `sin(x)`, `cos(x)`, `tan(x)` - angles in degrees
- `min(x, y, ...)`, `max(x, y, ...)`
- `len(array)` - array length

### Control Flow
- `for (var = [start : end])` or `for (var = [start : step : end])` - Loop with accumulation ✅

### Comments
- Single-line: `// comment`
- Multi-line: `/* comment */`

### Not Yet Implemented
- Advanced operations: hull ✅, minkowski
- 2D extrusions: linear_extrude, rotate_extrude
- Polygon, polyhedron
- Imports, include
- Color/material
- List comprehensions
- Special variables: `$fa`, `$fs`, `$t`

---

## API Specification

### REST Endpoints

#### POST `/api/parse`
Parse OpenSCAD code to AST.
```json
Request: { "code": "cube(10);" }
Response: { "ast": [...], "errors": [], "success": true }
```

#### POST `/api/evaluate`
Parse and evaluate to 3D geometry.
```json
Request: { "code": "sphere(10);" }
Response: {
  "geometry": {
    "vertices": [...],
    "indices": [...],
    "normals": [...],
    "bounds": { "min": [...], "max": [...] },
    "stats": { "vertexCount": N, "faceCount": N }
  },
  "errors": [],
  "success": true,
  "executionTime": 45.2
}
```

#### POST `/api/export`
Export geometry to file format (STL or OBJ).
```json
Request: { "geometry": {...}, "format": "stl" }
Response: Binary STL file with MIME type application/octet-stream
```

### WebSocket `/ws`

Real-time code evaluation. Client sends:
```json
{
  "type": "evaluate",
  "code": "cube(10);",
  "requestId": "abc123"
}
```

Server responds:
```json
{
  "type": "evaluate_response",
  "requestId": "abc123",
  "geometry": {...},
  "errors": [],
  "executionTime": 42.1
}
```

---

## Known Limitations & TODOs

### Implemented but Limited
- **Difference/Intersection**: Return first shape only (placeholders for proper CSG)
- **Parameters**: Basic support; some OpenSCAD advanced features missing
- **Detail levels**: Fixed or simple parametrization

### Not Implemented
- **User functions**: AST structure exists, evaluator incomplete
- **Advanced CSG**: hull, minkowski
- **Extrusion**: linear_extrude, rotate_extrude
- **Custom shapes**: polygon, polyhedron
- **Modules/imports**
- **Color/appearance**
- **Frontend**: Next.js, React components, Three.js viewport pending
- **MCP server**: Not started
- **Tauri desktop app**: Not started

### Performance Notes
- Parse: ~30-50ms typical
- Evaluate: ~50-100ms typical
- WASM compilation: ~2-3 seconds
- WebSocket latency: <50ms expected

---

## Bun-Specific Conventions

This project uses Bun runtime exclusively:

- **`bun --hot ./backend/index.ts`** - Auto-reload server on file changes
- **`Bun.serve()`** - Server with WebSocket support (not Express)
- **`#[wasm_bindgen]`** - Rust ↔ JavaScript interop
- **Dynamic imports** - WASM module loaded at runtime with error handling
- **TypeScript support** - Bun runs .ts files directly

---

## Key Files to Understand

**For parsing changes**: `backend/scad-parser.ts` (Tokenizer + Parser classes)
**For evaluation logic**: `backend/scad-evaluator.ts` (evaluateNode functions)
**For geometry**: `wasm/src/primitives.rs` + `wasm/src/geometry.rs`
**For transformations**: `wasm/src/math.rs` + `wasm/src/csg.rs`
**For exports**: `backend/index.ts` (geometryToSTL, geometryToOBJ functions)

---

## Development Notes

### Adding New Primitives

1. Add to `wasm/src/primitives.rs` - returns `Mesh`
2. Export via `#[wasm_bindgen]` in `wasm/src/lib.rs`
3. Add case in `backend/scad-evaluator.ts` `evaluatePrimitive()`
4. Update `shared/constants.ts` `PRIMITIVES`
5. Rebuild: `cd wasm && wasm-pack build --target web`

### Adding New Transformations

1. Add to `wasm/src/csg.rs` (or math.rs for matrix operations)
2. Export via `#[wasm_bindgen]` in `wasm/src/lib.rs`
3. Add case in `backend/scad-evaluator.ts` `evaluateTransform()`
4. Update `shared/constants.ts` `TRANSFORMS`
5. Rebuild WASM

### Debugging Parser Issues

1. Check tokenizer output: Add logging in `Tokenizer.tokenize()`
2. Check AST structure: Use `/api/parse` endpoint
3. Verify error position: Line/column info in error object
4. Test with simpler code incrementally

### Debugging Geometry Issues

1. Check vertex/index counts: Available in `stats` object
2. Verify bounds: Check `bounds.min` and `bounds.max`
3. Export to STL: Verify with slicing software (Cura, Prusaslicer)
4. Check normals: Should be normalized (length ~1.0)

---

## Documentation Files

- **`IMPLEMENTATION_STATUS.md`** - Feature list, architecture, known limitations
- **`BUILD_GUIDE.md`** - Quick start, API reference, examples
- **`/claude/plans/elegant-cuddling-ullman.md`** - Original design plan with full technical decisions

