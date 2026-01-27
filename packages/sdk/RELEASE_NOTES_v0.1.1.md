# @moicad/sdk v0.1.1 - Runtime Module Release

## 🚀 What's New

### Runtime Module (`@moicad/sdk/runtime`)
- **JavaScript Code Evaluation**: Execute user-provided JavaScript code safely
- **Security Sandbox**: Restricted imports, timeout protection, code validation
- **ES6 Import Support**: Named, namespace, and default imports
- **Dual API Access**: Both Shape (fluent) and functional APIs available
- **Browser & Node Compatible**: Works in all environments

## 📦 Installation

```bash
npm install @moicad/sdk@0.1.1
```

## 🎯 New Runtime Usage

```javascript
import { evaluateJavaScript, JavaScriptRuntime } from '@moicad/sdk/runtime';

// Basic evaluation
const result = await evaluateJavaScript(`
  import { Shape } from '@moicad/sdk';
  export default Shape.cube(10).union(Shape.sphere(5));
`);

if (result.success) {
  console.log('Geometry created:', result.geometry.vertices.length);
}

// Advanced with security
const runtime = new JavaScriptRuntime({ 
  timeout: 5000,
  allowedModules: ['@moicad/sdk']
});

const validation = runtime.validateCode(code);
if (validation.isValid) {
  const result = await runtime.evaluate(code);
}
```

## 🛡️ Security Features

- **Restricted Imports**: Only `@moicad/sdk` modules allowed
- **Timeout Protection**: Prevents infinite loops (configurable)
- **Code Validation**: Detects dangerous patterns (`eval`, `fetch`, etc.)
- **Memory Limits**: Configurable memory usage constraints

## 📚 Full Documentation

See [JAVASCRIPT_API.md](../JAVASCRIPT_API.md#runtime-module) for complete API reference.

## 🔧 Breaking Changes

None - fully backward compatible with v0.1.0

## 🐛 Bug Fixes

- Improved error handling in runtime module
- Fixed timeout behavior in AsyncFunction execution
- Enhanced TypeScript type definitions

---

**Perfect for**: Web-based CAD editors, plugin systems, educational platforms, online CAD playgrounds