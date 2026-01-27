# Backend Structure - moicad

Clean backend architecture with 29 active TypeScript files.

## File Organization

### Core Server (4 files)
```
index.ts                    # Main Bun server (REST + WebSocket + MCP)
config.ts                   # Environment configuration
logger.ts                   # Winston logging
health-monitoring.ts        # Health checks and monitoring
```

### OpenSCAD Parser & Evaluator (2 files)
```
scad-parser.ts              # Tokenizer + Parser → AST
scad-evaluator.ts           # AST evaluator with manifold-3d
```

### Manifold-3d Integration (10 files)
```
manifold-engine.ts          # WASM module initialization
manifold-types.ts           # TypeScript type definitions
manifold-evaluator.ts       # High-level evaluator helpers
manifold-primitives.ts      # cube, sphere, cylinder, cone, etc.
manifold-csg.ts             # union, difference, intersection, hull, minkowski
manifold-transforms.ts      # translate, rotate, scale, mirror, multmatrix
manifold-geometry.ts        # Geometry conversion (manifold ↔ moicad format)
manifold-2d.ts              # 2D operations (offset, projection)
manifold-extrude.ts         # linear_extrude, rotate_extrude
manifold-text.ts            # Text rendering with bitmap font
manifold-surface.ts         # Heightmap surface generation
```

### MCP Server (Real-time Collaboration) (8 files)
```
mcp-server.ts               # WebSocket collaboration server
mcp-api.ts                  # REST API for MCP features
mcp-store.ts                # In-memory data store (users, sessions, projects)
mcp-middleware.ts           # Authentication and WebSocket management
mcp-ai-adapter.ts           # AI provider integration
mcp-stub-ai.ts              # Stub AI provider for testing
mcp-suggestion-engine.ts    # Code suggestions
mcp-operational-transform.ts # OT for concurrent editing
mcp-session-recorder.ts     # Session recording/playback
```

### Security & Utilities (3 files)
```
security-middleware.ts      # Input validation, sanitization, CORS
rate-limiter.ts             # API rate limiting
file-utils.ts               # File I/O for OpenSCAD includes
```

## Removed Files (10 files - 3078 lines)

### Obsolete Integrations
- ❌ `csg-three-bvh.ts` - Old three-bvh-csg integration (replaced by manifold-3d)
- ❌ `openscad-engine.ts` - Old OpenSCAD WASM wrapper (replaced by manifold-3d)

### Unused Alternate Implementations
- ❌ `simple-backend.ts` - Unused alternate server
- ❌ `eval-worker.ts` - Old worker implementation
- ❌ `worker.ts` - Old worker implementation

### Debug/Test Files
- ❌ `inspect-manifold-api.ts` - Debug inspection tool
- ❌ `test-manifold.ts` - Test file (tests moved to tests/ directory)
- ❌ `test-manifold-evaluator.ts` - Test file

### Compiled JavaScript
- ❌ `enhanced-logger.js` - Compiled JS (not used)
- ❌ `scad-parser.js` - Compiled JS (not used)

### Debug Logs (8 files)
- ❌ `backend.log`, `backend_*.log` - Debug log files

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   index.ts (Main Server)                │
│  • REST API: /api/parse, /api/evaluate, /api/export    │
│  • WebSocket: /ws (real-time)                          │
│  • MCP: /ws/mcp (collaboration)                        │
│  • Health: /health                                     │
└───────────┬──────────────────┬────────────────┬────────┘
            │                  │                │
    ┌───────▼────────┐  ┌──────▼──────┐  ┌────▼────────┐
    │  scad-parser   │  │ mcp-server  │  │ middleware  │
    │   (Tokenizer   │  │(Collaboration)│ │(Security &  │
    │    + Parser)   │  └─────────────┘  │Rate Limiting)│
    └───────┬────────┘                   └─────────────┘
            │
    ┌───────▼────────┐
    │ scad-evaluator │
    │  (AST → CSG)   │
    └───────┬────────┘
            │
    ┌───────▼─────────────────────────────────┐
    │        manifold-3d Integration          │
    │  • manifold-engine (WASM init)         │
    │  • manifold-primitives (shapes)         │
    │  • manifold-csg (Boolean ops)           │
    │  • manifold-transforms (moves)          │
    │  • manifold-geometry (conversion)       │
    │  • manifold-2d (2D ops)                 │
    │  • manifold-extrude (extrusions)        │
    │  • manifold-text (text rendering)       │
    │  • manifold-surface (heightmaps)        │
    └─────────────────────────────────────────┘
