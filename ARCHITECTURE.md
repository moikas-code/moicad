# Architecture - moicad

Complete architecture overview of moicad CAD engine.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         moicad System                           │
│                    (Bun Monorepo Architecture)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────▼──────┐ ┌───▼────┐ ┌─────▼─────┐
         │   Backend   │ │Frontend│ │   Tauri   │
         │  (Bun API)  │ │(Next.js)│ │ (Desktop) │
         └──────┬──────┘ └───┬────┘ └─────┬─────┘
                │            │             │
                └────────────┼─────────────┘
                             │
                      ┌──────▼──────┐
                      │ manifold-3d │
                      │ (CSG Engine)│
                      └─────────────┘
```

## Component Architecture

### 1. Backend Layer (Bun Runtime)

```
backend/
├── index.ts                 # Main server (REST + WebSocket + MCP)
├── scad-parser.ts          # OpenSCAD tokenizer + parser
├── scad-evaluator.ts       # AST evaluator
├── manifold-engine.ts      # Manifold WASM initialization
├── manifold-primitives.ts  # Cube, sphere, cylinder, etc.
├── manifold-csg.ts         # Union, difference, intersection, hull
├── manifold-transforms.ts  # Translate, rotate, scale, mirror
├── manifold-geometry.ts    # Geometry conversion utilities
├── manifold-2d.ts          # 2D operations (offset, projection)
├── manifold-extrude.ts     # Linear/rotate extrude
├── manifold-text.ts        # Text rendering
├── manifold-surface.ts     # Heightmap surfaces
├── mcp-server.ts           # Real-time collaboration server
└── file-utils.ts           # File I/O utilities
```

**Key Features**:
- Single-threaded job queue for OpenSCAD evaluations
- WebSocket support for real-time updates
- MCP protocol for AI integration (Claude Desktop)
- STL/OBJ export functionality
- Memory management with garbage collection

**Tech Stack**:
- Runtime: Bun v1.0+
- Language: TypeScript
- CSG: manifold-3d (WebAssembly)
- Server: Bun.serve() (native)
- Protocol: HTTP/WebSocket/MCP

### 2. Frontend Layer (Next.js + React)

```
frontend/
├── app/
│   ├── page.tsx            # Main page component
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   ├── Editor.tsx          # Monaco editor
│   ├── Viewport.tsx        # Three.js viewport
│   ├── TopMenu.tsx         # Menu bar
│   ├── FileManager.tsx     # File operations
│   ├── ErrorDisplay.tsx    # Error handling
│   └── StatsOverlay.tsx    # Geometry stats
├── lib/
│   ├── three-utils.ts      # SceneManager (Three.js)
│   ├── api-client.ts       # REST API client
│   └── websocket.ts        # WebSocket client
└── hooks/
    ├── useEditor.ts        # Editor state
    ├── useGeometry.ts      # Geometry state
    └── useWebSocket.ts     # WebSocket connection
```

**Key Features**:
- Monaco editor with OpenSCAD syntax highlighting
- Three.js 3D viewport with interactive highlighting
- Real-time code evaluation via WebSocket
- File import/export (SCAD, STL, OBJ)
- Professional Blender-style UI

**Tech Stack**:
- Framework: Next.js 16
- UI: React 19
- Editor: Monaco Editor
- 3D: Three.js
- Styling: Tailwind CSS

### 3. Shared Layer

```
shared/
├── types.ts                # TypeScript interfaces
├── constants.ts            # Configuration constants
└── mcp-types.ts           # MCP protocol types
```

**Key Types**:
- `ScadNode`: AST node types
- `Geometry`: Vertex/index/normal data
- `ParseResult`: Parser output
- `EvaluateResult`: Evaluator output
- `MCPMessage`: WebSocket messages

### 4. Desktop Layer (Tauri - Optional)

```
src-tauri/
├── src/
│   ├── main.rs            # Tauri entry point
│   └── commands.rs        # Rust commands
├── tauri.conf.json        # Tauri configuration
└── Cargo.toml             # Rust dependencies
```

**Key Features**:
- Native desktop executable
- System file access
- Better performance than browser
- Cross-platform (macOS, Windows, Linux)

**Tech Stack**:
- Framework: Tauri v2
- Language: Rust
- Frontend: Same Next.js app
- Build: cargo + bun

## Data Flow

### 1. Code Evaluation Pipeline

```
User Types Code
       ↓
[Monaco Editor]
       ↓
[API Client: POST /api/evaluate]
       ↓
[Backend: evaluationQueue.enqueue()]
       ↓
[Parser: parseOpenSCAD()]
       ↓
[AST: ScadNode[]]
       ↓
[Evaluator: evaluateAST()]
       ↓
[Manifold-3d: CSG Operations]
       ↓
[Geometry: {vertices, indices, normals}]
       ↓
[API Response: EvaluateResult]
       ↓
[Frontend: Three.js Rendering]
       ↓
[User Sees 3D Model]
```

### 2. WebSocket Real-Time Updates

```
User Types Code
       ↓
[WebSocket: send({type: "evaluate", code})]
       ↓
[Backend: WebSocket Handler]
       ↓
[Parse + Evaluate]
       ↓
[WebSocket: send({type: "evaluate_response", geometry})]
       ↓
[Frontend: Update Viewport]
```

### 3. MCP AI Integration

```
Claude Desktop
       ↓
[MCP Request: evaluate_scad tool]
       ↓
[MCP Bridge: Proxy to moicad API]
       ↓
[Backend: POST /api/evaluate]
       ↓
[Parse + Evaluate + Manifold CSG]
       ↓
[Geometry Response]
       ↓
[MCP Bridge: Format for Claude]
       ↓
