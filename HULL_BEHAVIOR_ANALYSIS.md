# Hull Behavior Analysis for moicad

## Current Implementation Overview

Based on code examination:

1. **Rust Implementation** (`wasm/src/hull.rs`):
   - Uses Quickhull algorithm for 3D convex hull computation
   - Handles degenerate cases (collinear, coplanar points)
   - Computes hull of a single mesh by collecting all vertices
   - Computes hull of multiple meshes by combining vertices then computing hull

2. **Backend Integration** (`backend/scad-evaluator.ts`):
   - Special handling for `hull()` operations
   - Evaluates all children and passes them to a dedicated `hull_multiple` function for direct computation, avoiding inefficient intermediate unions.

3. **WASM Binding** (`wasm/src/lib.rs`):
   - `hull(mesh: &WasmMesh) -> WasmMesh`: Computes hull of a single mesh.
   - `hull_two(a: &WasmMesh, b: &WasmMesh) -> WasmMesh`: Computes hull of two meshes.
   - `hull_multiple(mesh_pointers: &[usize]) -> WasmMesh`: Efficiently computes the hull of multiple meshes at once.

## Test Cases Created

We've designed the following test cases to verify hull behavior:

### 1. Simple Hull Case
```
hull() { cube(10); translate([20,0,0]) sphere(5); }
```
Expected: Convex hull connecting a cube and a sphere positioned 20 units apart
Expected Vertices: Approximately 1000+ (combined vertices from both shapes)
Expected Faces: Corresponding triangular faces from the hull computation

### 2. Complex Multi-Child Hull
Multiple children (>10 objects) in a single hull operation:
```
hull() {
  cube(5);
  translate([10,0,0]) sphere(3);
  translate([0,10,0]) cylinder(3, 8, 16);
  translate([10,10,0]) cone(3, 8, 16);
  translate([5,5,10]) sphere(2);
  translate([0,0,10]) cube([2,2,2]);
  translate([10,0,10]) sphere(1);
  translate([0,10,10]) cylinder(1, 4, 16);
  translate([10,10,10]) cone(1, 4, 16);
  translate([5,0,5]) sphere(1);
  translate([0,5,5]) cube([1,1,1]);
  translate([10,5,5]) cylinder(0.5, 2, 16);
}
```
Expected: Complex hull encompassing all objects
Potential Issues: Performance degradation with large numbers of vertices

### 3. Degenerate Hull Cases

#### Points on a Line:
```
hull() {
  translate([0,0,0]) sphere(1);
  translate([5,0,0]) sphere(1);
  translate([10,0,0]) sphere(1);
  translate([15,0,0]) sphere(1);
}
```
Expected: Thin hull along the X-axis connecting the endpoints

#### Coplanar Points:
```
hull() {
  translate([0,0,0]) sphere(1);
  translate([5,0,0]) sphere(1);
  translate([0,5,0]) sphere(1);
  translate([5,5,0]) sphere(1);
}
```
Expected: Flat hull in XY-plane forming a rectangle

#### Nearly Identical Objects:
```
hull() {
  translate([0,0,0]) sphere(5);
  translate([0.1,0.1,0.1]) sphere(5);
  translate([0.2,0.2,0.2]) sphere(5);
}
```
Expected: Slight variation of the original sphere shape

### 4. Large Geometry Hull
High-detail objects with thousands of vertices each:
```
hull() { sphere(10, $fn=100); translate([30,0,0]) sphere(10, $fn=100); }
```
Expected: Performance impact, memory usage concerns
Boundary Condition: Potential timeout or memory exhaustion with extremely large inputs

### 5. Nested Hull
Hull operations containing other hull operations:
```
hull() {
  hull() {
    translate([0,0,0]) sphere(5);
    translate([10,0,0]) sphere(3);
  }
  translate([0,10,0]) cube(5);
}
```
Expected: Should behave identically to flattened version:
```
hull() {
  translate([0,0,0]) sphere(5);
  translate([10,0,0]) sphere(3);
  translate([0,10,0]) cube(5);
}
```

## Expected vs Actual Behavior Analysis Framework

For each test case, we should compare:

1. **Success/Failure**: Does the operation complete successfully?
2. **Execution Time**: How does performance scale with complexity?
3. **Vertex Count**: Are the resulting vertex counts reasonable?
4. **Face Count**: Are the resulting face counts appropriate for a convex hull?
5. **Visual Validation**: Does the hull appear correct when rendered?

## Edge Cases to Monitor

1. **Empty Hull**: `hull() {}` - Should handle gracefully
2. **Single Child**: `hull() { sphere(10); }` - Should behave like identity operation
3. **Zero-Volume Objects**: Objects with zero size could cause numerical instability
4. **Non-Uniform Scaling**: Transformed objects should still form correct hulls
5. **Large Coordinate Values**: Very large translations might introduce precision issues

## Monitoring Metrics

- **Memory Usage**: Track during execution with large models
- **Execution Time**: Performance benchmarks
- **Numerical Stability**: Check for artifacts in geometric computations
- **Degradation Points**: At what complexity do issues arise?

## Recommendations for Enhancement

1. **Add Specific Error Handling**: For degenerate cases
2. **Optimize Performance**: Consider spatial partitioning for large inputs
3. **Validate Numerical Stability**: Implement checks for precision loss
4. **Add Configurable Detail Levels**: Allow users to control hull resolution
5. **Implement Progress Feedback**: For long-running hull operations

## Conclusion

The hull implementation in moicad should be robust for typical use cases, but needs thorough testing with edge cases to identify potential areas for improvement. The Quickhull algorithm is solid for well-distributed points but may exhibit performance concerns with massive inputs or degenerate configurations.
