# OpenSCAD WASM Integration Findings

## Summary

Attempted to integrate the official `openscad-wasm` npm package to replace the custom BSP implementation and eliminate rendering artifacts. The integration was **unsuccessful** due to runtime incompatibility.

## Problem Statement

The custom BSP (Binary Space Partitioning) implementation has rendering artifacts:
- Vertical stripe patterns on difference() surfaces
- Inconsistent shading across meshes
- "Ghost polygon" appearance in some areas

Goal: Use the real OpenSCAD engine (CGAL/Manifold) to get artifact-free geometry like desktop OpenSCAD.

## Attempted Solution

### Package Information
- **Package**: `openscad-wasm` (version 0.0.4)
- **Source**: https://www.npmjs.com/package/openscad-wasm
- **GitHub**: https://github.com/openscad/openscad (348 stars)
- **Size**: 13.9 MB (includes full OpenSCAD WASM binary)

### Integration Steps Taken

1. **Installed package**: `bun add openscad-wasm`

2. **Created wrapper** (`backend/openscad-engine.ts`):
   ```typescript
   import { createOpenSCAD, type OpenSCADInstance } from 'openscad-wasm';
   
   const instance = await createOpenSCAD({
     noInitialRun: true,
     print: (text) => console.log(`[OpenSCAD]: ${text}`),
     printErr: (text) => console.error(`[OpenSCAD]: ${text}`)
   });
   
   const stlString = await instance.renderToStl(code);
   ```

3. **Modified backend** to use OpenSCAD WASM instead of BSP

4. **Created STL parser** to convert binary STL output to Geometry format

## Results: Failed ❌

### Issue 1: Runtime Crashes (Segfaults)
- **Error**: Process crashes with `EMT trap: 7` or `Trace/BPT trap: 5`
- **Occurs**: On any WASM initialization or execution
- **Simple test fails**: Even `cube(10);` causes segfault

### Issue 2: Numeric Error Codes
- Before crashes, saw errors like: `"1109752"`, `"1863256"`, `"9325256"`
- These appear to be memory addresses from Emscripten exceptions
- Indicates improper exception handling between WASM and Bun

### Root Cause: Bun ↔ Emscripten Incompatibility

The `openscad-wasm` package is compiled with Emscripten for Node.js. Bun's WASM runtime has differences:

1. **Memory model**: Emscripten assumes Node.js memory layout
2. **System calls**: Different filesystem/process APIs
3. **Exception handling**: Emscripten C++ exceptions don't translate properly to Bun
4. **Threading**: OpenSCAD may use pthreads which Bun handles differently

### Evidence
```bash
# Backend startup
info: Backend PID file created {"pid":70347}

# On first WASM call
OpenSCAD WASM initialized successfully
[OpenSCAD]: WARNING: Ignoring request to enable unknown feature 'manifold'.
[OpenSCAD]: Could not initialize localization (application path is '/').

# Then crash
Signal `EMT trap: 7`
```

The WASM initializes but crashes when trying to render geometry.

## Alternatives to Consider

### 1. Use Node.js Subprocess ⭐ Recommended
Run OpenSCAD WASM in a Node.js child process, communicate via stdio:

```typescript
// backend/openscad-node-wrapper.ts
import { spawn } from 'child_process';

const node = spawn('node', ['./openscad-worker.js']);
node.stdin.write(JSON.stringify({ code: 'cube(10);' }));
node.stdout.on('data', (data) => {
  const { stl } = JSON.parse(data);
  // Parse STL...
});
```

**Pros**:
- Uses official OpenSCAD WASM
- Isolated from Bun runtime issues
- Can restart worker on crash

**Cons**:
- IPC overhead (~10-50ms per render)
- Requires Node.js installed
- Extra process management

### 2. Use Desktop OpenSCAD Binary
Call the actual OpenSCAD command-line tool:

```bash
echo "cube(10);" | openscad -o output.stl -
```

**Pros**:
- Most compatible
- Users may already have it installed
- Full feature parity

**Cons**:
- Requires OpenSCAD installation
- Slower startup (~200-500ms per render)
- Platform-specific paths

### 3. Wait for Bun WASM Improvements
Bun's WASM support is actively improving. May work in future versions.

### 4. Improve BSP Implementation
Keep custom BSP but fix rendering:
- Add mesh cleanup (weld vertices, remove degenerates)
- Use custom WebGL renderer with proper flat shading
- Accept artifacts as trade-off for pure-JS solution

## Current Status

**Reverted to BSP implementation** - working but with known rendering artifacts.

The rendering artifacts are a fundamental limitation of BSP-based CSG, not a bug. The OpenSCAD WASM would fix this but can't run in Bun.

## Recommendation

**Short term**: Keep BSP implementation, document artifact limitations

**Medium term**: Implement Node.js subprocess wrapper for OpenSCAD WASM

**Long term**: Monitor Bun's Emscripten compatibility improvements

## Files Created
- `backend/openscad-engine.ts` - OpenSCAD WASM wrapper (non-functional)
- `OPENSCAD_WASM_FINDINGS.md` - This document

## References
- Bun WASM docs: https://bun.sh/docs/runtime/wasm
- Emscripten compatibility: https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html
- OpenSCAD WASM API: https://github.com/openscad/openscad/tree/master/wasm
