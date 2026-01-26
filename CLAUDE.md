# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: moicad - Modern OpenSCAD CAD Engine

moicad is a high-performance OpenSCAD clone built as a clean Bun monorepo with:
- **Runtime**: Bun (TypeScript/JavaScript)
- **CSG Engine**: manifold-3d (WebAssembly)
- **Backend**: REST API + WebSocket + MCP server
- **Frontend**: Next.js 16 + React + Three.js
- **Desktop**: Tauri (optional)

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
Manifold-3d CSG Engine (manifold-3d npm package)
    ↓
Geometry (vertices, indices, normals)
    ↓
Three.js Viewport (frontend)
```

### Three Layers

1. **Frontend (Next.js + React)** - ✅ **FULLY IMPLEMENTED**
   - Monaco editor with OpenSCAD syntax highlighting
   - Three.js canvas for 3D visualization
   - WebSocket connection for real-time updates
   - File management UI with export functionality
   - Interactive features: hover, selection, multi-select
   - Professional Blender-style dark theme

2. **Backend (Bun Server)** - ✅ **FULLY IMPLEMENTED**
   - REST API: `/api/parse`, `/api/evaluate`, `/api/export`
   - WebSocket: `/ws` for real-time updates
   - MCP Server: `/ws/mcp` for AI integration
   - Parser: Full OpenSCAD syntax support
   - Evaluator: Executes AST using manifold-3d
   - Export: STL (binary/ASCII) and OBJ formats

3. **CSG Engine (manifold-3d)** - ✅ **FULLY IMPLEMENTED**
   - Primitives: cube, sphere, cylinder, cone, circle, square, polygon, polyhedron, text, surface
   - Transformations: translate, rotate, scale, mirror, multmatrix
   - CSG operations: union, difference, intersection, hull, minkowski
   - 2D operations: linear_extrude, rotate_extrude, offset, projection
   - Guaranteed manifold output (no topology errors!)

---

## Common Development Tasks

### Build & Run

```bash
# Install dependencies
bun install
cd frontend && npm install && cd ..

# Start backend server (http://localhost:42069)
bun run dev

# Start frontend (http://localhost:3002) - in another terminal
bun run dev:frontend

# Or run both concurrently
bun run dev:all

# Test API endpoints
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'

# Check server health
curl http://localhost:42069/health
```

### Testing

```bash
# Quick test
bun run test:quick

# Run all tests
bun run test:all

# Unit tests by category
bun run test:unit
bun run test:integration
bun run test:performance

# Comprehensive validation
bun run test:validation
```

### MCP Server Integration

moicad exposes an MCP server for AI integration. Claude Desktop can connect to moicad to evaluate OpenSCAD code.

**Claude Desktop Configuration** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "moicad": {
      "command": "bun",
      "args": ["run", "/path/to/moicad/backend/index.ts"],
      "env": {
        "MCP_ENABLED": "true"
      }
    }
  }
}
```

**MCP Tools Available**:
- `evaluate_scad`: Evaluate OpenSCAD code to geometry
- `parse_scad`: Parse code to AST
- `export_geometry`: Export to STL/OBJ
- `list_examples`: Get example OpenSCAD files
- `get_documentation`: Get OpenSCAD documentation

---

## File Organization & Key Concepts

### Backend Structure (Bun Runtime)

- **`backend/index.ts`** - Main server entry point
  - Bun.serve() with REST + WebSocket + MCP
  - Routes: `/api/parse`, `/api/evaluate`, `/api/export`
  - WebSocket handlers: `/ws` (real-time), `/ws/mcp` (AI integration)
  - STL/OBJ export functions
  - Single-threaded job queue for OpenSCAD evaluations

- **`backend/scad-parser.ts`** - Tokenizer + Parser
  - `Tokenizer` class: Lexical analysis
  - `Parser` class: Recursive descent parser
  - `parseOpenSCAD()`: Public entry point
  - Returns: `ParseResult` with AST, errors, success flag
  - **Full OpenSCAD support**: variables, functions, modules, expressions