```

## Dependency Graph

### Core Flow
```
index.ts
 ├─→ scad-parser.ts
 ├─→ scad-evaluator.ts
 │    ├─→ manifold-engine.ts
 │    ├─→ manifold-primitives.ts
 │    ├─→ manifold-csg.ts
 │    ├─→ manifold-transforms.ts
 │    ├─→ manifold-geometry.ts
 │    ├─→ manifold-2d.ts
 │    ├─→ manifold-extrude.ts
 │    ├─→ manifold-text.ts
 │    └─→ manifold-surface.ts
 ├─→ mcp-server.ts
 │    ├─→ mcp-api.ts
 │    ├─→ mcp-store.ts
 │    ├─→ mcp-middleware.ts
 │    ├─→ mcp-ai-adapter.ts
 │    ├─→ mcp-operational-transform.ts
 │    └─→ mcp-session-recorder.ts
 ├─→ security-middleware.ts
 ├─→ rate-limiter.ts
 ├─→ logger.ts
 └─→ config.ts
```

## File Size Overview

**Total**: ~7500 lines (after cleanup)

### By Category
- **Manifold Integration**: ~2000 lines (27%)
- **MCP Server**: ~2500 lines (33%)
- **Parser & Evaluator**: ~2000 lines (27%)
- **Server & Utilities**: ~1000 lines (13%)

### Largest Files
1. `scad-evaluator.ts` - ~1800 lines (AST evaluation logic)
2. `mcp-server.ts` - ~1200 lines (WebSocket collaboration)
3. `scad-parser.ts` - ~800 lines (Tokenizer + Parser)
4. `mcp-operational-transform.ts` - ~600 lines (OT algorithm)
5. `manifold-text.ts` - ~400 lines (Bitmap font rendering)

## Key Design Patterns

### 1. Separation of Concerns
- **Parser**: Only creates AST (no geometry)
- **Evaluator**: Only executes AST (delegates to manifold)
- **Manifold modules**: Single responsibility (primitives, CSG, transforms)

### 2. Type Safety
- `manifold-types.ts` provides TypeScript definitions
- All manifold functions return typed objects
- No `any` types in core logic

### 3. Error Handling
- Parser returns `ParseResult` with errors array
- Evaluator returns `EvaluateResult` with errors array
- Manifold operations catch and wrap exceptions

### 4. Performance
- Single-threaded job queue (OpenSCAD-like behavior)
- Geometry caching for common primitives
- Garbage collection exposed for memory management

## Testing

Tests are in `tests/` directory, not in `backend/`:
- `tests/unit/` - Unit tests for parser, evaluator, manifold ops
- `tests/integration/` - API endpoint tests
- `tests/performance/` - Benchmarks

## Next Steps

### Immediate
- ✅ Backend is clean and organized
- ✅ All obsolete files removed
- ✅ Ready for Tauri integration
- ✅ MCP server ready for Claude Desktop

### Future Enhancements
- [ ] Move MCP collaboration to separate package
- [ ] Add OpenAPI/Swagger documentation
- [ ] Implement Redis caching
- [ ] Add authentication middleware
- [ ] WebAssembly workers for parallel evaluation

---

**Clean Backend Architecture ✨**
29 files, ~7500 lines, fully typed TypeScript
