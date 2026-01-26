# Bug Fix: TypedArray Serialization Issue

## Issue
Cube (and all geometry) wasn't showing in the frontend viewport after clicking render button.

## Root Cause
TypedArrays (Float32Array, Uint32Array) don't serialize properly to JSON. When `JSON.stringify()` is called on a TypedArray, it converts it to an object format instead of an array:

```javascript
// TypedArray serialization problem:
const vertices = new Float32Array([0, 0, 0, 10, 10, 10]);
JSON.stringify(vertices);
// Result: {"0": 0, "1": 0, "2": 0, "3": 10, "4": 10, "5": 10}
// Expected: [0, 0, 0, 10, 10, 10]
```

This caused the frontend to receive:
```json
{
  "geometry": {
    "vertices": {"0": 0, "1": 0, "2": 0, ...},  // Object, not array!
    "indices": {"0": 0, "1": 1, "2": 2, ...},   // Object, not array!
    "normals": {"0": 0, "1": 0, "2": 1, ...}    // Object, not array!
  }
}
```

Three.js expects arrays for BufferAttribute:
```typescript
// This fails with object data:
new THREE.BufferAttribute(new Float32Array(geometry.vertices), 3)
```

## Fix
Convert TypedArrays to regular arrays before returning from `manifoldToGeometry()`:

**File**: `backend/manifold-geometry.ts` (lines 34-39)

```typescript
// Before (WRONG):
return {
  vertices,  // Float32Array - serializes as object
  indices,   // Uint32Array - serializes as object
  normals,   // Float32Array - serializes as object
  ...
};

// After (CORRECT):
return {
  vertices: Array.from(vertices),  // Regular array
  indices: Array.from(indices),    // Regular array
  normals: Array.from(normals),    // Regular array
  ...
};
```

## Verification
```bash
# Test that all arrays are properly serialized
curl -s -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}' | jq '{
    vertices_type: (.geometry.vertices | type),
    indices_type: (.geometry.indices | type),
    normals_type: (.geometry.normals | type)
  }'

# Output:
# {
#   "vertices_type": "array",
#   "indices_type": "array",
#   "normals_type": "array"
# }
```

## Related Bugs Fixed
1. **Double-nesting issue** (fixed earlier):
   - `backend/index.ts` line 434 - Changed to extract geometry from EvaluateResult
   
2. **TypedArray serialization** (this fix):
   - `backend/manifold-geometry.ts` lines 34-39 - Convert TypedArrays to arrays

## Status
✅ **FIXED** - Geometry now renders correctly in Three.js viewport.

## Technical Notes
- `Array.from()` creates a shallow copy as a regular JavaScript array
- Performance impact is minimal (arrays are small, < 10MB typically)
- Alternative solutions considered:
  - Custom JSON serializer (too complex)
  - Base64 encoding (binary size larger than JSON arrays)
  - Keep TypedArrays (requires custom deserialization on frontend)
- Chosen solution is simplest and most compatible
