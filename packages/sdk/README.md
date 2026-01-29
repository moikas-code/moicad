# @moicad/sdk

Modern JavaScript CAD Library with OpenSCAD Compatibility

**Version**: 0.1.13 • **License**: MIT

## 🚀 Features

- **Fluent API**: Chainable methods with `Shape` class
- **Functional API**: Pure function alternatives  
- **OpenSCAD Compatibility**: 98-99% language support
- **High Performance**: Built on manifold-3d CSG engine
- **TypeScript First**: Complete type definitions
- **Cross-Platform**: Browser and Node.js support
- **Plugin System**: Extensible architecture for custom functionality

## 📦 Installation

```bash
npm install @moicad/sdk
```

**Requirements**: Node.js 18+ or modern browser, Bun for development

## 🔧 Quick Start

### Fluent API (Primary)

```typescript
import { Shape } from '@moicad/sdk';

// Create a bolt
const bolt = Shape.cylinder({ h: 20, r: 2.5 })
  .union(Shape.sphere(3).translate([0, 0, 20]))
  .color('silver');

// Get geometry for rendering
const geometry = bolt.toGeometry();
console.log('Volume:', bolt.getVolume());
```

### Functional API (Alternative)

```typescript
import { 
  cube, 
  sphere, 
  translate, 
  union, 
  color 
} from '@moicad/sdk/functional';

// Create the same bolt functionally
const bolt = color('silver', union(
  translate([0, 0, 20], sphere(3)),
  { h: 20, r: 2.5 }
));
```

### 2D to 3D Operations

```typescript
// Extrude 2D shapes
const extruded = Shape.circle(10)
  .linearExtrude(20, { twist: 180, scale: 0.5 });

// Revolve 2D profile
const revolved = Shape.polygon([[0,0], [10,0], [15,20], [0,20]])
  .rotateExtrude();
```

### Advanced Operations

```typescript
// Boolean operations
const result = Shape.cube(20)
  .subtract(Shape.sphere(12))
  .union(Shape.cylinder(25, 2));

// Hull and Minkowski
const rounded = Shape.cube(10).minkowski(Shape.sphere(2));
const hull = Shape.hull(
  Shape.sphere(5).translate([0, 0, 10]),
  Shape.cylinder(20, 3)
);
```

### OpenSCAD Support

```typescript
import { parseOpenSCAD, evaluateAST } from '@moicad/sdk/scad';

// Parse OpenSCAD code
const parseResult = parseOpenSCAD('cube(10); sphere(5);');
console.log('AST:', parseResult.ast);

// Evaluate OpenSCAD to geometry
const evalResult = await evaluateAST(parseResult.ast);
console.log('Vertices:', evalResult.geometry.vertices.length);
```

### 3D Viewport

```typescript
import { Viewport } from '@moicad/sdk/viewport';

// Create viewport container
const container = document.createElement('div');
document.body.appendChild(container);

// Initialize viewport with 3D geometry
const viewport = new Viewport(container, {
  width: 800,
  height: 600,
  enableStats: true,
  backgroundColor: '#1a1a1a'
});

// Update viewport with geometry
viewport.updateGeometry(geometry);

// Get performance stats
const stats = viewport.getStats();
console.log('FPS:', stats.fps);
console.log('Vertices:', stats.vertices);

// Clean up
viewport.dispose();
```

### Plugin System (NEW!)

```typescript
import { loadPlugin, initializePlugins } from '@moicad/sdk';

// Load custom plugin
await loadPlugin('./my-plugin.js');
await loadPlugin('@moicad/plugin-advanced-geometry');

// Initialize plugin system
await initializePlugins();

// Use plugin primitives
const torus = Shape.torus(10, 5);
const spring = Shape.spring(50, 10, 8);
const gear = Shape.gear(20, 12);

// Use plugin transforms
const array = Shape.cube(10).array(3, 3, 1, 15);
const filleted = Shape.cube(20).fillet(2);

// Use plugin OpenSCAD functions in SCAD code
const scadCode = `
  // Plugin functions available!
  params = calc_gear_params(2, 20);
  phi = golden_ratio();
`;
```

## 🎨 API Reference

### 3D Primitives

- `Shape.cube(size?, options?)` - Cube with optional centering
- `Shape.sphere(radius, options?)` - Sphere with fragments control
- `Shape.cylinder(options)` - Cylinder with height, radius, center
- `Shape.cone(options)` - Cone with height and radii
- `Shape.polyhedron(points, faces, convexity?)` - Custom polyhedron
- `Shape.text(text, options?)` - 3D text rendering
- `Shape.surface(data, options?)` - Heightmap surface

### 2D Primitives

