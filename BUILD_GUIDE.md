# moicad Build & Development Guide

## Quick Start

### 1. Install Dependencies
```bash
# Install JavaScript dependencies
bun install

# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack (for building Rust → WASM)
cargo install wasm-pack
```

### 2. Build WASM Module
```bash
cd wasm
wasm-pack build --target web
cd ..
```

This generates `/wasm/pkg/` with TypeScript bindings and .wasm files.

### 3. Start Backend Server
```bash
bun --hot ./backend/index.ts
```

Server starts on `http://localhost:3000`

### 4. Test API Endpoints

**Parse endpoint:**
```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'
```

**Evaluate endpoint:**
```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"translate([5,0,0]) sphere(10);"}'
```

**Health check:**
```bash
curl http://localhost:3000/health
```

---

## Architecture Overview

### What's Built

#### Backend (TypeScript/Bun)
- ✅ **Parser** (`backend/scad-parser.ts`)
  - Tokenizer for OpenSCAD syntax
  - Recursive descent parser → AST
  - Error reporting with line/column

- ✅ **Evaluator** (`backend/scad-evaluator.ts`)
  - Executes AST using WASM CSG engine
  - Variable scoping
  - Loop handling
  - Error propagation

- ✅ **Server** (`backend/index.ts`)
  - REST API for parse/evaluate/export
  - WebSocket for real-time updates
  - STL/OBJ export
  - Health check endpoint

#### WASM CSG Engine (Rust)
- ✅ **Math** (`wasm/src/math.rs`)
  - 3D vectors with operations
  - 4x4 transformation matrices

- ✅ **Geometry** (`wasm/src/geometry.rs`)
  - Mesh data structure
  - Normal calculation
  - Bounds computation
  - JSON serialization

- ✅ **Primitives** (`wasm/src/primitives.rs`)
  - cube, sphere, cylinder, cone, circle, square

- ✅ **CSG Operations** (`wasm/src/csg.rs`)
  - union, difference, intersection
  - translate, rotate, scale, mirror
  - multmatrix

#### Types & Constants
- ✅ **Shared types** (`shared/types.ts`)
- ✅ **Shared constants** (`shared/constants.ts`)

### What's Not Built Yet

- ❌ Frontend (Next.js + React)
  - Code editor component
  - 3D viewport (Three.js)
  - Controls sidebar
  - Real-time preview

- ❌ MCP server for AI integration
- ❌ Tauri desktop app
- ❌ Advanced CSG (difference, intersection proper implementation)
- ❌ 2D extrusions
- ❌ User-defined functions

---

## Development Workflow

### Making Changes

1. **Modify Rust code** in `wasm/src/`
   ```bash
   cd wasm
   wasm-pack build --target web
   ```

2. **Modify TypeScript** in `backend/`
   - Server auto-reloads with `bun --hot`

3. **Test immediately**
   ```bash
   curl -X POST http://localhost:3000/api/evaluate \
     -H "Content-Type: application/json" \
     -d '{"code":"YOUR_CODE_HERE"}'
   ```

---

## Example OpenSCAD Code

### Cube
```
cube(10);
```

### Translated Sphere
```
translate([10, 0, 0]) sphere(5);
```

### Rotated Cylinder
```
rotate(45, [0, 1, 0]) cylinder(5, 20);
```

### Union
```
union(
  cube(10),
  translate([8, 0, 0]) sphere(5)
);
```

### For Loop
```
for (i = [0 : 5 : 50]) {
  translate([i, 0, 0]) cube(5);
}
```

---

## API Reference

### POST /api/parse
Parse OpenSCAD code to AST.

**Request:**
```json
{
  "code": "cube(10);"
}
```

**Response:**
```json
{
  "ast": [...],
  "errors": [],
  "success": true
}
```

### POST /api/evaluate
Parse and evaluate to geometry.

**Request:**
```json
{
  "code": "sphere(10);"
}
```

**Response:**
```json
{
  "geometry": {
    "vertices": [...],
    "indices": [...],
    "normals": [...],
    "bounds": {...},
    "stats": {...}
  },
  "errors": [],
  "success": true,
  "executionTime": 45.2
}
```

### POST /api/export
Export geometry to file format.

**Request:**
```json
{
  "geometry": {...},
  "format": "stl"
}
```

**Response:** Binary STL file

### WebSocket /ws
Real-time code evaluation.

**Message format:**
```json
{
  "type": "evaluate",
  "code": "cube(10);",
  "requestId": "abc123"
}
```

**Response:**
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

## Troubleshooting

### WASM Module Not Loading
```
Error: Failed to load WASM module
```

**Solution:** Rebuild WASM
```bash
cd wasm && wasm-pack build --target web
```

### Port 3000 Already in Use
```bash
# Change port in backend/index.ts
# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### WASM Compilation Errors
```bash
# Update Rust
rustup update

# Rebuild with verbose output
cargo build --release
wasm-pack build --target web
```

---

## Next Steps

To complete the MVP:

1. **Setup Next.js frontend**
   ```bash
   cd frontend
   npx create-next-app@latest . --typescript
   ```

2. **Create React components**
   - Editor component (Monaco)
   - Viewport component (Three.js)
   - Sidebar component

3. **Connect to backend**
   - Fetch /api/evaluate
   - WebSocket for live preview
   - Export functionality

4. **Add MCP server** for AI integration

5. **Package with Tauri** for desktop

---

## Performance

### Targets
- Parse: < 50ms
- Evaluate: < 100ms
- WebSocket: < 50ms latency
- Rendering: 60 FPS

### Monitoring
All API responses include `executionTime` in milliseconds.

---

## Files Reference

| File | Purpose |
|------|---------|
| `backend/index.ts` | Bun server, API routes |
| `backend/scad-parser.ts` | OpenSCAD tokenizer & parser |
| `backend/scad-evaluator.ts` | AST → geometry evaluator |
| `wasm/src/lib.rs` | WASM module entry point |
| `wasm/src/math.rs` | Vector & matrix operations |
| `wasm/src/geometry.rs` | Mesh data structures |
| `wasm/src/primitives.rs` | Primitive shape generators |
| `wasm/src/csg.rs` | CSG operations |
| `shared/types.ts` | TypeScript interfaces |
| `shared/constants.ts` | Constants & configuration |

---

**Ready to build!** 🚀
