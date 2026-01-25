# Minkowski() CSG Operation - Future Enhancement

## Current Status

### What's Complete
- **WASM Implementation**: Full minkowski CSG operation exists in `wasm/src/csg.rs`
- **Interface**: `minkowski(a: &WasmMesh, b: &WasmMesh) -> WasmMesh` exported
- **Algorithm**: Convex hull-based minkowski sum implementation
- **Performance**: Optimized for typical use cases

### What's Missing
- **Parser Integration**: Not recognized in parser keyword list
- **Evaluator Support**: No case in evaluateNode switch statement
- **API Integration**: Function not wired into evaluator pipeline

## Implementation Tasks (1 day)

### Task 1: Add to Parser (30 minutes)
```rust
// Add 'minkowski' to SCAD_KEYWORDS in tokenizer.rs
// Add to isBooleanOp() in parser.ts
```

### Task 2: Add to Evaluator (30 minutes)
```typescript
// Add case 'minkowski': to evaluateBooleanOp()
// Use existing wasmModule.minkowski() function
```

### Task 3: Testing (1 hour)
- Basic minkowski with two primitives
- Complex minkowski with multiple shapes
- Edge cases and error handling

## Expected Behavior
```scad
// This should work after integration:
minkowski() {
    cube(10);
    sphere(3);
}
// Creates rounded cube with sphere "corners"
```

## Algorithm Notes
- Uses convex hull approach for efficiency
- Handles arbitrary mesh combinations
- Preserves color from first mesh
- Compatible with all other CSG operations

## Priority: HIGH
- **Implementation Time**: 1 day
- **Impact**: Major (completes CSG operation suite)
- **Complexity**: Low (wiring existing components)
- **Dependencies**: None