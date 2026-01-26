# Test Suite Organization

This directory contains the organized test suite for the moicad project, designed to ensure 98-99% OpenSCAD compatibility.

## 📁 Directory Structure

### `tests/unit/`
Unit tests for individual components and features.

- **`primitives/`** - Tests for basic shapes (cube, sphere, cylinder, etc.)
- **`transformations/`** - Tests for transformations (translate, rotate, scale, etc.)
- **`boolean-ops/`** - Tests for CSG operations (union, difference, intersection, hull)
- **`language/`** - Tests for language features (variables, functions, modules, conditionals)
- **`advanced/`** - Tests for advanced features (2D operations, modifiers, text, etc.)

### `tests/integration/`
Integration tests for API endpoints and complex workflows.

- **`api/`** - Tests for REST API endpoints (`/api/parse`, `/api/evaluate`, `/api/export`)
- **`imports/`** - Tests for file import functionality (`include`, `use`, `import`)
- **`complex-workflows/`** - Tests for complex parametric designs and nested modules

### `tests/performance/`
Performance benchmarks and optimization tests.

- **`benchmarks/`** - Performance benchmarks for parser, evaluator, and WASM engine
- **`optimization/`** - Tests for hot-path optimizations
- **`memory/`** - Memory usage and leak detection tests

### `tests/e2e/`
End-to-end tests for the complete user experience.

- **`ui/`** - Tests for UI interactions, viewport, and menu systems
- **`workflows/`** - Tests for complete CAD workflows and file operations

### `tests/fixtures/`
Test assets and data files.

- **`scad-files/`** - OpenSCAD test files organized by type
  - `primitives/` - Basic shape test files
  - `modules/` - Module and function test files
  - `imports/` - File import test files
  - `complex-examples/` - Complex parametric designs
- **`expected-outputs/`** - Expected output files (STL, OBJ, JSON)
- **`data/`** - Test data and configuration files

### `tests/validation/`
Preserved existing validation framework with comprehensive test coverage by feature category.

### `tests/scripts/`
Test automation and utility scripts.

### `tests/utils/`
Test utilities, helpers, and mock objects.

## 🚀 Running Tests

### Quick Test
```bash
bun run tests/scripts/quick-test.sh
```

### Unit Tests
```bash
# Run all unit tests
bun test tests/unit/

# Run specific unit test category
bun test tests/unit/primitives/
bun test tests/unit/boolean-ops/
```

### Integration Tests
```bash
# Run API tests
bun test tests/integration/api/

# Run import tests
bun test tests/integration/imports/
```

### Performance Tests
```bash
# Run benchmarks
bash tests/performance/benchmarks/test-performance.sh

# Run optimization tests
bash tests/performance/optimization/test-optimizations.sh
```

### E2E Tests
```bash
# Run UI tests
bash tests/e2e/ui/test-menu-system.sh

# Run workflow tests
bun test tests/e2e/workflows/
```

### Validation Suite
```bash
# Run comprehensive validation
node tests/validation/test-runner.js
```

## 📊 Test Coverage

The test suite covers:
- ✅ **98-99% OpenSCAD Compatibility**
- ✅ **All Primitives** (cube, sphere, cylinder, cone, circle, square, polygon, polyhedron, text)
- ✅ **All Transformations** (translate, rotate, scale, mirror, multmatrix)
- ✅ **All CSG Operations** (union, difference, intersection, hull, minkowski)
- ✅ **2D Operations** (linear_extrude, rotate_extrude, offset, resize)
- ✅ **Language Features** (variables, functions, modules, conditionals, loops, expressions)
- ✅ **Built-in Functions** (math, array, string functions)
- ✅ **OpenSCAD Modifiers** (# debug, % transparent, ! root, * disable)
- ✅ **File Imports** (include, use, import with library path resolution)
- ✅ **Special Variables** ($fn, $fa, $fs, $t, $vpr, $vpt, $vpd, $vpf, $preview)
- ✅ **Interactive Features** (hover highlighting, click selection, multi-select)

## 🔧 Test Configuration

### Test Environment
- **Runtime**: Bun
- **Framework**: Jest for JavaScript/TypeScript tests
- **Shell Tests**: Bash scripts for performance and UI tests
- **WASM**: Rust CSG engine integration

### Mock Configuration
Test utilities in `tests/utils/` provide:
- Mock WASM engine for isolated testing
- Geometry comparison helpers
- Test data generators
- Assertion helpers specific to CAD operations

## 📈 Performance Targets

- **Parse Time**: <50ms for typical files
- **Evaluation Time**: <100ms for typical geometries
- **WASM Compilation**: <3 seconds initial load
- **WebSocket Latency**: <50ms for real-time updates

## 🐛 Debugging Tests

### Running Tests in Debug Mode
```bash
# With verbose output
bun test --verbose tests/unit/primitives/test-cube.ts

# With debugger
node --inspect-brk tests/unit/primitives/test-cube.ts
```

### Test Output Locations
- **STL Outputs**: `tests/fixtures/expected-outputs/stl/`
- **Debug Logs**: `tests/fixtures/data/debug-logs/`
- **Validation Reports**: `tests/validation/reports/`

## 🔄 Continuous Integration

### CI Pipeline Stages
1. **Unit Tests** - Fast feedback on individual components
2. **Integration Tests** - API and workflow validation
3. **Performance Tests** - Benchmarks and regression detection
4. **E2E Tests** - Complete user experience validation
5. **Validation Suite** - Comprehensive OpenSCAD compatibility check

### Test Matrix
- **Node.js**: Latest LTS
- **Bun**: Latest stable
- **WASM**: Chrome/Firefox/Safari compatibility

## 📝 Contributing to Tests

### Adding New Tests
1. Choose appropriate category (unit/integration/e2e)
2. Follow naming conventions (`test-*.ts` for TypeScript, `test-*.js` for JavaScript)
3. Use existing test utilities and helpers
4. Add test fixtures to appropriate `tests/fixtures/` subdirectory
5. Update this README if adding new test categories

### Test Naming Conventions
- **Unit Tests**: `test-[feature].ts` (e.g., `test-cube.ts`, `test-union.ts`)
- **Integration Tests**: `test-[workflow].ts` (e.g., `test-file-imports.ts`)
- **Performance Tests**: `test-[metric].sh` (e.g., `test-performance.sh`)
- **Fixtures**: Descriptive names (e.g., `text-alignment.scad`)

### Test Best Practices
- Write isolated tests that don't depend on other tests
- Use descriptive test names and comments
- Include both positive and negative test cases
- Test edge cases and error conditions
- Validate both functionality and performance
- Include OpenSCAD compatibility examples in tests

---

## 📊 Migration Summary

This reorganization consolidates **47 scattered test files** into a structured, maintainable test suite:

- **24 test files** → Organized by type in `unit/`, `integration/`, `performance/`, `e2e/`
- **6 shell scripts** → Organized in `performance/` and `e2e/` with proper categorization
- **13 test assets** → Organized in `fixtures/` with clear subdirectories
- **1 existing validation suite** → Preserved and integrated as `validation/`

The new structure supports:
- ✅ **Clear separation** of test types
- ✅ **Easy maintenance** and discovery
- ✅ **Scalable** for new test categories  
- ✅ **CI/CD ready** with staged testing
- ✅ **Developer friendly** for new contributors

This organized test suite ensures the moicad project maintains its 98-99% OpenSCAD compatibility while providing a solid foundation for future development and validation.