[Claude: Show geometry stats to user]
```

## Key Design Decisions

### Why Bun?
- ✅ Fast TypeScript/JavaScript runtime (3x faster than Node.js)
- ✅ Built-in package manager
- ✅ Native WebSocket support
- ✅ Hot module reloading
- ✅ Built-in test runner
- ✅ No need for ts-node or nodemon

### Why manifold-3d?
- ✅ **Guaranteed manifold output** (no topology errors!)
- ✅ Robust Boolean operations (half-edge mesh structure)
- ✅ High performance with parallel processing (TBB)
- ✅ No custom BSP tree needed (~1000 lines removed)
- ✅ No hull fallbacks needed (~1200 lines removed)
- ✅ WebAssembly ready (npm install manifold-3d)

**Replaced**:
- ❌ Custom Rust WASM (~3000 lines) → ✅ manifold-3d npm package
- ❌ Custom BSP tree (~1000 lines) → ✅ Manifold Boolean ops
- ❌ Custom hull algorithm (~1200 lines) → ✅ Manifold hull()

### Why Three.js (not custom WebGL)?
- ✅ Manifold-3d provides clean geometry (no BSP artifacts)
- ✅ Standard Three.js works perfectly
- ✅ Better ecosystem and community support
- ✅ Easier to maintain and extend
- ✅ No custom shader code needed

**Removed**:
- ❌ Custom WebGL renderer (~500 lines) → ✅ Three.js standard renderer

### Why Monorepo?
- ✅ Shared TypeScript types (frontend + backend)
- ✅ Single dependency management (root package.json)
- ✅ Consistent tooling (Bun for all JS)
- ✅ Easy to develop and test together
- ✅ Simplified deployment

**Structure**:
```
moicad/ (root)
├── backend/       # Bun server
├── frontend/      # Next.js app
├── shared/        # Shared types
├── tests/         # All tests
├── src-tauri/     # Tauri (optional)
└── package.json   # Root dependencies
```

## Performance Characteristics

### Backend
- **Parse time**: ~10-30ms (typical)
- **Evaluate time**: ~20-100ms (typical)
- **Memory usage**: ~50-200MB (typical)
- **Concurrent jobs**: Single-threaded queue
- **Job timeout**: 30 seconds (OpenSCAD-like)

### Frontend
- **Initial load**: ~500ms
- **Code to render**: ~100-200ms total
- **WebSocket latency**: <50ms
- **Three.js FPS**: 60 FPS (smooth)

### Manifold-3d
- **WASM initialization**: ~10-20ms (one-time)
- **Union operation**: O(n log n)
- **Hull computation**: O(n log n) quickhull
- **Memory**: Minimal (operates on vertices directly)

## Scalability

### Current Limits
- **Single-threaded**: One evaluation at a time (OpenSCAD-like)
- **Memory**: 1GB limit per job
- **File size**: 1MB max for includes
- **Geometry**: ~10M vertices (practical limit)

### Future Scaling
- **Multi-threaded**: Bun workers for parallel evaluations
- **Distributed**: Redis queue for load balancing
- **Caching**: Geometry cache for common primitives
- **Streaming**: Stream large geometries to frontend

## Security

### Backend
- ✅ Input validation (code size limits)
- ✅ Path traversal protection (file includes)
- ✅ Memory limits (1GB per job)
- ✅ Timeout protection (30s per job)
- ✅ CORS enabled for frontend
- ⚠️ No authentication (local use only)

### Frontend
- ✅ XSS protection (React sanitization)
- ✅ CSP headers (Content Security Policy)
- ✅ Monaco editor sandboxed

### MCP
- ⚠️ Local access only (don't expose to internet)
- ✅ Requires moicad backend running locally
- ✅ No remote code execution

## Testing Strategy

### Unit Tests (`tests/unit/`)
- Primitives: cube, sphere, cylinder, etc.
- Transformations: translate, rotate, scale
- CSG operations: union, difference, intersection
- Language features: variables, functions, modules

### Integration Tests (`tests/integration/`)
- API endpoints: /api/parse, /api/evaluate, /api/export
- WebSocket: Real-time updates
- File imports: include/use statements

### Performance Tests (`tests/performance/`)
- Benchmark CSG operations
- Memory usage profiling
- Rendering speed tests

### Validation Tests (`tests/validation/`)
- OpenSCAD compatibility (98-99%)
- Compare output with reference implementations

## Deployment

### Development
```bash
bun run dev:all  # Backend + Frontend
```

### Production (Web)
```bash
bun run build           # Build frontend
bun run start           # Start backend
# Deploy frontend to Vercel/Netlify
```

### Production (Desktop)
```bash
bun run tauri:build     # Build Tauri executable
# Distribute .dmg (macOS), .exe (Windows), .deb (Linux)
```

### MCP Server
```bash
# Add to Claude Desktop config
# Backend runs on localhost:42069
```

## Monitoring

### Logs
- Backend: `backend.log` (Winston logger)
- Frontend: Browser console
- Tauri: System logs

### Metrics
- Job queue size
- Memory usage (RSS, heap)
- Request rate (API calls/sec)
- WebSocket connections
- Evaluation time (P50, P95, P99)

## Future Architecture

### Short Term (3-6 months)
- [ ] Web Workers for parallel evaluations
- [ ] Redis cache for geometry
- [ ] S3 export for large models
- [ ] Authentication (JWT)

### Long Term (6-12 months)
- [ ] Kubernetes deployment
- [ ] Multi-tenant support
- [ ] GraphQL API
- [ ] WebGPU rendering
- [ ] Collaborative editing (CRDT)

---

**Clean, Modern, Performant Architecture ✨**
