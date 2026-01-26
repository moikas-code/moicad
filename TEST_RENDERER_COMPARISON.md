# Renderer Comparison Test Plan

## Background

The custom WebGL renderer was created to work around BSP rendering artifacts (vertical stripes, inconsistent shading, ghost polygons). Now that we've migrated to manifold-3d (which guarantees manifold output), we should test if Three.js works without artifacts.

## Test Steps

### 1. Test with Custom WebGL Renderer (Current)

**File**: `frontend/components/Viewport.tsx`
```typescript
const USE_CUSTOM_WEBGL = true; // Current setting
```

**Test cases**:
- [ ] Basic cube: `cube(10);`
- [ ] Boolean difference: `difference() { cube(20, center=true); sphere(12); }`
- [ ] Complex nested: `difference() { union() { cube(15); translate([10,0,0]) sphere(8); } cylinder(5, 30); }`
- [ ] Minkowski: `minkowski() { cube(10); sphere(2); }`
- [ ] Text: `text("TEST", size=20);`

**Expected**: All render correctly without artifacts ✅

### 2. Test with Three.js Renderer

**File**: `frontend/components/Viewport.tsx`
```typescript
const USE_CUSTOM_WEBGL = false; // Switch to Three.js
```

**Test same cases**:
- [ ] Basic cube
- [ ] Boolean difference
- [ ] Complex nested
- [ ] Minkowski
- [ ] Text

**Expected**: Should render identically without BSP artifacts

### 3. Visual Comparison Checklist

For each test case, check for:
- [ ] No vertical stripe patterns
- [ ] Smooth, consistent shading across surfaces
- [ ] No "ghost polygons" or rendering glitches
- [ ] Proper normal calculation (lighting looks correct)
- [ ] Clean edges at boolean operation boundaries
- [ ] Interactive highlighting works (hover/click)

### 4. Performance Comparison

Measure frame rates with both renderers:
- Custom WebGL: _____ FPS
- Three.js: _____ FPS

(Three.js may be slightly slower but should be acceptable)

## Recommendation

### If Three.js works without artifacts:

**Benefits of switching to Three.js**:
1. Less custom code to maintain
2. Better ecosystem support (plugins, helpers, examples)
3. Easier to add features (post-processing, shadows, etc.)
4. More familiar to contributors
5. Better debugging tools

**Action**: Set `USE_CUSTOM_WEBGL = false` as default

### If Three.js still has issues:

**Keep custom WebGL renderer but**:
1. Document which specific issues remain
2. Add a toggle in UI to switch between renderers
3. Allow users to choose based on their needs

## Test Results

Date: _____
Tester: _____

| Test Case | Custom WebGL | Three.js | Notes |
|-----------|--------------|----------|-------|
| Basic cube | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | |
| Boolean diff | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | |
| Complex nested | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | |
| Minkowski | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | |
| Text | ☐ Pass ☐ Fail | ☐ Pass ☐ Fail | |

**Artifacts observed with Three.js**:
- [ ] Vertical stripes
- [ ] Inconsistent shading
- [ ] Ghost polygons
- [ ] Other: _____

**Decision**: ☐ Keep custom WebGL  ☐ Switch to Three.js  ☐ Add toggle option

## Implementation Notes

If switching to Three.js:

1. Update `Viewport.tsx`:
   ```typescript
   const USE_CUSTOM_WEBGL = false; // Default to Three.js
   ```

2. Optional: Add settings toggle:
   ```typescript
   const [useCustomWebGL, setUseCustomWebGL] = useState(false);
   // Add UI control in settings menu
   ```

3. Update documentation:
   - Remove references to "BSP artifact workaround"
   - Document manifold-3d as the solution
   - Update README.md

4. Consider removing custom WebGL code if unused:
   - `frontend/lib/webgl/renderer.ts` (optional keep for fallback)
   - `frontend/components/WebGLViewport.tsx`