- **`backend/scad-evaluator.ts`** - AST Execution
  - `evaluateAST()`: Main evaluation function
  - Evaluates all node types using manifold-3d
  - **Full scope management**: Variables, functions, modules
  - Built-in functions: abs, ceil, floor, round, sqrt, sin, cos, tan, min, max, pow, len, etc.
  - Expression evaluation: arithmetic, logical, comparison, ternary
  - Returns: `EvaluateResult` with geometry, errors, success, executionTime

- **`backend/manifold-*.ts`** - Manifold-3d Integration
  - `manifold-engine.ts`: Initialize manifold WASM module
  - `manifold-primitives.ts`: Cube, sphere, cylinder, etc.
  - `manifold-csg.ts`: Union, difference, intersection, hull, minkowski
  - `manifold-transforms.ts`: Translate, rotate, scale, mirror
  - `manifold-geometry.ts`: Conversion utilities (manifold ↔ Geometry)
  - `manifold-2d.ts`: 2D operations (offset, projection)
  - `manifold-extrude.ts`: linear_extrude, rotate_extrude
  - `manifold-text.ts`: Text rendering with bitmap font
  - `manifold-surface.ts`: Heightmap surface generation

- **`backend/mcp-server.ts`** - MCP Server
  - Model Context Protocol implementation
  - Exposes moicad to AI agents (Claude Desktop, etc.)
  - Tools for code evaluation, parsing, export
  - Session management for collaborative design

### Frontend Structure (Next.js + React)

- **`frontend/app/page.tsx`** - Main page component
  - Editor + Viewport layout
  - WebSocket integration
  - File management
  - Top menu and settings

- **`frontend/components/Editor.tsx`** - Monaco editor
  - OpenSCAD syntax highlighting
  - Real-time parsing
  - Error display
  - Alt+R keyboard shortcut for render

- **`frontend/components/Viewport.tsx`** - Three.js viewport
  - SceneManager for 3D rendering
  - Interactive highlighting (hover, selection)
  - Camera controls (orbit, pan, zoom)
  - Grid and printer bed visualization

- **`frontend/lib/three-utils.ts`** - SceneManager
  - Three.js scene setup
  - Geometry rendering from vertices/indices/normals
  - Interactive raycasting for object selection
  - Lighting, shadows, materials

- **`frontend/lib/api-client.ts`** - API client
  - REST API calls: parseCode, evaluateCode, exportGeometry
  - Error handling and progress tracking
  - Type-safe requests/responses

### Shared Types

- **`shared/types.ts`** - TypeScript interfaces
  - `ScadNode`: AST node types (primitive, transform, boolean, etc.)
  - `Geometry`: Vertices, indices, normals, bounds, stats
  - `ParseResult`: AST + errors + success flag
  - `EvaluateResult`: Geometry + errors + success + executionTime
  - `WsMessage`: WebSocket message types

- **`shared/constants.ts`** - Configuration
  - `SCAD_KEYWORDS`: OpenSCAD reserved words
  - `PRIMITIVES`, `TRANSFORMS`, `BOOLEAN_OPS`: Available operations
  - `DEFAULT_PARAMS`: Default parameter values
  - `API_ENDPOINTS`: REST and WebSocket URLs
  - `THREE_JS_CONFIG`, `UI_CONFIG`

---

## Supported OpenSCAD Features - 98-99% Compatible! 🎉

### Primitives ✅
- cube, sphere, cylinder, cone
- circle, square, polygon, polyhedron
- text (ASCII, basic Latin)
- surface (heightmap import)

### Transformations ✅
- translate, rotate, scale, mirror
- multmatrix (4x4 custom transforms)

### CSG Operations ✅
- union, difference, intersection
- hull (convex hull)
- minkowski (Minkowski sum)

### 2D Operations ✅
- linear_extrude, rotate_extrude
- offset (expand/contract)
- projection (3D → 2D)

