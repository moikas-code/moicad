# moicad - OpenSCAD Clone with WASM CSG Engine

A web-based OpenSCAD clone built with a Bun backend, Rust WASM geometry engine, and Next.js frontend. Write OpenSCAD code in the browser and visualize 3D geometry in real-time.

## Quick Start

### Prerequisites
- [Bun](https://bun.com) (v1.3.5+)
- [Rust & wasm-pack](https://www.rust-lang.org/)

### Build & Run

```bash
# Build WASM module first (required)
cd wasm && wasm-pack build --target web && cd ..

# Install dependencies
bun install

# Start backend server (http://localhost:3000)
bun --hot ./backend/index.ts
```

The backend API is ready at `http://localhost:3000`. The frontend UI is pending development.

## Project Architecture

### Three-Layer Pipeline

```
OpenSCAD Code
    ↓ Parser
Abstract Syntax Tree (AST)
    ↓ Evaluator
WASM CSG Engine (Rust)
    ↓
3D Geometry (vertices, indices, normals)
    ↓ Three.js (frontend - pending)
Viewport / STL Export
```

### Components

1. **Backend (Bun Server)** ✅ Complete
   - REST API: `/api/parse`, `/api/evaluate`, `/api/export`
   - WebSocket: `/ws` for real-time updates
   - Parser: Tokenizes and parses OpenSCAD syntax
   - Evaluator: Executes AST using WASM engine
   - Export: STL (binary/ASCII) and OBJ formats

2. **WASM CSG Engine (Rust)** ✅ Complete
   - Primitives: cube, sphere, cylinder, cone, circle, square
   - Transformations: translate, rotate, scale, mirror, multmatrix
   - Boolean ops: union (difference/intersection are placeholders)
   - Math: 3D vectors, 4x4 matrices, mesh operations

3. **Frontend (Next.js + React)** ⏳ Pending
   - Monaco editor for code input
   - Three.js canvas for 3D visualization
   - WebSocket connection to backend
   - File management UI

## Supported OpenSCAD Features

### Primitives
- `cube(size)` - 3D cube
- `sphere(radius, $fn)` - UV sphere with detail level
- `cylinder(radius, height, $fn)` - With optional tapers (r1, r2)
- `cone(radius, height, $fn)` - Cone shape
- `circle(radius, $fn)` - 2D circle
- `square(size)` - 2D square

### Transformations
- `translate([x, y, z])` - Move geometry
- `rotate(angle)` or `rotate(angle, [x, y, z])` - Rotate in degrees
- `scale([x, y, z])` - Scale geometry
- `mirror([x, y, z])` - Mirror/reflect geometry
- `multmatrix([...])` - Custom 4x4 matrix transformation

### Boolean Operations
- `union()` - Combine shapes ✅
- `difference()` - Subtract shapes (placeholder)
- `intersection()` - Overlap shapes (placeholder)

### Control Flow
- `for (var = [start : end])` - Loop with variable
- `for (var = [start : step : end])` - Loop with step

## API Examples

### Parse OpenSCAD Code

```bash
curl -X POST http://localhost:3000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'
```

### Evaluate to 3D Geometry

```bash
curl -X POST http://localhost:3000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"union(cube(10), translate([8,0,0]) sphere(5));"}'
```

### Export to STL

```bash
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"geometry":{...},"format":"stl"}' \
  > model.stl
```

### WebSocket Real-Time Evaluation

```javascript
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

## Development

### File Organization

- **`backend/index.ts`** - Bun server entry point with routes
- **`backend/scad-parser.ts`** - Tokenizer and recursive descent parser
- **`backend/scad-evaluator.ts`** - AST executor using WASM engine
- **`wasm/src/`** - Rust WASM module
  - `lib.rs` - WASM entry point with exported functions
  - `primitives.rs` - Shape generators (cube, sphere, etc.)
  - `csg.rs` - Boolean operations and transformations
  - `math.rs` - Vector and matrix math
  - `geometry.rs` - Mesh and bounds operations
- **`shared/types.ts`** - Shared TypeScript interfaces
- **`shared/constants.ts`** - Configuration and constants

### Adding New Primitives

1. Add shape function to `wasm/src/primitives.rs`
2. Export with `#[wasm_bindgen]` in `wasm/src/lib.rs`
3. Add case in `backend/scad-evaluator.ts` `evaluatePrimitive()`
4. Update `shared/constants.ts` `PRIMITIVES`
5. Rebuild: `cd wasm && wasm-pack build --target web`

### Modifying WASM

After any changes to `wasm/src/`:

```bash
cd wasm
wasm-pack build --target web
cd ..
# Server will auto-reload with bun --hot
```

## Known Limitations

- **Difference/Intersection**: Currently return first shape (placeholders)
- **No user functions**: AST ready, evaluator needs implementation
- **No advanced features**: hull, minkowski, extrusion, modules
- **No frontend**: UI and 3D visualization pending
- **No MCP server**: AI-assisted operations pending
- **No Tauri app**: Desktop client pending

## Performance

- Parse: ~30-50ms typical
- Evaluate: ~50-100ms typical
- WASM compilation: ~2-3 seconds
- WebSocket latency: <50ms expected

## Technologies

- **Runtime**: [Bun](https://bun.com) - Fast JavaScript runtime
- **WASM**: [Rust](https://www.rust-lang.org/) + [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen)
- **Frontend**: [Next.js](https://nextjs.org/) + [React](https://react.dev/) (pending)
- **3D Rendering**: [Three.js](https://threejs.org/) (pending)
- **Export**: STL and OBJ formats

---

For detailed information, see [CLAUDE.md](./CLAUDE.md).
