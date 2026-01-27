# moicad - OpenSCAD Clone Implementation Status

## ✅ Completed Components (Phase 1-2)

### Project Structure & Dependencies
- ✅ Created directory structure for backend, WASM, frontend, MCP server
- ✅ Updated `package.json` with all required dependencies
- ✅ Configured Cargo.toml for WASM module

### Core WASM CSG Engine (Rust)
- ✅ `wasm/src/math.rs` - Vector and matrix math utilities
  - Vec3: 3D vectors with operations (add, subtract, scale, dot, cross, normalize)
  - Mat4: 4x4 transformation matrices (translation, rotation, scale)
  - Used for all geometric transformations

- ✅ `wasm/src/geometry.rs` - Mesh data structures
  - Mesh class with vertices, indices, normals
  - Bounds calculation (min/max, volume)
  - Normal calculation for proper lighting
  - JSON serialization for transport to frontend

- ✅ `wasm/src/primitives.rs` - Primitive shape generators
  - `cube(size)` - Cube centered at origin
  - `sphere(radius, detail)` - UV sphere with configurable detail
  - `cylinder(radius, height, detail)` - Cylinder with caps
  - `cone(radius, height, detail)` - Cone shape
  - `circle(radius, detail)` - 2D circle
  - `square(size)` - 2D square

- ✅ `wasm/src/csg.rs` - CSG operations
  - `union(a, b)` - Combine two meshes
  - `difference(a, b)` - BSP tree-based boolean subtraction
  - `intersection(a, b)` - BSP tree-based boolean intersection
  - `translate(mesh, x, y, z)` - Translation (column-major matrix)
  - `rotate_x/y/z(mesh, angle)` - Rotation around axes
  - `scale(mesh, sx, sy, sz)` - Scaling
  - `mirror_x/y/z(mesh)` - Mirroring
  - `multmatrix(mesh, matrix)` - Custom 4x4 transformation

- ✅ `wasm/src/bsp.rs` - BSP tree implementation
  - Binary Space Partitioning for mesh boolean operations
  - Polygon splitting and classification
  - Used by difference() and intersection()

- ✅ `wasm/src/hull.rs` - Convex hull operations
  - Quickhull algorithm for 3D convex hull
  - hull() for single meshes
  - hull_two() for combining meshes before hull

- ✅ `wasm/src/lib.rs` - WASM module entry point
  - WasmMesh wrapper class exposed to JavaScript
  - All primitives exported as functions
  - All CSG operations exported as functions
  - Proper JSON serialization

