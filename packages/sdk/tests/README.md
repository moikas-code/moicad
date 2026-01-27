# @moicad/sdk Tests

This directory contains unit tests for the @moicad/sdk package.

## Test Structure

```
tests/
├── geometry.test.ts     # Shape class and functional API tests
├── scad.test.ts         # OpenSCAD parsing and evaluation tests
├── viewport.test.ts     # 3D viewport and rendering tests
└── integration.test.ts  # Cross-module integration tests
```

## Running Tests

### From SDK directory
```bash
cd packages/sdk
bun test
```

### From root directory
```bash
bun test packages/sdk
```

## Test Coverage

- **Geometry Creation**: Tests Shape class, functional API, CSG operations
- **OpenSCAD Support**: Tests parsing, evaluation, error handling
- **Viewport Module**: Tests 3D rendering, geometry updates, disposal
- **Integration**: Tests cross-module compatibility and consistency

All tests use Bun's test runner and mock DOM environment for viewport tests where needed.