# Roadmap to 100% OpenSCAD Compatibility

**Current Status: 75%** → **Target: 100%**

---

## Priority 1: Critical for Most Users (15%)

### 1.1 Full BSP-Tree CSG (10%)

**Impact**: HIGH - Enables proper `difference()` and `intersection()`

**Implementation**:
- File: `wasm/src/csg_bsp.rs` (new)
- Algorithm: Binary Space Partitioning
- Dependencies: Face splitting, polygon clipping

```rust
pub struct BSPNode {
    plane: Plane,
    front: Option<Box<BSPNode>>,
    back: Option<Box<BSPNode>>,
    polygons: Vec<Polygon>,
}

pub fn difference(a: &Mesh, b: &Mesh) -> Mesh {
    let tree_a = BSPNode::from_mesh(a);
    let tree_b = BSPNode::from_mesh(b);
    tree_a.subtract(&tree_b).to_mesh()
}
```

**Effort**: 2-3 weeks
**Resources**:
- [CSG.js Reference](https://github.com/evanw/csg.js/)
- [BSP Tree Paper](http://www.cs.cmu.edu/~ph/859C/www/notes1.html)

### 1.2 2D Extrusions (5%)

**Impact**: HIGH - linear_extrude, rotate_extrude

**Implementation**:
- File: `wasm/src/extrude.rs` (new)
- Support: twist, scale, slices parameters

```rust
pub fn linear_extrude(
    shape_2d: &Mesh,
    height: f32,
    twist: f32,
    scale: f32,
    slices: u32
) -> Mesh {
    // Extrude 2D profile along Z-axis
    // Apply twist and scale transformations
}

pub fn rotate_extrude(
    shape_2d: &Mesh,
    angle: f32,
    fn_segments: u32
) -> Mesh {
    // Rotate 2D profile around Y-axis
}
```

**Effort**: 1-2 weeks

---

## Priority 2: Advanced Shapes (8%)

### 2.1 Polygon & Polyhedron (5%)

**Implementation**:
- File: `wasm/src/primitives.rs`
- `polygon(points, paths)` - 2D shape from points
- `polyhedron(points, faces)` - 3D shape from vertices

```rust
pub fn polygon(points: Vec<Vec2>, paths: Option<Vec<Vec<usize>>>) -> Mesh {
    // Triangulate 2D polygon
    // Use ear-clipping or Delaunay
}

pub fn polyhedron(
    points: Vec<Vec3>,
    faces: Vec<Vec<usize>>
) -> Mesh {
    // Build mesh from vertices and face indices
    // Calculate normals
}
```

**Effort**: 1 week

### 2.2 Text (3%)

**Implementation**:
- Requires font parsing (TTF/OTF)
- Convert glyphs to polygons
- Extrude to 3D

```rust
pub fn text(
    text: &str,
    size: f32,
    font: &str,
    halign: &str,
    valign: &str
) -> Mesh {
    // Parse font file
    // Convert glyphs to paths
    // Triangulate and extrude
}
```

**Effort**: 2 weeks (complex due to font parsing)

---

## Priority 3: Language Features (7%)

### 3.1 List Comprehensions (3%)

**Impact**: Medium - Cleaner array generation

**Implementation**:
- File: `backend/scad-parser.ts`
- Parse `[for (i=[0:10]) i*2]` syntax
- Evaluate in array context

```typescript
// In parseArray()
if (this.current().value === 'for') {
    return this.parseListComprehension();
}
```

**Effort**: 3-4 days

### 3.2 Special Variables (2%)

**Implementation**:
- `$fa`, `$fs` - Fragment angle/size (affects detail) ✅ **COMPLETED**
- `$t` - Animation time (0-1) ✅ **COMPLETED**
- `$vpr`, `$vpt`, `$vpd` - Viewport position/rotation/distance ✅ **COMPLETED**
- `$vpf`, `$preview`, `$children` - Additional viewport and system variables ✅ **COMPLETED**

```typescript
context.variables.set('$fa', 12); // Default fragment angle
context.variables.set('$fs', 2);  // Default fragment size
context.variables.set('$fn', 0);  // Override both if set
```

**Effort**: 2-3 days

### 3.3 Additional Built-in Functions (2%)

- `echo()` - Print to console
- `str()`, `chr()`, `ord()` - String operations
- `norm()`, `cross()` - Vector operations
- `concat()`, `lookup()` - Array operations

**Effort**: 1 week

---

## Priority 4: Nice-to-Have (5%)

### 4.1 Advanced Operations (3%)

- `minkowski()` - Minkowski sum ✅ **IMPLEMENTED**
- `offset()` - 2D offset ✅ **IMPLEMENTED**
- `resize()` - Resize to specific dimensions ✅ **IMPLEMENTED**

**Effort**: COMPLETE - All 2D operations implemented!

### 4.2 Import/Use Statements (2%)

- `include <file.scad>` - Include and execute
- `use <file.scad>` - Import modules only

**Effort**: 1 week

---

## Implementation Timeline

### Phase 1: Critical (1-2 months)
- ✅ Week 1-3: BSP-tree CSG
- ✅ Week 4-5: Linear extrude
- ✅ Week 6: Rotate extrude
- **Result: 85% compatible**

### Phase 2: Advanced (2-3 weeks)
- ✅ Week 7: Polygon/Polyhedron
- ✅ Week 8-9: Text rendering
- **Result: 90% compatible**

### Phase 3: Language (2-3 weeks)
- ✅ Week 10: List comprehensions
- ✅ Week 11: Special variables
- ✅ Week 12: Built-in functions
- **Result: 95% compatible**

### Phase 4: Polish (1-2 weeks)
- ✅ Week 13-14: Minkowski, import/use
- **Result: 100% compatible**

**Total Time: 3-4 months for 100% OpenSCAD compatibility**

---

## Quick Wins (Can Do Now)

These are easy additions that boost compatibility:

1. **More Built-in Math** (1 day)
   - `asin`, `acos`, `atan`, `atan2`
   - `exp`, `log`, `ln`
   - `sign`, `rands`

2. **Vector Functions** (1 day)
   - `norm()` - Vector length
   - `cross()` - Cross product

3. **Array Functions** (2 days)
   - `concat()` - Concatenate arrays
   - `lookup()` - Lookup table
   - `search()` - Search in arrays

4. **String Functions** (1 day)
   - `str()` - Convert to string
   - `chr()` - Character from code
   - `ord()` - Code from character

5. **Debug Functions** (1 day)
   - `echo()` - Print to console
   - `assert()` - Runtime assertion

**Total Quick Wins: +5% in 1 week**

---

## Testing Strategy

For each feature:
1. ✅ Unit tests in Rust (WASM)
2. ✅ Parser tests in TypeScript
3. ✅ Evaluator tests
4. ✅ End-to-end API tests
5. ✅ Real OpenSCAD file compatibility tests

**Test Suite**:
- Download popular OpenSCAD models from Thingiverse
- Run through moicad
- Compare output with OpenSCAD
- Target: 99%+ identical geometry

---

## Resources Needed

### Development
- 1 developer, 3-4 months full-time
- OR 2 developers, 2 months
- OR community contributions (ongoing)

### Libraries
- BSP/CSG: Port from CSG.js or manifold
- Font rendering: harfbuzz-rs, ttf-parser
- Triangulation: earcut, delaunay

### Testing
- OpenSCAD test suite
- Thingiverse model library
- Geometry comparison tools

---

## Alternative: Faster Path

### Option 1: Port ThreeCSG
Use existing JavaScript CSG library:
- ThreeCSG or CSG.js
- Integrate with current stack
- **Time: 2-3 weeks to 90%**

### Option 2: Use Manifold
Modern C++ geometry kernel:
- Compile to WASM
- Best-in-class CSG performance
- **Time: 4-6 weeks to 95%**

### Option 3: Hybrid
- Quick wins first (+5% in 1 week)
- Port ThreeCSG for CSG (+10% in 3 weeks)
- Add extrusions (+5% in 2 weeks)
- **Result: 95% in 6 weeks**

---

## Recommendation

**Fastest Path to Production 100%**:

1. **Week 1**: Quick wins (built-in functions) → 80%
2. **Weeks 2-4**: Port ThreeCSG or integrate Manifold → 90%
3. **Weeks 5-6**: Extrusions (linear/rotate) → 95%
4. **Weeks 7-8**: Polygon/polyhedron → 98%
5. **Weeks 9-10**: Polish and edge cases → 100%

**Total: 10 weeks to 100% OpenSCAD compatibility**

---

## Current Status Summary

| Feature | Status | % |
|---------|--------|---|
| Variables, Functions, Modules | ✅ | 15% |
| Expressions & Operators | ✅ | 10% |
| Primitives | ✅ | 10% |
| Transformations | ✅ | 10% |
| Boolean (union, hull) | ✅ | 5% |
| Control Flow | ✅ | 5% |
| Built-in Functions | ✅ | 10% |
| Comments | ✅ | 2% |
| **Subtotal** | **✅** | **67%** |
| **Testing & Stability** | **✅** | **+8%** |
| **CURRENT TOTAL** | | **75%** |
| | | |
| CSG (diff/int) | ⏳ | 10% |
| Extrusions | ⏳ | 5% |
| Advanced Shapes | ⏳ | 5% |
| List Comprehensions | ⏳ | 3% |
| Special Variables | ⏳ | 2% |
| **TO REACH 100%** | | **+25%** |
