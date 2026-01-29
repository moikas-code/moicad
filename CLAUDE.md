# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: moicad - Modern JavaScript CAD Platform

moicad is a high-performance CAD engine built as a modern Bun monorepo:
- **Core**: @moicad/sdk - Publishable npm package with CAD engine
- **Runtime**: Bun + TypeScript/JavaScript
- **CSG Engine**: manifold-3d (WebAssembly npm package)
- **Web App**: Next.js 16 + React + Three.js (packages/landing)
- **Desktop**: Tauri app (packages/desktop)
- **Backend**: Optional Bun server for MCP/collaboration (currently needs SDK migration)

---

## ⚠️ Important: Recent Architecture Changes (Jan 2026)

**This monorepo was recently restructured. See [MIGRATION.md](./MIGRATION.md) for details.**

### Current State
- ✅ **packages/sdk** - Core CAD engine (canonical implementation)
- ✅ **packages/landing** - Web app with full UI (replaces /frontend)
- ✅ **packages/desktop** - Tauri desktop app
- ⚠️ **backend/** - Needs updating to import from SDK (currently broken)
- ⚠️ **frontend/** - Deprecated (code moved to packages/landing)

### What Changed
1. All frontend UI components moved from `/frontend` → `/packages/landing/components/demo/`
2. All CAD engine code consolidated in `/packages/sdk/` (removed from `/backend/scad`, `/backend/manifold`, `/backend/javascript`)
3. Backend directories `/scad`, `/manifold`, `/javascript` **deleted** (duplicated SDK code)
4. SDK is now the single source of truth for all CAD operations

---

## Development Philosophy

**AED Method**: Automate, Eliminate, Delegate
- Before optimizing: Ask "Why does this exist?"
- Don't optimize something that shouldn't exist

---

## Architecture Overview

### Core Pipeline: Code → AST → Geometry

```
OpenSCAD/JavaScript Code
    ↓
Parser (packages/sdk/src/scad/parser.ts) → AST
    ↓
Evaluator (packages/sdk/src/scad/evaluator.ts)
    ↓
manifold-3d CSG Engine (npm package)
    ↓
Geometry (vertices, indices, normals)
    ↓
Three.js Viewport / STL Export
```

### Monorepo Structure

```
moicad/
├── packages/
│   ├── sdk/              @moicad/sdk - Core CAD engine (v0.1.8)
│   │   ├── src/
│   │   │   ├── shape.ts           Fluent API: Shape.cube(10)
│   │   │   ├── functional.ts      Functional API: cube(10)
│   │   │   ├── scad/              OpenSCAD parser & evaluator
│   │   │   ├── manifold/          manifold-3d integration
│   │   │   ├── viewport/          Three.js viewport component
│   │   │   └── plugins/           Plugin system
│   │   └── dist/                  Built npm package
│   │
│   ├── landing/          @moicad/landing - Next.js web app
│   │   ├── app/
│   │   │   ├── page.tsx           Landing page
│   │   │   ├── demo/              Interactive demo
│   │   │   ├── docs/              Auto-generated API docs
│   │   │   └── api/               API routes (evaluate, parse, export)
│   │   ├── components/demo/       UI components (Editor, Viewport, etc.)
│   │   ├── hooks/                 React hooks
│   │   └── lib/                   Utilities
│   │
│   ├── desktop/          Tauri desktop app
│   └── shared/           Minimal shared types
│
├── backend/              ⚠️ NEEDS MIGRATION TO USE SDK
│   ├── core/             Bun server infrastructure
│   ├── mcp/              Collaboration & MCP server
│   ├── middleware/       HTTP middleware
│   └── utils/            File utilities
│
├── frontend/             ⚠️ DEPRECATED - use packages/landing
└── shared/               ⚠️ Should merge to packages/shared
```

---

## Common Commands

### Development

```bash
# Install all dependencies
bun install

# Build SDK (required first)
cd packages/sdk && bun run build

# Start web app (http://localhost:3002)
cd packages/landing && bun run dev

# Start desktop app
cd packages/desktop && bun run tauri:dev

# ⚠️ Backend currently broken - needs SDK migration
# cd backend && bun run core/index.ts
```

### SDK Development

```bash
cd packages/sdk

# Build
bun run build

# Generate documentation
bun run docs

# Publish to npm
npm publish
```

### Testing

```bash
# Test SDK
cd packages/sdk
bun test

# Test landing
cd packages/landing  
bun run test

# Full test suite (from root)
bun run test:all
```

---

## Critical Architecture Details

### SDK Package Structure

The SDK is the **canonical implementation** of all CAD functionality:

**Core** (`packages/sdk/src/`)
- `shape.ts` - Fluent API: `Shape.cube(10).translate([5,0,0])`
- `functional.ts` - Functional API: `translate(cube(10), [5,0,0])`
- `types/` - TypeScript interfaces (Geometry, Shape, etc.)
- `schemas/` - Zod validation schemas

**SCAD** (`packages/sdk/src/scad/`)
- `parser.ts` - OpenSCAD tokenizer & parser → AST
- `evaluator.ts` - AST execution using manifold-3d
- Built-in functions: math, array, string operations
- Returns: `ParseResult { ast, errors, success }`

**Manifold** (`packages/sdk/src/manifold/`) - CSG Engine
- `engine.ts` - manifold-3d WASM initialization
- `primitives.ts` - cube, sphere, cylinder, cone, polygon, polyhedron
- `csg.ts` - union, difference, intersection, hull, minkowski
- `transforms.ts` - translate, rotate, scale, mirror, multmatrix
- `extrude.ts` - linear_extrude, rotate_extrude
- `text.ts` - ASCII text rendering
- `surface.ts` - Heightmap surfaces

**Viewport** (`packages/sdk/src/viewport/`)
- `Viewport.ts` - Three.js viewport class
- `controls.ts` - Camera orbit controls
- Integrated with packages/landing and packages/desktop

**Plugins** (`packages/sdk/src/plugins/`)
- Extensibility system for custom operations

### Landing Package Structure

**Pages** (`packages/landing/app/`)
```
/                 Landing page with hero + features
/demo            Interactive CAD editor + viewport
/docs            Auto-generated SDK documentation
/api/evaluate    Evaluate OpenSCAD/JS code → geometry
/api/parse       Parse OpenSCAD → AST
/api/export      Export geometry → STL/OBJ
```

**Components** (`packages/landing/components/demo/`)
- `Editor.tsx` - Monaco editor with OpenSCAD syntax
- `Viewport.tsx` - Three.js 3D viewport
- `TopMenu.tsx` - File/Edit/View menu system
- `FileManager.tsx` - File browser with localStorage
- `PrinterSettings.tsx` - 3D printer presets
- `Sidebar.tsx` - Export controls & geometry stats
- `ErrorDisplay.tsx` - Error messages
- `RenderProgressBar.tsx` - Render progress

**Hooks** (`packages/landing/hooks/`)
- `useEditor.ts` - Editor state & persistence
- `useGeometry.ts` - 3D geometry state
- `useWebSocket.ts` - WebSocket connection
- `useViewportMenus.tsx` - Viewport menu system

### Backend Structure (⚠️ Needs Migration)

**Current Problem**: Backend imports from deleted directories:
```typescript
// ❌ These imports are BROKEN
import { parseOpenSCAD } from "../scad/parser";  // DELETED
import { evaluateAST } from "../scad/evaluator";  // DELETED
```

**Solution**: Update to use SDK:
```typescript
// ✅ Should import from SDK
import { parseOpenSCAD, evaluateAST } from "@moicad/sdk/scad";
```

**What Backend Should Keep**:
- `core/` - Bun server, PID locking, job queue
- `mcp/` - MCP server & collaboration features
- `middleware/` - Rate limiting, security, health checks
- `utils/` - File I/O with sandboxing

**What Backend Should NOT Have** (moved to SDK):
- ~~`scad/`~~ → Now in `packages/sdk/src/scad/`
- ~~`manifold/`~~ → Now in `packages/sdk/src/manifold/`
- ~~`javascript/`~~ → Now in `packages/sdk/src/functional.ts`

### Shared Types (`shared/` and `packages/shared/`)

**Current Issue**: Types exist in two places
- Root `/shared/` - Legacy types
- `/packages/shared/` - New minimal types

**Recommendation**: Consolidate all types into `packages/shared/`

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
- File imports: include, use
- Special variables: $fn, $fa, $fs, $t, $vpr, $vpt, $vpd, $vpf, $preview
- OpenSCAD modifiers: # (debug), % (transparent), ! (root), * (disable)
- Debug utilities: echo(), assert()

---

## API Specification

### SDK API (TypeScript)

```typescript
import { Shape } from '@moicad/sdk';

// Fluent API
const result = Shape.cube(10)
  .translate([5, 0, 0])
  .union(Shape.sphere(5))
  .toGeometry();

// Functional API
import { cube, sphere, union, translate } from '@moicad/sdk/functional';
const result = union(
  translate(cube(10), [5, 0, 0]),
  sphere(5)
);

// OpenSCAD evaluation
import { parseOpenSCAD, evaluateAST } from '@moicad/sdk/scad';
const parseResult = parseOpenSCAD('cube(10);');
const evalResult = await evaluateAST(parseResult.ast);
```

### Landing API Routes (Next.js)

**POST /api/evaluate**
```json
Request: { "code": "cube(10);", "language": "openscad" }
Response: {
  "geometry": {
    "vertices": [...],
    "indices": [...],
    "normals": [...],
    "bounds": { "min": [x,y,z], "max": [x,y,z] },
    "stats": { "vertexCount": N, "faceCount": N, "volume": V }
  },
  "errors": [],
  "success": true,
  "executionTime": 45.2
}
```

**POST /api/parse**
```json
Request: { "code": "sphere(5);" }
Response: { "ast": [...], "errors": [], "success": true }
```

**POST /api/export**
```json
Request: { "geometry": {...}, "format": "stl" }
Response: Binary STL file (application/octet-stream)
```

### Backend API (⚠️ Currently Broken)

Same endpoints as landing, but on port 42069:
- `http://localhost:42069/api/evaluate`
- `http://localhost:42069/api/parse`
- `http://localhost:42069/api/export`
- `ws://localhost:42069/ws` - Real-time collaboration
- `ws://localhost:42069/ws/mcp` - MCP for Claude Desktop

---

## Key Implementation Details

### TypedArray Serialization

**CRITICAL**: manifold-3d returns Float32Array/Uint32Array, but JSON.stringify() serializes these as objects. MUST convert to regular arrays:

```typescript
// ❌ WRONG
return { vertices, indices, normals };  // TypedArray serializes as {0: val, 1: val}

// ✅ CORRECT
return {
  vertices: Array.from(vertices),
  indices: Array.from(indices),
  normals: Array.from(normals)
};
```

See `packages/sdk/src/manifold/geometry.ts` for implementation.

### Manifold WASM Initialization

```typescript
// packages/sdk/src/manifold/engine.ts
import Module from 'manifold-3d';

let manifoldWasm: any = null;
let Manifold: any = null;

export async function initManifold() {
  if (!manifoldWasm) {
    manifoldWasm = await Module();
    manifoldWasm.setup();
    Manifold = manifoldWasm.Manifold;
  }
  return { manifoldWasm, Manifold };
}
```

Call once at startup, reuse throughout.

---

## Development Workflows

### Adding New Primitives

1. Add to `packages/sdk/src/manifold/primitives.ts`:
```typescript
export async function createMyShape(params) {
  const { Manifold } = await initManifold();
  return Manifold.myOperation(...);
}
```

2. Add case in `packages/sdk/src/scad/evaluator.ts`:
```typescript
case 'myshape':
  return await createMyShape(evaluateParams(node.params, scope));
```

3. Export from SDK: `packages/sdk/src/index.ts`

4. Add tests: `packages/sdk/tests/myshape.test.ts`

### Working with Landing

```bash
cd packages/landing

# Development mode
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Generate docs from SDK
bun run docs:generate
```

### Publishing SDK

```bash
cd packages/sdk

# Version bump
npm version patch|minor|major

# Build
bun run build

# Publish to npm
npm publish
```

---

## MCP Integration

### What is MCP?

Model Context Protocol (MCP) - allows AI assistants (Claude) to use moicad's SDK.

**Purpose**: Expose moicad SDK API to AI tools (like LSP exposes code APIs to IDEs)

**Current State**: Backend has MCP server, but it's actually a **collaboration server** (sessions, OT, cursors). This is confusing.

**Correct Design** (from migration plan):
- `packages/mcp-server/` - Simple MCP bridge exposing SDK API to AI
- `packages/collaboration/` - Real-time multi-user editing features

### Intended MCP Tools

```typescript
// What MCP SHOULD expose
mcp.evaluate(code: string) → Geometry
mcp.getAPISchema() → SDK API structure
mcp.getTypes(name: string) → TypeScript types
mcp.getExamples(category: string) → Usage examples
mcp.searchAPI(query: string) → Search results
```

**Claude Desktop Config** (when fixed):
```json
{
  "mcpServers": {
    "moicad": {
      "command": "bun",
      "args": ["run", "packages/mcp-server/index.ts"]
    }
  }
}
```

---

## Common Patterns

### SDK Usage Pattern

```typescript
import { Shape } from '@moicad/sdk';

// Create shapes
const base = Shape.cube([20, 20, 5]);
const hole = Shape.cylinder({ h: 10, r: 3 });

// Boolean operations
const result = base.subtract(hole);

// Get geometry for rendering
const geometry = result.toGeometry();

// Export to STL
import { exportSTL } from '@moicad/sdk';
const stl = exportSTL(geometry);
```

### Landing Component Pattern

```typescript
'use client';

import { useState } from 'react';
import Editor from '@/components/demo/Editor';
import Viewport from '@/components/demo/Viewport';
import { evaluateCode } from '@/lib/api-client';

export default function DemoPage() {
  const [code, setCode] = useState('cube(10);');
  const [geometry, setGeometry] = useState(null);

  const handleRender = async () => {
    const result = await evaluateCode(code, 'openscad');
    setGeometry(result.geometry);
  };

  return (
    <div className="flex">
      <Editor value={code} onChange={setCode} onRender={handleRender} />
      <Viewport geometry={geometry} />
    </div>
  );
}
```

---

## Documentation Files

- **MIGRATION.md**: Recent restructuring changes
- **README.md**: Project overview, quick start
- **ARCHITECTURE.md**: Complete system architecture
- **BUILD_GUIDE.md**: Detailed build instructions
- **packages/sdk/README.md**: SDK usage documentation
- **Plan**: `.claude/plans/radiant-wandering-locket.md`

---

## Important Notes

- **SDK is canonical**: All CAD operations must go through `@moicad/sdk`
- **Landing replaces frontend**: Use `packages/landing` for web development
- **Backend needs migration**: Currently broken, needs SDK imports
- **No Rust WASM**: Entire `wasm/` directory removed (if existed)
- **Bun exclusive**: Use `bun` commands, not `npm` or `node`
- **TypedArray conversion**: Always convert to regular arrays before JSON
- **MCP confusion**: Backend's "MCP" is actually collaboration; real MCP should expose SDK API

---

## Getting Help

- Check **MIGRATION.md** for recent changes
- Read **packages/sdk/README.md** for SDK usage
- See **examples/** directory for code samples
- Documentation at: `/docs` route in landing app

---

*Last Updated: January 28, 2026 - After monorepo restructuring*
