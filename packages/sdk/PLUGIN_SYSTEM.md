# moicad Plugin System Documentation

## Overview

The moicad SDK now includes a comprehensive plugin system that allows developers to extend the CAD library with custom primitives, transforms, file handlers, OpenSCAD functions, and viewport extensions. The plugin system is inspired by Blender's extensible architecture and provides multiple extension points throughout the SDK.

## Quick Start

### Installing and Using Plugins

```typescript
import { 
  Shape, 
  loadPlugin, 
  initializePlugins, 
  pluginManager 
} from '@moicad/sdk';

// 1. Load a plugin
await loadPlugin('./my-plugin.js');
await loadPlugin('@moicad/plugin-advanced-geometry');

// 2. Initialize the plugin system
await initializePlugins();
await Shape.initializePlugins();

// 3. Use plugin primitives
const torus = Shape.torus(10, 5);
const spring = Shape.spring(50, 10, 8);
```

### Creating a Simple Plugin

```typescript
import type { Plugin } from '@moicad/sdk';
import { Shape } from '@moicad/sdk';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  // Custom primitives
  primitives: {
    myShape: (size: number) => {
      return Shape.cube(size).color('blue');
    }
  },
  
  // Custom transforms
  transforms: {
    myTransform: (shape: Shape, factor: number) => {
      return shape.scale(factor);
    }
  }
};
```

## Plugin Types and Extension Points

### 1. Primitives

Custom shape generators that become available as static methods on the `Shape` class.

```typescript
primitives: {
  torus: (outerRadius: number, innerRadius: number, segments?: number) => Shape,
  spring: (height: number, radius: number, turns?: number, wireRadius?: number) => Shape,
  gear: (radius: number, teeth: number, height?: number) => Shape
}
```

**Usage:**
```typescript
const torus = Shape.torus(10, 5, 32);
const spring = Shape.spring(50, 10, 8, 2);
```

### 2. Transforms

Custom geometric operations that become available as instance methods on `Shape` objects.

```typescript
transforms: {
  fillet: (shape: Shape, radius: number) => Shape,
  chamfer: (shape: Shape, distance: number) => Shape,
  array: (shape: Shape, countX: number, countY?: number, countZ?: number, spacing?: number) => Shape
}
```

**Usage:**
```typescript
const cube = Shape.cube(20);
const filleted = cube.fillet(2);
const array = cube.array(3, 2, 1, 25);
```

### 3. OpenSCAD Functions

Custom functions available in OpenSCAD scripts.

```typescript
scadFunctions: {
  calc_gear_params: (module: number, teeth: number) => object,
  golden_ratio: () => number,
  fibonacci: (n: number) => number[]
}
```

**OpenSCAD Usage:**
```openscad
// Using plugin functions in OpenSCAD
params = calc_gear_params(2, 20);
phi = golden_ratio();
fib = fibonacci(10);
```

### 4. File Handlers

Custom import/export formats for CAD files.

```typescript
fileHandlers: [
  {
    name: 'STL Export',
    extensions: ['.stl'],
    export: (shape: Shape) => ArrayBuffer
  },
  {
    name: 'OBJ Import',
    extensions: ['.obj'],
    import: (data: string) => Shape
  }
]
```

### 5. Viewport Extensions

Custom rendering effects and controls for the 3D viewport.

```typescript
viewportExtensions: [
  {
    name: 'Custom Material',
    type: 'renderer',
    initialize: (viewport) => { /* setup */ },
    render: (context) => { /* custom rendering */ },
    cleanup: () => { /* cleanup */ }
  }
]
```

## Plugin Discovery and Loading

### Automatic Discovery

The plugin system automatically discovers plugins in:
- `./plugins` directory
- npm packages with naming conventions:
  - `@moicad/plugin-*`
  - `*-moicad-plugin`
  - `moicad-plugin-*`

### Manual Loading

```typescript
import { loadPlugin, pluginManager } from '@moicad/sdk';

// Load from file path
await loadPlugin('./plugins/my-plugin.js');

// Load from npm package
await loadPlugin('@moicad/plugin-advanced-geometry');

// Load plugin object directly
await loadPlugin(myPluginObject);
```

### Plugin Configuration

```typescript
import { pluginManager } from '@moicad/sdk';

// Enable/disable plugins
pluginManager.setPluginEnabled('my-plugin', true);
const isEnabled = pluginManager.isPluginEnabled('my-plugin');

// Configure plugin settings
pluginManager.setPluginConfig('my-plugin', {
  enabled: true,
  priority: 10,
  settings: {
    defaultSize: 20,
    quality: 'high'
  }
});
```

## Hooks and Events

The plugin system provides hooks at key points in the CAD pipeline:

### Available Hooks

- `shape.create` - Before creating a primitive
- `shape.create.after` - After creating a primitive
- `transform.apply` - Before applying a transform
- `transform.apply.after` - After applying a transform
- `geometry.compute` - Before CSG operations
- `file.import` - During file import
- `file.export` - During file export
- `scad.parse` - During OpenSCAD parsing
- `scad.evaluate` - During OpenSCAD evaluation
- `viewport.render` - Before 3D rendering
- `viewport.render.after` - After 3D rendering

