# moicad JavaScript API Documentation

Complete reference for using moicad with JavaScript/TypeScript for parametric CAD modeling.

## Table of Contents

- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [API Styles](#api-styles)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [Fluent API](#fluent-api)
  - [Functional API](#functional-api)
  - [OpenSCAD Module](#openscad-module)
  - [Viewport Module](#viewport-module)
  - [Runtime Module](#runtime-module)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [TypeScript Support](#typescript-support)

---

## Introduction

The moicad JavaScript API provides a modern, type-safe interface for creating parametric 3D models. It offers two complementary API styles:

1. **Fluent API** (Primary): Object-oriented, chainable methods
2. **Functional API** (Alternative): Pure functions, composable operations

Both APIs provide full access to manifold-3d's robust CSG engine, ensuring all output is manifold-valid (no topology errors).

### Why JavaScript for CAD?

- **Modern Language**: ES6+ features, async/await, classes
- **Type Safety**: Full TypeScript support with IntelliSense
- **Performance**: 10-20x faster than OpenSCAD parsing
- **Reusability**: npm packages, modules, classes
- **Familiarity**: Web developers already know JavaScript
- **Tooling**: ESLint, Prettier, VS Code support

---

## Getting Started

### Quick Start

```javascript
import { Shape } from 'moicad';

// Create a simple cube
const cube = Shape.cube(10);

// Must export a Shape as default
export default cube;
```

### Frontend Usage

1. Open moicad frontend (http://localhost:3002)
2. Select "JavaScript" from the language selector
3. Write your code
4. Press "Render (Alt+R)" to visualize

### Backend/CLI Usage

```javascript
import { evaluateJavaScript } from './backend/javascript/runtime';

const code = `
  import { Shape } from 'moicad';
  export default Shape.cube(10);
`;

const result = await evaluateJavaScript(code);
console.log('Geometry:', result.geometry);
```

---

## API Styles

### Fluent API (Recommended)

Object-oriented style with chainable methods:

```javascript
import { Shape } from 'moicad';

const model = Shape.cube([20, 20, 10])
  .subtract(
    Shape.sphere(8, { $fn: 32 })
      .translate([10, 10, 0])
  )
  .color('blue');

export default model;
```

**Pros:**
- Intuitive method chaining
- Discoverable via IDE autocomplete
- Clear object relationships
- Easier for beginners

### Functional API

Functional programming style with pure functions:

```javascript
import { cube, sphere, translate, subtract, color } from 'moicad';

const model = color(
  'blue',
  subtract(
    cube([20, 20, 10]),
    translate([10, 10, 0], sphere(8))
  )
);

export default model;
```

**Pros:**
- Point-free style
- Function composition
- Familiar to FP enthusiasts
- Easy to test

Both styles are fully supported and can be mixed.

---

## Core Concepts

### Immutability

All operations return **new** Shape instances. Original shapes are never modified:

```javascript
const cube1 = Shape.cube(10);
const cube2 = cube1.translate([5, 0, 0]); // cube1 is unchanged

console.log(cube1.getBounds()); // { min: [0,0,0], max: [10,10,10] }
console.log(cube2.getBounds()); // { min: [5,0,0], max: [15,10,10] }
```

### Manifold Guarantee

All output from moicad is guaranteed to be manifold (closed, non-self-intersecting). This is enforced by the underlying manifold-3d engine.

### Coordinate System

- **Origin**: Bottom-left-back corner (same as OpenSCAD)
- **Units**: Millimeters (by convention)
- **Right-handed**: X=right, Y=back, Z=up

### Export Requirement

Every JavaScript file must export a Shape as default:

```javascript
// ✅ Correct
export default myShape;

// ❌ Wrong - will cause evaluation error
myShape;
```

---

## API Reference

### Primitives - 3D

#### `Shape.cube(size, center?)`

Create a cube or rectangular box.

**Parameters:**
- `size`: `number | [number, number, number]` - Size or [width, depth, height]
- `center`: `boolean` (optional) - If true, cube is centered at origin

**Examples:**
```javascript
Shape.cube(10);              // 10x10x10 cube at origin
Shape.cube([20, 10, 5]);     // Box: 20mm wide, 10mm deep, 5mm tall
Shape.cube(10, true);        // Centered cube
```

---

#### `Shape.sphere(radius, options?)`

Create a sphere.

**Parameters:**
- `radius`: `number` - Sphere radius
- `options`: `PrimitiveOptions` (optional)
  - `$fn`: number of fragments (default: auto)
  - `center`: always centered (ignored)

**Examples:**
```javascript
Shape.sphere(5);             // Sphere with default detail
Shape.sphere(10, { $fn: 64 }); // High-detail sphere
```

---

#### `Shape.cylinder(height, radius, options?)`

Create a cylinder or tapered cylinder (cone).

**Parameters:**
- `height`: `number` - Cylinder height
- `radius`: `number | [number, number]` - Radius or [radiusBottom, radiusTop]
- `options`: `PrimitiveOptions` (optional)
  - `$fn`: number of sides
  - `center`: if true, centered on Z-axis

**Examples:**
```javascript
Shape.cylinder(20, 5);                     // Cylinder: h=20, r=5
Shape.cylinder(20, [10, 5]);               // Tapered cylinder
Shape.cylinder(20, 5, { center: true });   // Centered
Shape.cylinder(20, 5, { $fn: 6 });         // Hexagonal cylinder
```

---

#### `Shape.cone(height, radiusBottom, radiusTop?, options?)`

Create a cone or truncated cone.

**Parameters:**
- `height`: `number` - Cone height
- `radiusBottom`: `number` - Base radius
- `radiusTop`: `number` (optional, default: 0) - Top radius
- `options`: `PrimitiveOptions` (optional)

**Examples:**
```javascript
Shape.cone(20, 10);           // Pointed cone
Shape.cone(20, 10, 5);        // Truncated cone
Shape.cone(20, 10, 0, { $fn: 32 }); // Smooth cone
```

---

#### `Shape.polyhedron(points, faces)`

Create a custom polyhedron from vertices and faces.

**Parameters:**
- `points`: `number[][]` - Array of [x, y, z] vertices
- `faces`: `number[][]` - Array of face indices

**Example:**
```javascript
const points = [
  [0, 0, 0], [10, 0, 0],
  [5, 10, 0], [5, 5, 10]
];
const faces = [
  [0, 1, 2],     // Bottom
  [0, 2, 3],     // Side
  [0, 3, 1],     // Side
  [1, 3, 2]      // Side
];
Shape.polyhedron(points, faces); // Tetrahedron
```

---

### Primitives - 2D

#### `Shape.circle(radius, options?)`

Create a 2D circle (for extrusion).

**Parameters:**
- `radius`: `number` - Circle radius
- `options`: `PrimitiveOptions` (optional)
  - `$fn`: number of segments

**Example:**
```javascript
Shape.circle(10);              // Circle for extrusion
Shape.circle(10, { $fn: 64 }); // Smooth circle
```

---

#### `Shape.square(size, center?)`

Create a 2D square or rectangle.

**Parameters:**
- `size`: `number | [number, number]` - Size or [width, height]
- `center`: `boolean` (optional) - Center at origin

**Example:**
```javascript
Shape.square(10);              // 10x10 square
Shape.square([20, 10], true);  // Centered rectangle
```

---

#### `Shape.polygon(points)`

Create a 2D polygon from points.

**Parameters:**
- `points`: `[number, number][]` - Array of [x, y] points

**Example:**
```javascript
Shape.polygon([
  [0, 0], [10, 0], [5, 10]
]); // Triangle

Shape.polygon([
  [0, 0], [10, 0],
  [10, 10], [0, 10]
]); // Square
```

---

### Transformations

All transformations return a new Shape (immutable).

#### `.translate(offset)`

Move the shape in 3D space.

**Parameters:**
- `offset`: `[number, number, number]` - [x, y, z] translation

**Example:**
```javascript
cube.translate([10, 0, 0]);      // Move 10mm on X
cube.translate([5, 5, 10]);      // Move in 3D
```

---

#### `.rotate(angles)`

Rotate the shape around X, Y, Z axes (in that order).

**Parameters:**
- `angles`: `[number, number, number]` - [rx, ry, rz] in degrees

**Example:**
```javascript
cube.rotate([45, 0, 0]);         // Rotate 45° around X
cube.rotate([0, 90, 0]);         // Rotate 90° around Y
cube.rotate([45, 45, 0]);        // Rotate around X and Y
```

---

#### `.scale(factors)`

Scale the shape uniformly or non-uniformly.

**Parameters:**
- `factors`: `number | [number, number, number]` - Scale factor(s)

**Example:**
```javascript
cube.scale(2);                   // Uniform 2x scaling
cube.scale([2, 1, 0.5]);        // Non-uniform scaling
```

---

#### `.mirror(normal)`

Mirror the shape across a plane defined by its normal vector.

**Parameters:**
- `normal`: `[number, number, number]` - Plane normal vector

**Example:**
```javascript
shape.mirror([1, 0, 0]);         // Mirror across YZ plane (X=0)
shape.mirror([0, 1, 0]);         // Mirror across XZ plane (Y=0)
shape.mirror([0, 0, 1]);         // Mirror across XY plane (Z=0)
```

---

#### `.color(color)`

Apply color to the shape (visual only, doesn't affect geometry).

**Parameters:**
- `color`: `string | [number, number, number] | [number, number, number, number]`
  - CSS color name: `'red'`, `'blue'`
  - Hex string: `'#ff0000'`
  - RGB: `[1, 0, 0]` (0-1 range)
  - RGBA: `[1, 0, 0, 0.5]` (with transparency)

**Example:**
```javascript
cube.color('red');
cube.color('#00ff00');
cube.color([1, 0, 0]);           // Red (RGB)
cube.color([1, 0, 0, 0.5]);      // Semi-transparent red
```

---

### Boolean Operations

#### `.union(...shapes)`

Combine this shape with one or more other shapes.

**Parameters:**
- `shapes`: `Shape[]` - Shapes to unite with this one

**Example:**
```javascript
cube.union(sphere);
cube.union(sphere1, sphere2, sphere3);

// Static method
Shape.union(cube, sphere1, sphere2);
```

---

#### `.subtract(...shapes)`

Subtract one or more shapes from this shape (difference operation).

**Parameters:**
- `shapes`: `Shape[]` - Shapes to subtract

**Example:**
```javascript
cube.subtract(sphere);           // Sphere-shaped hole
box.subtract(hole1, hole2);      // Multiple holes

// Alias
cube.difference(sphere);
```

---

#### `.intersect(...shapes)`

Find the intersection of this shape with one or more shapes.

**Parameters:**
- `shapes`: `Shape[]` - Shapes to intersect with

**Example:**
```javascript
cube.intersect(sphere);          // Only overlapping volume

// Static method
Shape.intersection(cube, sphere);
```

---

#### `.hull(...shapes)`

Compute convex hull of this shape and other shapes.

Returns the smallest convex shape that contains all input shapes.

**Parameters:**
- `shapes`: `Shape[]` (optional) - Additional shapes

**Example:**
```javascript
sphere1.hull(sphere2, sphere3);  // Hull of 3 spheres

// Static method
Shape.hull(sphere1, sphere2, sphere3);

// Create organic shape
const organic = Shape.hull(
  Shape.sphere(5).translate([0, 0, 0]),
  Shape.sphere(4).translate([10, 5, 5]),
  Shape.sphere(6).translate([5, 10, 10])
);
```

---

#### `.minkowski(shape)`

Compute Minkowski sum with another shape.

The Minkowski sum places a copy of the second shape at every point of the first shape. Useful for rounding edges.

**Parameters:**
- `shape`: `Shape` - Shape to perform Minkowski sum with

**Example:**
```javascript
// Round the edges of a cube
const roundedCube = cube.minkowski(
  Shape.sphere(2, { $fn: 16 })
);

// Static method
Shape.minkowski(cube, sphere);
```

---

### 2D/3D Operations

#### `.linearExtrude(height, options?)`

Extrude a 2D shape linearly along the Z-axis.

**Parameters:**
- `height`: `number` - Extrusion height
- `options`: `LinearExtrudeOptions` (optional)
  - `twist`: number (degrees) - Twist along extrusion
  - `scale`: number or [x, y] - Scale at top
  - `slices`: number - Number of slices (for twist)
  - `center`: boolean - Center vertically

**Examples:**
```javascript
// Simple extrusion
Shape.circle(10).linearExtrude(20);

// Twisted tower
Shape.square(10).linearExtrude(50, {
  twist: 180,
  scale: 0.5
});

// Tapered column
Shape.circle(10).linearExtrude(30, {
  scale: [0.5, 0.5]
});
```

---

#### `.rotateExtrude(options?)`

Revolve a 2D shape around the Z-axis (lathe operation).

**Parameters:**
- `options`: `RotateExtrudeOptions` (optional)
  - `angle`: number (degrees, default: 360) - Revolution angle
  - `$fn`: number - Number of fragments

**Examples:**
```javascript
// Full revolution (vase)
const profile = Shape.polygon([
  [10, 0], [12, 10], [10, 20]
]);
profile.rotateExtrude({ $fn: 64 });

// Partial revolution (180°)
profile.rotateExtrude({ angle: 180, $fn: 32 });
```

---

#### `.offset(delta, options?)`

Offset a 2D shape (expand or contract).

**Parameters:**
- `delta`: `number` - Offset distance (positive=expand, negative=contract)
- `options`: `OffsetOptions` (optional)
  - `chamfer`: boolean - Use chamfer instead of round

**Example:**
```javascript
Shape.square(20).offset(5);      // Expand by 5mm
Shape.circle(10).offset(-2);     // Contract by 2mm
```

---

#### `.projection(options?)`

Project a 3D shape to 2D.

**Parameters:**
- `options`: `ProjectionOptions` (optional)
  - `cut`: boolean - Cut at Z=0 instead of shadow projection

**Example:**
```javascript
Shape.sphere(10).projection();           // Shadow projection
Shape.cube(20).projection({ cut: true }); // Cut at Z=0
```

---

### Inspection Methods

These methods extract information from shapes (non-chainable).

#### `.getGeometry()`

Extract the final Geometry object for rendering/export.

**Returns:** `Geometry`
- `vertices`: number[] - Vertex positions [x,y,z, x,y,z, ...]
- `indices`: number[] - Triangle indices
- `normals`: number[] - Normal vectors
- `bounds`: { min: [x,y,z], max: [x,y,z] }
- `stats`: { vertexCount, faceCount, volume, surfaceArea }

**Example:**
```javascript
const geometry = cube.getGeometry();
console.log('Vertices:', geometry.stats.vertexCount);
console.log('Volume:', geometry.stats.volume);
```

---

#### `.getBounds()`

Get the axis-aligned bounding box.

**Returns:** `BoundingBox`
- `min`: [number, number, number]
- `max`: [number, number, number]

**Example:**
```javascript
const bounds = shape.getBounds();
console.log('Min:', bounds.min); // [0, 0, 0]
console.log('Max:', bounds.max); // [10, 10, 10]

const width = bounds.max[0] - bounds.min[0];
```

---

#### `.getVolume()`

Get the volume of the shape.

**Returns:** `number` - Volume in cubic units

**Example:**
```javascript
const volume = sphere.getVolume();
console.log('Volume:', volume, 'mm³');
```

---

#### `.getSurfaceArea()`

Get the surface area of the shape.

**Returns:** `number` - Surface area in square units

**Example:**
```javascript
const area = cube.getSurfaceArea();
console.log('Surface area:', area, 'mm²');
```

---

#### `.isManifold()`

Check if the shape is a valid manifold.

**Returns:** `boolean` - True if manifold is valid

**Example:**
```javascript
if (shape.isManifold()) {
  console.log('Shape is watertight and printable');
}
```

### Runtime Module

The runtime module provides JavaScript code evaluation capabilities, allowing you to execute user-provided JavaScript code safely.

```javascript
import { evaluateJavaScript, JavaScriptRuntime } from '@moicad/sdk/runtime';
```

#### `evaluateJavaScript(code, options?)`

Evaluates JavaScript code and returns geometry or errors.

**Parameters:**
- `code: string` - JavaScript code to execute
- `options?: RuntimeOptions` - Runtime configuration options

**Returns:** `Promise<EvaluateResult>` - Evaluation result with geometry or errors

**Example:**
```javascript
const result = await evaluateJavaScript(`
  import { Shape } from '@moicad/sdk';
  export default Shape.cube(10).union(Shape.sphere(5));
`);

if (result.success) {
  console.log('Geometry created:', result.geometry.vertices.length);
} else {
  console.error('Evaluation failed:', result.errors);
}
```

#### `JavaScriptRuntime` Class

Creates a runtime instance with custom configuration.

**Constructor:**
```javascript
const runtime = new JavaScriptRuntime({
  timeout: 30000,        // Execution timeout
  memoryLimit: 1024**3, // 1GB memory limit
  allowedModules: ['@moicad/sdk', 'moicad'] // Allowed imports
});
```

**Methods:**
- `evaluate(code, options?)` - Evaluate JavaScript code
- `validateCode(code)` - Check if code is safe to execute

**Example:**
```javascript
const runtime = new JavaScriptRuntime({ timeout: 5000 });

// Validate code first
const validation = runtime.validateCode(`
  import { Shape } from '@moicad/sdk';
  export default Shape.cube(10);
`);

if (validation.isValid) {
  const result = await runtime.evaluate(code);
  console.log('Success:', result.success);
}
```

#### Runtime Security

The runtime module includes security features:
- **Restricted imports**: Only `@moicad/sdk` modules allowed
- **Timeout protection**: Prevents infinite loops
- **Code validation**: Detects dangerous patterns
- **Memory limits**: Prevents excessive memory usage

#### Supported Import Styles

```javascript
// Named imports
import { cube, sphere } from '@moicad/sdk';

// Namespace imports
import * as moicad from '@moicad/sdk';

// Default imports
import Shape from '@moicad/sdk';

// Mixed imports
import Shape, { cube } from '@moicad/sdk';
```

**Use Cases:**
- Web-based CAD editors (like OpenSCAD.org)
- Plugin systems with dynamic model generation
- Educational platforms
- Online CAD playgrounds

---

## Examples

See the `examples/javascript/` directory for comprehensive examples:

1. **01-basic-shapes.js** - Primitives and positioning
2. **02-parametric-design.js** - Classes and parameters
3. **03-functional-api.js** - Functional programming style
4. **04-extrusion.js** - 2D to 3D conversion
5. **05-advanced-techniques.js** - Hull, Minkowski, patterns
6. **06-real-world-enclosure.js** - Complete project

---

## Best Practices

### 1. Use Descriptive Variable Names

```javascript
// Good
const mountingPost = Shape.cylinder(10, 2);
const ventilationSlot = Shape.cube([20, 1, 3]);

// Avoid
const c1 = Shape.cylinder(10, 2);
const c2 = Shape.cube([20, 1, 3]);
```

### 2. Extract Constants

```javascript
const WALL_THICKNESS = 2;
const MOUNTING_POST_DIA = 4;
const PCB_CLEARANCE = 0.5;

const box = createBox(width, depth, height, WALL_THICKNESS);
```

### 3. Create Reusable Functions

```javascript
function createMountingPost(height, diameter) {
  return Shape.cylinder(height, diameter / 2)
    .union(
      Shape.sphere(diameter / 2, { $fn: 16 })
        .translate([0, 0, height])
    );
}
```

### 4. Use Classes for Complex Parts

```javascript
class ParametricEnclosure {
  constructor(width, depth, height, options = {}) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.options = { wallThickness: 2, ...options };
  }

  build() {
    // Implementation
  }
}
```

### 5. Comment Complex Operations

```javascript
// Create hexagonal bolt head (6 sides) for M6 thread
const boltHead = Shape.cylinder(5, 9, { $fn: 6 });

// Add 0.2mm clearance tolerance for snap-fit assembly
const TOLERANCE = 0.2;
const innerDiameter = outerDiameter - TOLERANCE;
```

---

## TypeScript Support

Full TypeScript support with type definitions:

```typescript
import { Shape, type PrimitiveOptions, type Vector3 } from 'moicad';

interface BoltParams {
  length: number;
  diameter: number;
  headHeight?: number;
}

class Bolt {
  constructor(private params: BoltParams) {}

  build(): Shape {
    const { length, diameter, headHeight = diameter * 0.7 } = this.params;

    const shaft = Shape.cylinder(length, diameter / 2);
    const head = Shape.cylinder(headHeight, diameter * 0.9, { $fn: 6 })
      .translate([0, 0, length]);

    return shaft.union(head);
  }
}

export default new Bolt({ length: 20, diameter: 6 }).build();
```

### Type Definitions

Import types from `shared/javascript-types.ts`:

- `Language` - 'openscad' | 'javascript'
- `PrimitiveOptions` - Options for primitives
- `TextOptions` - Text rendering options
- `LinearExtrudeOptions` - Extrusion options
- `RotateExtrudeOptions` - Revolution options
- `Color` - Color type
- `Vector3` - [number, number, number]
- `Vector2` - [number, number]
- `BoundingBox` - Bounding box type

---

## Performance Optimization

### 1. Use Appropriate $fn Values

```javascript
// Preview (fast)
Shape.sphere(10, { $fn: 16 });

// Default (balanced)
Shape.sphere(10, { $fn: 32 });

// Final render (slow, high quality)
Shape.sphere(10, { $fn: 128 });
```

### 2. Cache Complex Shapes

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

### 3. Minimize Boolean Operations

```javascript
// Good: Single operation
Shape.union(part1, part2, part3, part4);

// Avoid: Nested operations
part1.union(part2).union(part3).union(part4);
```

---

## Troubleshooting

### Common Errors

**"Shape is not defined"**
```javascript
// Fix: Import Shape
import { Shape } from 'moicad';
```

**"export default is missing"**
```javascript
// Fix: Export your shape
const myShape = Shape.cube(10);
export default myShape;
```

**"Geometry is null"**
- Check for invalid parameters (negative sizes, etc.)
- Verify all shapes are properly constructed
- Check browser console for detailed errors

**"Render is slow"**
- Reduce $fn values
- Simplify complex boolean operations
- Split large designs into parts

---

## Migration from OpenSCAD

### Syntax Comparison

| OpenSCAD | JavaScript (Fluent) | JavaScript (Functional) |
|----------|---------------------|-------------------------|
| `cube(10);` | `Shape.cube(10)` | `cube(10)` |
| `translate([5,0,0]) cube(10);` | `Shape.cube(10).translate([5,0,0])` | `translate([5,0,0], cube(10))` |
| `union() { cube(10); sphere(5); }` | `Shape.cube(10).union(Shape.sphere(5))` | `union(cube(10), sphere(5))` |
| `difference() { cube(10); sphere(5); }` | `Shape.cube(10).subtract(Shape.sphere(5))` | `difference(cube(10), sphere(5))` |

### Key Differences

1. **No semicolons inside operations**: JavaScript uses method chaining
2. **Export required**: Must `export default` your final shape
3. **Imports needed**: Must import Shape or functions
4. **Degrees**: Rotation angles are in degrees (same as OpenSCAD)
5. **Arrays**: Use JavaScript array syntax `[1, 2, 3]`

---

## Additional Resources

- **Examples:** `examples/javascript/` directory
- **Type Definitions:** `shared/javascript-types.ts`
- **API Implementation:** `backend/javascript/shape.ts`
- **Tests:** `test-javascript-api*.ts` files

For questions or contributions, visit the moicad GitHub repository.