### Language Features ✅
- Variables, functions, modules
- Conditionals (if/else), loops (for)
- Expressions, operators (arithmetic, logical, ternary)
- List comprehensions
- Built-in functions (math, array, string)
- File imports (include, use)
- Special variables ($fn, $fa, $fs, $t, $vpr, $vpt, $preview, etc.)
- OpenSCAD modifiers (#, %, !, *)

### Interactive Features ✅
- Real-time hover highlighting
- Click selection, multi-select
- Code-to-geometry mapping
- Visual feedback with status overlay

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
    "vertices": [...],  // Array of numbers (not TypedArray!)
    "indices": [...],   // Array of numbers
    "normals": [...],   // Array of numbers
    "bounds": { "min": [...], "max": [...] },
    "stats": { "vertexCount": N, "faceCount": N, "volume": V }
  },
  "errors": [],
  "success": true,
  "executionTime": 45.2
}
```

#### POST `/api/export`
Export geometry to STL or OBJ.
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

### MCP WebSocket `/ws/mcp`

Model Context Protocol for AI integration. Used by Claude Desktop and other AI tools.

---

## Known Limitations & TODOs

### Fully Implemented ✅
- **Language Core**: Variables, functions, modules, conditionals
- **CSG Operations**: union, difference, intersection, hull, minkowski
- **All Primitives**: Including text and surface
- **All Transformations**: Including multmatrix
- **2D Operations**: linear_extrude, rotate_extrude, offset, projection
- **Interactive Highlighting**: Real-time hover, selection, multi-select
- **OpenSCAD Modifiers**: Debug (#), Transparent (%), Root (!), Disable (*)

### Future Enhancements
- **Tauri Desktop App**: Native executable with better performance
- **Advanced Text**: Full Unicode support, custom fonts
- **Animation**: $t variable animation timeline
- **Collaborative Design**: Multi-user editing via MCP

### Current Compatibility: ~100% OpenSCAD compatible

---

## Bun-Specific Conventions

This project uses Bun runtime exclusively:

- **`bun --hot ./backend/index.ts`** - Auto-reload server on file changes
- **`Bun.serve()`** - Server with WebSocket support (not Express)
- **Dynamic imports** - Manifold-3d loaded at runtime
- **TypeScript support** - Bun runs .ts files directly
- **Fast package manager** - `bun install` instead of npm

---

## Key Files to Understand

**For parsing changes**: `backend/scad-parser.ts`
**For evaluation logic**: `backend/scad-evaluator.ts`
**For geometry**: `backend/manifold-geometry.ts` + `backend/manifold-primitives.ts`
**For CSG operations**: `backend/manifold-csg.ts`
**For 3D rendering**: `frontend/lib/three-utils.ts`
**For MCP integration**: `backend/mcp-server.ts`

---

## Development Notes

### Adding New Primitives

1. Add to `backend/manifold-primitives.ts`
2. Add case in `backend/scad-evaluator.ts` `evaluatePrimitive()`
3. Update `shared/constants.ts` `PRIMITIVES`
4. Add tests in `tests/unit/primitives/`

### Adding New Transformations

1. Add to `backend/manifold-transforms.ts`
2. Add case in `backend/scad-evaluator.ts` `evaluateTransform()`
3. Update `shared/constants.ts` `TRANSFORMS`
4. Add tests in `tests/unit/transformations/`

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

- **`README.md`** - Project overview, quick start, API reference
- **`BUILD_GUIDE.md`** - Detailed build instructions
- **`IMPLEMENTATION_STATUS.md`** - Feature implementation status
- **`MANIFOLD_MIGRATION_COMPLETE.md`** - Manifold-3d migration details
- **`BUG_FIX_DOUBLE_NESTING.md`** - Bug fix: API response structure
- **`BUG_FIX_TYPEDARRAY_SERIALIZATION.md`** - Bug fix: TypedArray → Array conversion
- **`COLLABORATION_GUIDE.md`** - Contributing guidelines
