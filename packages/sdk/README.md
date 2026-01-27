# moicad-sdk v0.1.0

Modern JavaScript CAD Library with OpenSCAD Compatibility

## 🚀 Features

- **Fluent API**: Chainable methods with `Shape` class
- **Functional API**: Pure function alternatives
- **OpenSCAD Compatibility**: 98-99% language support
- **High Performance**: Built on manifold-3d CSG engine
- **TypeScript First**: Complete type definitions
- **Cross-Platform**: Browser and Node.js support

## 📦 Installation

```bash
npm install @moicad/sdk
```

## 🔧 Quick Start

### Fluent API (Primary)

```typescript
import { Shape } from '@moicad/sdk';

// Create a bolt
const bolt = Shape.cylinder(20, 2.5)
  .union(Shape.sphere(3).translate([0, 0, 20]))
  .color('silver');

// Get geometry for rendering
const geometry = bolt.getGeometry();
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
} from '@moicad/sdk';

// Create the same bolt functionally
const bolt = union(
  cylinder(20, 2.5),
  translate([0, 0, 20], sphere(3))
).color('silver');
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
import { parse, evaluate } from '@moicad/sdk/scad';

// Parse OpenSCAD code
const result = parse('cube(10); sphere(5);');
console.log('AST:', result.ast);

// Evaluate OpenSCAD to geometry
await evaluate.initManifoldEngine();
const geometry = await evaluate(result.ast);
console.log('Vertices:', geometry.vertices.length);
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

## 🎨 API Reference

### 3D Primitives

- `Shape.cube(size, center?)`
- `Shape.sphere(radius, options?)`
- `Shape.cylinder(height, radius, options?)`
- `Shape.cone(height, radius, options?)`
- `Shape.polyhedron(points, faces)`

### 2D Primitives

- `Shape.circle(radius, options?)`
- `Shape.square(size, center?)`
- `Shape.polygon(points)`

### Transforms

- `.translate(offset)`
- `.rotate(angles)`
- `.scale(factors)`
- `.mirror(normal)`
- `.multmatrix(matrix)`
- `.color(color)`

### Boolean Operations

- `.union(...shapes)`
- `.subtract(...shapes)`
- `.intersect(...shapes)`
- `.hull(...shapes)`
- `.minkowski(shape)`

### 2D/3D Operations

- `.linearExtrude(height, options?)`
- `.rotateExtrude(options?)`
- `.offset(delta, options?)`
- `.projection(options?)`

### Inspection Methods

- `.getGeometry()` - Get geometry data
- `.getBounds()` - Get bounding box
- `.getVolume()` - Get volume
- `.getSurfaceArea()` - Get surface area

## 🔗 OpenSCAD Compatibility

The SDK also supports OpenSCAD syntax parsing:

```typescript
import { parseOpenSCAD, evaluateOpenSCAD } from 'moicad-sdk';

// Parse OpenSCAD code
const ast = parseOpenSCAD('cube(10); sphere(5);');

// Evaluate OpenSCAD
const result = await evaluateOpenSCAD(`
  module bolt(length=20, diameter=6) {
    cylinder(h=length, r=diameter/2);
    translate([0, 0, length])
      sphere(r=diameter * 0.9, $fn=6);
  }
  bolt();
`);
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
cd moicad/packages/sdk

# Install dependencies
npm install

# Build SDK
npm run build

# Run tests
npm test

# Development mode
npm run dev
```

## 📖 Examples

See the `examples/` directory for more examples:

- [Basic Shapes](./examples/basic-shapes.ts)
- [Parametric Design](./examples/parametric.ts)
- [Boolean Operations](./examples/boolean.ts)
- [2D Operations](./examples/2d-operations.ts)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.

## 🔗 Links

- **Documentation**: https://moicad.moikas.com/docs
- **Live Demo**: https://moicad.moikas.com/demo
- **Desktop App**: https://moicad.moikas.com/download
- **GitHub**: https://github.com/moikas/moicad

---

**moicad-sdk** - Modern CAD for JavaScript Developers ✨