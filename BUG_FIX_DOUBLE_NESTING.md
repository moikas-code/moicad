# Bug Fix: Double-Nesting in API Response

## Issue
Frontend render button wasn't showing shapes because the API response had a double-nested geometry structure.

## Root Cause
In `backend/index.ts` line 434, the `evaluateCode()` method was treating `evaluateAST()` return value incorrectly:

```typescript
// WRONG - evaluateAST returns EvaluateResult, not Geometry
const geometry = await evaluateAST(parseResult.ast);

return {
  geometry,  // This wrapped EvaluateResult inside another EvaluateResult
  errors: [],
  success: true,
  executionTime,
};
```

This caused the response structure to be:
```json
{
  "geometry": {
    "geometry": { "vertices": [...], "indices": [...], ... },
    "errors": [],
    "success": true,
    "executionTime": 15.2
  },
  "errors": [],
  "success": true,
  "executionTime": 16.8
}
```

## Fix
Changed line 434 to properly extract the geometry from `EvaluateResult`:

```typescript
// CORRECT - evaluateAST returns EvaluateResult with geometry field
const evalResult = await evaluateAST(parseResult.ast);

return {
  geometry: evalResult.geometry,  // Extract the actual Geometry object
  errors: evalResult.errors,
  success: evalResult.success,
  executionTime,
};
```

Now the response structure is correct:
```json
{
  "geometry": {
    "vertices": [...],
    "indices": [...],
    "normals": [...],
    "bounds": { "min": [...], "max": [...] },
    "stats": { "vertexCount": 8, "faceCount": 12, "volume": 1000 }
  },
  "errors": [],
  "success": true,
  "executionTime": 15.2
}
```

## Verification
```bash
# Test that geometry has correct keys (not nested)
curl -s -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"cube(10);"}' | jq '.geometry | keys'

# Output:
# ["bounds", "indices", "normals", "stats", "vertices"]
```

## Files Changed
- `backend/index.ts` - Line 434 (evaluateCode method)

## Status
✅ **FIXED** - API now returns correct geometry structure, frontend should render shapes properly.