### OpenSCAD Parser (TypeScript)
- ✅ `backend/scad-parser.ts` - Complete OpenSCAD parser
  - Tokenizer: Lexical analysis with proper token recognition
  - Parser: Recursive descent parser for OpenSCAD syntax
  - Support for:
    - Primitives: cube, sphere, cylinder, cone, circle, square, polygon
    - Transformations: translate, rotate, scale, mirror, multmatrix
    - Boolean operations: union, difference, intersection
    - Loops: for loops with ranges
    - Comments: Single-line (//) and multi-line (/* */)
    - String and numeric literals
    - Parameter passing (named parameters)
  - Error reporting with line/column information
  - AST generation

### OpenSCAD Evaluator (TypeScript)
- ✅ `backend/scad-evaluator.ts` - AST execution engine
  - Converts AST to 3D geometry by calling WASM functions
  - Expression evaluation with variable context
  - For loop expansion
  - Function definition support (structure ready)
  - Proper error handling and propagation
  - Execution timing metrics
  - Geometry combination with union

### Bun Backend Server
- ✅ `backend/index.ts` - Complete Bun server implementation
  - REST API endpoints:
    - `POST /api/parse` - Parse OpenSCAD code to AST
    - `POST /api/evaluate` - Parse and evaluate to geometry
    - `POST /api/export` - Export to STL/OBJ
  - WebSocket support:
    - Real-time code evaluation
    - Incremental updates
  - STL export (binary and ASCII formats)
  - OBJ export with normals
  - Export route with proper MIME types
  - CORS headers for frontend integration
  - WASM module dynamic loading
  - Health check endpoint

### Shared Types & Constants
- ✅ `shared/types.ts` - TypeScript interfaces for all data structures
  - AST node types
  - Geometry format
  - Parse/evaluate results
  - WebSocket message types
  - Error handling structures

- ✅ `shared/constants.ts` - Shared constants
  - OpenSCAD keywords
  - Primitives, operators, functions
  - Default parameters for shapes
  - API endpoints
  - UI and performance configuration

---

## ✅ Completed - Frontend (Phase 3)

### Frontend Setup
- ✅ Next.js 14 project with App Router
- ✅ Tailwind CSS configured
- ✅ TypeScript configuration
- ✅ Blender-style dark theme

### React Components
- ✅ `frontend/components/Editor.tsx` - Monaco editor with debounced evaluation
- ✅ `frontend/components/Viewport.tsx` - Three.js 3D canvas with orbit controls
- ✅ `frontend/components/Sidebar.tsx` - Controls, stats, export buttons
- ✅ `frontend/components/FileManager.tsx` - File open/save with localStorage
- ✅ `frontend/components/ErrorDisplay.tsx` - Error rendering

### Hooks & Utilities
- ✅ `frontend/hooks/useEditor.ts` - Code state + persistence
- ✅ `frontend/hooks/useGeometry.ts` - Geometry rendering state
- ✅ `frontend/hooks/useWebSocket.ts` - WebSocket connection
- ✅ `frontend/lib/api-client.ts` - REST API communication
- ✅ `frontend/lib/three-utils.ts` - Three.js SceneManager
- ✅ `frontend/lib/websocket.ts` - WebSocket client
- ✅ `frontend/lib/storage.ts` - LocalStorage persistence

### Integration
- ✅ Real-time debounced code evaluation (500ms)
- ✅ Live geometry preview with flat shading
- ✅ Error display with line numbers
- ✅ Export to STL (binary) and OBJ formats
- ✅ CORS support for cross-origin requests

---

## 🚧 In Progress / Next Steps

### ✅ Recently Completed
- [x] BSP tree-based difference() and intersection()
- [x] hull() operation with quickhull algorithm
- [x] Fixed matrix transformations (column-major format)
- [x] Fixed positional parameter handling for all primitives
- [x] Parser support for single-statement transform children
- [x] Tauri desktop app integration (Arch Linux, macOS, Windows)
- [x] Blender dark theme UI

### Desktop App (Tauri) - ✅ Complete
- [x] Tauri configuration (`src-tauri/tauri.conf.json`)
- [x] Rust entry point with backend spawning (`src-tauri/src/main.rs`)
- [x] Next.js static export for Tauri bundling
- [x] Build scripts for Linux, macOS, Windows
- [x] Build documentation (`BUILD_DESKTOP.md`)

### MCP Server Integration
- [ ] Standalone MCP server exposing CAD tools
- [ ] Integration with Claude/AI assistants

### Geometry Improvements
- [ ] minkowski() operation
- [ ] linear_extrude() and rotate_extrude()
- [ ] Per-face vertex generation for proper smooth/flat shading control

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js + React)               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   Editor     │ │  Viewport    │ │  Sidebar     │        │
│  │  (Monaco)    │ │  (Three.js)  │ │  (Controls)  │        │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘        │
│         └────────────────┬─────────────────┘                │
│                          │ WebSocket / HTTP                 │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│         Backend (Bun Server)                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  REST API & WebSocket Handler                       │  │
│  │  /api/parse | /api/evaluate | /api/export | /ws    │  │
│  └─────────────┬─────────────────┬─────────────────────┘  │
│                │                 │                        │
│  ┌─────────────▼────┐ ┌──────────▼──────────────┐         │
│  │  Parser         │ │  Evaluator              │         │
│  │ (AST gen)       │ │ (Calls WASM engine)     │         │
│  └─────────────────┘ └──────────┬──────────────┘         │
│                                  │                        │
│                    ┌─────────────▼──────────────┐        │
│                    │   WASM CSG Engine (Rust)   │        │
│                    ├─────────────────────────────┤        │
│                    │ Primitives                  │        │
│                    │ CSG Operations              │        │
│                    │ Transformations             │        │
│                    │ Mesh Processing             │        │
│                    └────────────────────────────┘        │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Export Module (STL, OBJ)                        │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Building & Running

### Prerequisites
- Node.js/Bun
- Rust & Cargo
- wasm-pack

### Build WASM Module
```bash
cd wasm
wasm-pack build --target web
```

### Install Dependencies
```bash
bun install
```

### Start Development Server
```bash
# Backend only (port 42069)
bun run dev

# Frontend only (port 3001)
bun run dev:frontend

# Both frontend and backend together
bun run dev:all
```

- Backend: `http://localhost:42069`
- Frontend: `http://localhost:3002`

---

## 📝 Supported OpenSCAD Features (MVP)

### Primitives
- cube(size)
- sphere(radius, detail)
- cylinder(radius, height, detail)
- cone(radius, height, detail)
- circle(radius, detail)
- square(size)

### Transformations
- translate([x, y, z])
- rotate([angle]) or rotate(angle, [axis])
- scale([x, y, z])
- mirror([x, y, z])
- multmatrix([[matrix]])

### Boolean Operations
- union()
- difference() - BSP tree-based
- intersection() - BSP tree-based
- hull() - Convex hull

### Control Flow
- for loops with ranges
- Variables

### Language Features Implemented
- Variables and assignments
- User-defined functions
- User-defined modules  
- Let statements with proper scoping
- If/else conditional statements
- For loops with ranges
- All math functions (abs, sqrt, sin, cos, etc.)
- String functions (str, chr, ord)
- Array functions (len, concat, cross, norm)
- Echo and assert statements
- Import/include/use statements

