# Color/Material Support - Future Enhancement

## Current Status

### What's Complete
- **Parser Support**: Color modifier recognized in parsing
- **WASM Foundation**: `set_color()` function exists in WASM
- **Basic Structure**: ColorInfo interface defined in shared/types.ts
- **Partial Evaluator**: Basic color handling in `handleColor()` function

### What's Missing
- **Full Evaluator Integration**: `color()` transform not fully implemented
- **Material Properties**: No support for transparency, metallic, etc.
- **Rendering Integration**: Frontend visualization not implemented

## Implementation Tasks (2-3 days)

### Task 1: Complete Evaluator Integration (1 day)
```typescript
// Add full color() transform support in evaluateTransform()
// Handle all OpenSCAD color parameters:
// - color([r,g,b]) - RGB color
// - color([r,g,b,a]) - RGBA color  
// - color("red") - Named colors (if implemented)
// - color(c=1) - Alpha channel only
```

### Task 2: Named Color Support (1 day)
```typescript
// Add color name mapping (CSS colors)
// Support common names: "red", "blue", "green", etc.
// Extend existing ColorInfo interface
```

### Task 3: Material Properties (1 day)
```typescript
// Extend for advanced materials
// transparency, metallic, roughness
// Future-proofing for advanced rendering
```

## Expected Behavior
```scad
// Basic RGB
color([1,0,0]) cube(10);

// RGBA  
color([0,1,0,0.5]) sphere(5);

// Named colors (future)
color("red") cylinder(5,10);
```

## Frontend Integration Notes
- Color data passed via geometry.color field
- Compatible with Three.js materials
- Preserved through CSG operations
- Works with all transformations

## Priority: MEDIUM
- **Implementation Time**: 2-3 days
- **Impact**: Medium (visual enhancement)
- **Complexity**: Low-Medium
- **Dependencies**: Frontend Three.js integration