### Using Hooks

```typescript
export const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  async initialize(manager) {
    // Register hook listeners
    manager.addHook('shape.create', (type, ...args) => {
      console.log(`Creating shape: ${type}`, args);
    });
    
    manager.addHook('transform.apply', (type, shape, ...args) => {
      console.log(`Applying transform: ${type}`, args);
    });
  }
};
```

## Plugin Development Best Practices

### 1. Error Handling

```typescript
primitives: {
  safeOperation: (param: number) => {
    try {
      return Shape.cube(param);
    } catch (error) {
      console.error('Error in safeOperation:', error);
      return Shape.cube(10); // fallback
    }
  }
}
```

### 2. Input Validation

```typescript
import { z } from 'zod';

const paramSchema = z.number().positive().max(100);

primitives: {
  validatedPrimitive: (size: number) => {
    const validated = paramSchema.parse(size);
    return Shape.cube(validated);
  }
}
```

### 3. Performance Considerations

```typescript
// Cache expensive operations
const cache = new Map();

primitives: {
  cachedOperation: (param: number) => {
    const key = `cached-${param}`;
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = expensiveOperation(param);
    cache.set(key, result);
    return result;
  }
}
```

### 4. Async Operations

```typescript
primitives: {
  asyncPrimitive: async (text: string) => {
    const processed = await processText(text);
    return Shape.text(processed);
  }
}
```

## Plugin Dependencies

```typescript
export const myPlugin: Plugin = {
  name: 'my-advanced-plugin',
  version: '1.0.0',
  dependencies: ['@moicad/plugin-basic-geometry'],
  
  async initialize(manager) {
    // Ensure dependencies are loaded
    const dep = manager.getPlugin('@moicad/plugin-basic-geometry');
    if (!dep) {
      throw new Error('Required dependency not found');
    }
  }
};
```

## Testing Plugins

```typescript
import { pluginManager } from '@moicad/sdk';
import myPlugin from './my-plugin';

describe('MyPlugin', () => {
  beforeEach(async () => {
    await pluginManager.loadPlugin(myPlugin);
  });

  afterEach(() => {
    pluginManager.unregister('my-plugin');
  });

  test('creates custom shape', () => {
    const shape = Shape.myCustomShape(10);
    expect(shape.getVolume()).toBeCloseTo(1000);
  });
});
```

## Publishing Plugins

### Package.json Setup

```json
{
  "name": "@moicad/plugin-my-plugin",
  "version": "1.0.0",
  "keywords": ["moicad", "plugin", "cad"],
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@moicad/sdk": "^0.1.0"
  }
}
```

### Plugin Structure

```
my-plugin/
├── src/
│   ├── index.ts        # Main plugin export
│   ├── primitives.ts   # Custom primitives
│   ├── transforms.ts   # Custom transforms
│   └── utils.ts       # Helper functions
├── examples/
│   └── usage.ts        # Example usage
├── package.json
└── README.md
```

## Examples

### Complete Plugin Example

See `examples/example-plugin.ts` for a comprehensive plugin demonstrating all extension types including:
- Custom primitives (torus, spring, gear)
- Custom transforms (fillet, chamfer, array)
- OpenSCAD functions (gear calculations, math helpers)
- Lifecycle hooks
- Error handling and validation

### Test the Plugin System

Run the test script to see the plugin system in action:

```bash
npm run test:plugins
# or
bun run examples/test-plugin-system.ts
```

## API Reference

### Core Classes

- `PluginManager` - Main plugin registry and management
- `PluginDiscovery` - Automatic plugin discovery
- `PluginLoader` - Plugin loading utilities

### Core Functions

- `loadPlugin(source)` - Load a plugin from various sources
- `initializePlugins()` - Initialize the plugin system
- `pluginManager.getPlugin(name)` - Get a specific plugin
- `pluginManager.getAllPlugins()` - Get all registered plugins
- `pluginManager.executeHook(name, ...args)` - Execute a hook

### Configuration Options

- Plugin priority for hook execution order
- Enable/disable individual plugins
- Plugin-specific settings
- Dependency resolution

## Troubleshooting

### Common Issues

1. **Plugin not found**: Check naming conventions and paths
2. **Type errors**: Ensure proper TypeScript types are exported
3. **Hook not executing**: Verify plugin is enabled and properly initialized
4. **Performance issues**: Check for expensive operations in hooks

### Debug Information

```typescript
import { pluginManager } from '@moicad/sdk';

// List all plugins
console.log('Registered plugins:', pluginManager.getAllPlugins());

// Check plugin status
console.log('Enabled plugins:', 
  pluginManager.getAllPlugins()
    .filter(p => pluginManager.isPluginEnabled(p.name))
    .map(p => p.name)
);

// Get available primitives
console.log('Available primitives:', Object.keys(pluginManager.getPrimitives()));
```

This plugin system provides a solid foundation for extending the moicad SDK with custom functionality while maintaining compatibility with the existing API.