### Not Yet Implemented
- minkowski() operation
- 2D extrusions (linear_extrude, rotate_extrude)
- Color/material support
- Visualization modifiers (!, %, #, *)

---

## 🧪 Testing

### API Testing (curl examples)
```bash
# Test parse endpoint
curl -X POST http://localhost:42069/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'

# Test evaluate endpoint
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}'

# Test export endpoint
curl -X POST http://localhost:42069/api/export \
  -H "Content-Type: application/json" \
  -d '{"geometry":{...},"format":"stl"}' \
  > model.stl
```

### Health Check
```bash
curl http://localhost:42069/health
```

---

## 📚 File Structure
```
moicad/
├── backend/
│   ├── index.ts              # Bun server with REST API + WebSocket
│   ├── scad-parser.ts        # OpenSCAD tokenizer + parser
│   └── scad-evaluator.ts     # AST evaluator using WASM
├── wasm/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs           # WASM module entry
│   │   ├── math.rs          # Vector/matrix math (column-major)
│   │   ├── geometry.rs      # Mesh structures
│   │   ├── primitives.rs    # Primitive shapes
│   │   ├── csg.rs           # CSG operations
│   │   ├── bsp.rs           # BSP tree for boolean ops
│   │   └── hull.rs          # Convex hull (quickhull)
│   └── pkg/                 # Generated WASM (wasm-pack output)
├── frontend/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Main 3-panel layout
│   │   └── globals.css      # Blender dark theme styles
│   ├── components/
│   │   ├── Editor.tsx       # Monaco code editor
│   │   ├── Viewport.tsx     # Three.js 3D canvas
│   │   ├── Sidebar.tsx      # Controls + export
│   │   ├── FileManager.tsx  # File open/save
│   │   └── ErrorDisplay.tsx # Error messages
│   ├── hooks/               # React hooks
│   ├── lib/                 # Utilities (api-client, three-utils, etc.)
│   ├── next.config.js
│   └── package.json
├── mcp-server/              # (To be created)
├── shared/
│   ├── types.ts             # Type definitions
│   └── constants.ts         # Shared constants
├── package.json             # Root package with dev scripts
├── tsconfig.json
└── IMPLEMENTATION_STATUS.md # This file
```

---

## 🚀 Next Immediate Actions

1. **Build WASM** (if not built): `cd wasm && wasm-pack build --target web`
2. **Install deps**: `bun install && cd frontend && npm install`
3. **Start dev servers**: `bun run dev:all`
4. **Open frontend**: http://localhost:42069
5. **Test**: Type `cube(10);` or `sphere(5);` to see 3D geometry
6. **Next**: Add MCP server integration for AI-assisted CAD

---

## 📖 Key Design Decisions

✅ **Manifold-3D CSG**: Guaranteed manifold output, no BSP artifacts (migrated Jan 2026)
✅ **Three.js rendering**: Clean rendering with manifold geometry (custom WebGL deprecated)
✅ **Custom parser**: Hand-written recursive descent parser for full control
✅ **Bun server**: Lightweight, native WebSocket, fast startup
✅ **Web-first**: MVP as web app, Tauri wrapping later
✅ **Modular**: Clear separation between parser, evaluator, rendering

---

## 🐛 Known Limitations

- hull() computes correct bounds but may have more polygons than optimal
- minkowski() not yet implemented
- No support for user-defined functions yet (infrastructure ready)
- No animation or rendering features
- Limited to basic primitives for MVP
- 3D extrusions not implemented

---

## 🔄 Comparison with dingcad

moicad is designed as an improvement over [dingcad](https://github.com/yacineMTB/dingcad).

| Feature | dingcad | moicad |
|---------|---------|--------|
| **Platform** | Native desktop (Raylib) | Web-based (browser) |
| **Installation** | Requires compilation | Zero install (browser) |
| **Syntax** | JavaScript functional API | OpenSCAD syntax (familiar) |
| **Editor** | External file + live reload | Built-in Monaco editor |
| **CSG Engine** | ManifoldCAD | Custom BSP-tree in Rust/WASM |
| **UI** | Minimal (viewport only) | Full panels + controls |
| **Export** | Unknown | STL (binary), OBJ |
| **AI Integration** | None | MCP server planned |
| **Theme** | Default | Blender-style dark theme |

### moicad Advantages

1. **Zero Install**: Works in any modern browser
2. **Familiar Syntax**: OpenSCAD syntax used by millions
3. **Full IDE**: Monaco editor with syntax highlighting
4. **Better UI**: Sidebar with stats, file management, export options
5. **Portable**: Works on any OS with a browser
6. **AI-Ready**: MCP server integration planned for Claude assistance

---

## 🎯 Performance Targets

- Parse time: < 50ms
- Evaluate time: < 100ms
- WebSocket latency: < 50ms
- Rendering: 60 FPS

---

**Last Updated**: January 2026
**Status**: Core infrastructure + frontend complete, CSG operations working, MCP server pending