- `Shape.circle(radius, options?)` - Circle with fragments
- `Shape.square(size?, center?)` - Square with optional centering
- `Shape.polygon(points, paths?)` - Custom 2D polygon

### Transforms

- `.translate(offset)` - Translate by [x, y, z]
- `.rotate(angles)` - Rotate by [x, y, z] degrees
- `.scale(factors)` - Scale by [x, y, z] or uniform factor
- `.mirror(normal)` - Mirror across plane normal
- `.multmatrix(matrix)` - Apply 4x4 transformation matrix

### Boolean Operations

- `.union(...shapes)` - Combine shapes
- `.subtract(...shapes)` - Remove shapes from base
- `.intersect(...shapes)` - Keep overlapping regions
- `.hull(...shapes)` - Convex hull of shapes
- `.minkowski(shape)` - Minkowski sum operation

### 2D/3D Operations

- `.linearExtrude(height, options?)` - Extrude 2D to 3D
- `.rotateExtrude(options?)` - Revolve 2D profile around axis
- `.offset(delta, options?)` - Expand/contract 2D shapes

### Geometry Methods

- `.toGeometry()` - Get geometry data for rendering/export
- `.getBounds()` - Get axis-aligned bounding box
- `.getVolume()` - Calculate volume
- `.getSurfaceArea()` - Calculate surface area
- `.clone()` - Create independent copy

## 🔗 OpenSCAD Compatibility

The SDK also supports OpenSCAD syntax parsing:

```typescript
import { parseOpenSCAD, evaluateAST } from '@moicad/sdk/scad';

// Parse OpenSCAD code
const parseResult = parseOpenSCAD(`
  module bolt(length=20, diameter=6) {
    cylinder(h=length, r=diameter/2);
    translate([0, 0, length])
      sphere(r=diameter * 0.9, $fn=6);
  }
  bolt();
`);

// Evaluate OpenSCAD
const evalResult = await evaluateAST(parseResult.ast);
console.log('Geometry:', evalResult.geometry);
```

## ⚡ Performance

moicad-sdk is built on manifold-3d, providing:
- **10-20x faster** evaluation than OpenSCAD parsing
- **Guaranteed manifold** output (no topology errors)
- **Robust boolean** operations
- **Memory efficient** CSG operations

## 🛠 Development

```bash
# Clone repository
git clone https://github.com/moikas/moicad
cd moicad

# Install dependencies (Bun required)
bun install

# Build SDK
cd packages/sdk
bun run build

# Run tests
bun test

# Generate documentation
bun run docs

# Development mode
bun run dev
```

## 📖 Examples

The SDK includes comprehensive examples:

```bash
# Run examples from packages/sdk directory
bun run examples/basic-shapes.ts
bun run examples/parametric.ts  
bun run examples/boolean.ts
bun run examples/2d-operations.ts
```

### Core Examples

- **Basic Shapes** - Primitives and transforms
- **Parametric Design** - Functions and modules
- **Boolean Operations** - CSG operations
- **2D Operations** - Extrusion and revolution
- **OpenSCAD Parsing** - Parse and evaluate OpenSCAD code

### Plugin System

See [Plugin System Documentation](./PLUGIN_SYSTEM.md) for creating:

- Custom primitives and transforms
- OpenSCAD function extensions
- File format handlers
- Viewport extensions

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests with coverage
bun run test:coverage

# Run specific test file
bun test shape.test.ts
```

## 📚 Documentation

```bash
# Generate API documentation
bun run docs

# View generated docs
open ./docs/index.html
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.

## 🔗 Links

- **Live Demo**: https://moicad.moikas.com/demo
- **Desktop App**: https://moicad.moikas.com/download  
- **GitHub**: https://github.com/moikas/moicad
- **Documentation**: Auto-generated in package

## 🏗️ Architecture

This SDK is the **canonical CAD engine** for the moicad ecosystem:

```
OpenSCAD/JS Code → Parser → AST → Evaluator → manifold-3d → Geometry
```

**Core Components**:
- `src/shape.ts` - Fluent Shape API
- `src/functional.ts` - Functional API  
- `src/scad/` - OpenSCAD parser & evaluator
- `src/manifold/` - manifold-3d CSG engine integration
- `src/viewport/` - Three.js viewport component
- `src/plugins/` - Plugin system

## 🔄 Monorepo Integration

This SDK integrates seamlessly with the moicad monorepo:

```bash
# From repository root
cd packages/landing  # Next.js web app
bun run dev          # Uses @moicad/sdk

cd packages/desktop  # Tauri desktop  
bun run tauri:dev    # Uses @moicad/sdk
```

---

**@moicad/sdk** - The canonical CAD engine for modern JavaScript ✨
