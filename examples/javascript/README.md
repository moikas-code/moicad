# moicad JavaScript API Examples

This directory contains comprehensive examples demonstrating the moicad JavaScript API for parametric CAD modeling.

## Overview

moicad provides two API styles:

1. **Fluent API** (recommended): `Shape.cube(10).union(Shape.sphere(5))`
2. **Functional API**: `union(cube(10), sphere(5))`

All examples are written in modern JavaScript/TypeScript and can be run directly in the moicad frontend.

## Examples

### 01-basic-shapes.js
**Difficulty:** Beginner
**Concepts:** Basic primitives, positioning, union

Learn how to create and combine basic 3D shapes:
- Cubes, spheres, cylinders
- Translation for positioning
- Union operation for combining shapes

```javascript
import { Shape } from 'moicad';

const cube = Shape.cube(10);
const sphere = Shape.sphere(5).translate([15, 0, 0]);

export default cube.union(sphere);
```

### 02-parametric-design.js
**Difficulty:** Intermediate
**Concepts:** Classes, parameters, subtractive modeling

Build reusable parametric components using classes:
- Constructor-based configuration
- Parametric dimensions
- Boolean operations (union, subtract)
- Creating families of parts

```javascript
class Bolt {
  constructor(length, diameter) {
    this.length = length;
    this.diameter = diameter;
  }

  build() {
    return Shape.cylinder(this.length, this.diameter / 2);
  }
}

export default new Bolt(20, 6).build();
```

### 03-functional-api.js
**Difficulty:** Beginner
**Concepts:** Functional programming, function composition

Alternative API style using pure functions:
- Named function imports
- Function composition
- Point-free style programming
- Difference and intersection operations

```javascript
import { cube, sphere, difference } from 'moicad';

export default difference(
  cube(20),
  sphere(10)
);
```

### 04-extrusion.js
**Difficulty:** Intermediate
**Concepts:** 2D to 3D conversion, profiles, lathe operations

Create complex 3D shapes from 2D profiles:
- Linear extrusion with twist and scale
- Rotational extrusion (lathe)
- Polygonal profiles
- Creating vases, gears, and organic shapes

```javascript
const profile = Shape.polygon([[10,0], [15,0], [15,20], [10,20]]);
const vase = profile.rotateExtrude({ $fn: 64 });

export default vase;
```

### 05-advanced-techniques.js
**Difficulty:** Advanced
**Concepts:** Hull, Minkowski, patterns, loops

Advanced CAD operations for complex designs:
- Hull operation for organic shapes
- Minkowski sum for rounded edges
- Circular patterns with loops
- Array manipulation for repetition

```javascript
// Create rounded cube
const cube = Shape.cube([15, 15, 15], true);
const sphere = Shape.sphere(2);
const rounded = cube.minkowski(sphere);

// Create circular pattern
const shapes = [];
for (let i = 0; i < 12; i++) {
  const angle = i * 30;
  shapes.push(tooth.rotate([0, 0, angle]));
}
```

### 06-real-world-enclosure.js
**Difficulty:** Advanced
**Concepts:** Complete project, best practices, print-ready design

A complete, print-ready electronics enclosure:
- Parametric dimensions
- Snap-fit design
- Mounting posts for PCB
- Ventilation slots
- Cable management

```javascript
class Enclosure {
  constructor(width, depth, height, wallThickness = 2) {
    // ... parameters
  }

  build() {
    // Create complete enclosure with all features
  }
}

export default new Enclosure(60, 40, 20).build();
```

## Running Examples

### Option 1: moicad Frontend
1. Start the frontend: `bun run dev:frontend`
2. Open http://localhost:3002
3. Select "JavaScript" language from the top menu
4. Copy and paste any example code
5. Click "Render (Alt+R)" to visualize

### Option 2: Command Line
```bash
# Start backend server
bun run dev

# Test an example via API
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{"code":"import { Shape } from \"moicad\"; export default Shape.cube(10);"}'
```

### Option 3: Programmatic Evaluation
```javascript
import { evaluateJavaScript } from './backend/javascript/runtime';

const code = `
  import { Shape } from 'moicad';
  export default Shape.cube(10);
`;

const result = await evaluateJavaScript(code);
console.log('Vertices:', result.geometry.stats.vertexCount);
```

## API Reference

### Primitives

**3D Primitives:**
- `Shape.cube(size, center?)` - Cube or box
- `Shape.sphere(radius, options?)` - Sphere
- `Shape.cylinder(height, radius, options?)` - Cylinder or cone
- `Shape.cone(height, radiusBottom, radiusTop?, options?)` - Cone
- `Shape.polyhedron(points, faces)` - Custom polyhedron

**2D Primitives:**
- `Shape.circle(radius, options?)` - Circle
- `Shape.square(size, center?)` - Square or rectangle
- `Shape.polygon(points)` - Custom polygon

### Transformations

- `.translate([x, y, z])` - Move shape
- `.rotate([rx, ry, rz])` - Rotate shape (degrees)
- `.scale(factor)` or `.scale([x, y, z])` - Scale shape
- `.mirror([x, y, z])` - Mirror across plane
- `.color(color)` - Apply color (visual only)

### Boolean Operations

- `.union(...shapes)` - Combine shapes
- `.subtract(...shapes)` - Subtract shapes
- `.intersect(...shapes)` - Intersection of shapes
- `.difference(...)` - Alias for subtract
- `.intersection(...)` - Alias for intersect

### Advanced Operations

- `.hull(...shapes)` - Convex hull
- `.minkowski(shape)` - Minkowski sum (rounded edges)
- `.linearExtrude(height, options?)` - Extrude 2D to 3D
- `.rotateExtrude(options?)` - Revolve 2D around Z-axis
- `.offset(delta, options?)` - Offset 2D shape
- `.projection(options?)` - Project 3D to 2D

### Inspection Methods

- `.getGeometry()` - Get geometry data
- `.getBounds()` - Get bounding box
- `.getVolume()` - Get volume
- `.getSurfaceArea()` - Get surface area
- `.isManifold()` - Check if valid manifold

## Best Practices

### 1. Use Classes for Reusability
```javascript
class ParametricPart {
  constructor(params) {
    this.params = params;
  }

  build() {
    // Implementation
  }
}
```

### 2. Keep Functions Pure
```javascript
// Good: Pure function
function createBolt(length, diameter) {
  return new Bolt(length, diameter).build();
}

// Avoid: Side effects
let globalShape;
function createBolt(length, diameter) {
  globalShape = new Bolt(length, diameter).build(); // Don't do this
}
```

### 3. Use Descriptive Names
```javascript
// Good
const mountingPost = Shape.cylinder(height, radius);
const ventilationSlot = Shape.cube([width, depth, height]);

// Avoid
const c1 = Shape.cylinder(10, 2);
const c2 = Shape.cube([5, 1, 3]);
```

### 4. Comment Complex Logic
```javascript
// Create hexagonal head (6 sides) with M6 thread diameter
const head = Shape.cylinder(headHeight, diameter * 1.8, { $fn: 6 });

// Add 0.2mm clearance for snap fit
const tolerance = 0.2;
const innerDiameter = outerDiameter - tolerance;
```

### 5. Use Constants for Magic Numbers
```javascript
const WALL_THICKNESS = 2;
const PCB_CLEARANCE = 0.5;
const MOUNTING_POST_DIAMETER = 4;

const enclosure = createEnclosure(width, depth, height, WALL_THICKNESS);
```

## TypeScript Support

All examples can be converted to TypeScript for additional type safety:

```typescript
import { Shape, type PrimitiveOptions } from 'moicad';

interface BoltParams {
  length: number;
  diameter: number;
  headHeight?: number;
}

class Bolt {
  constructor(private params: BoltParams) {}

  build(): Shape {
    // Implementation with full type checking
    return Shape.cylinder(this.params.length, this.params.diameter / 2);
  }
}

export default new Bolt({ length: 20, diameter: 6 }).build();
```

## Performance Tips

1. **Use appropriate $fn values:**
   - Low detail (preview): `$fn: 16`
   - Medium detail (fast render): `$fn: 32`
   - High detail (final): `$fn: 64-128`

2. **Minimize boolean operations:**
   - Combine multiple unions into one: `Shape.union(a, b, c, d)`
   - Avoid nested operations when possible

3. **Cache complex shapes:**
```javascript
// Good: Calculate once
const complexPart = createComplexShape();
const pattern = Array.from({ length: 10 }, (_, i) =>
  complexPart.translate([i * 10, 0, 0])
);

// Avoid: Recalculate each time
const pattern = Array.from({ length: 10 }, (_, i) =>
  createComplexShape().translate([i * 10, 0, 0])
);
```

## Troubleshooting

### "Shape is not defined"
Make sure you import Shape:
```javascript
import { Shape } from 'moicad';
```

### "export default is missing"
Every JavaScript file must export a Shape:
```javascript
export default myShape;
```

### "Geometry is null"
Check for errors in your code:
- Verify all parameters are valid numbers
- Ensure shapes are properly constructed before operations
- Check browser console for detailed error messages

### "Render is slow"
- Reduce $fn values for preview
- Simplify complex operations
- Split large designs into smaller parts

## Additional Resources

- **API Documentation:** See `shared/javascript-types.ts` for complete type definitions
- **OpenSCAD Compatibility:** Most OpenSCAD functions have JavaScript equivalents
- **Community Examples:** Check GitHub for community-contributed examples

## Contributing

To contribute an example:
1. Create a new file: `XX-your-example.js`
2. Follow the existing format with comments
3. Add description to this README
4. Test thoroughly before submitting

## License

These examples are part of the moicad project and follow the same license.
