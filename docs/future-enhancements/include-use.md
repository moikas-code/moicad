# Include/Use File Operations - Future Enhancement

## Current Status

### What's Complete
- **Parser Support**: `import`, `include`, `use` keywords recognized
- **AST Generation**: ImportNode type defined in shared/types.ts
- **Basic Evaluator**: `evaluateImport()` function exists
- **File Detection**: Handles both <system> and "user" file formats

### What's Missing
- **File System Access**: No file loading implementation
- **Module Resolution**: No path resolution logic
- **Recursive Processing**: No dependency handling
- **Error Handling**: Basic file error management

## Implementation Tasks (2-3 days)

### Task 1: File System Integration (1 day)
```typescript
// Add file system access to evaluator
// Implement secure file path resolution
// Handle relative/absolute paths
// Add file caching for performance
```

### Task 2: Module Resolution (1 day)  
```typescript
// Implement OpenSCAD path resolution rules
// Handle library directories
// Support recursive includes
// Prevent circular dependencies
```

### Task 3: Content Integration (1 day)
```typescript
// Parse included file content
// Merge AST into current context
// Handle variable/module conflicts
// Preserve error locations across files
```

## Expected Behavior
```scad
// Include external file
include <utils.scad>;

// Use library functions  
use <NEMA17_screw>;

// Local file inclusion
include "custom_parts.scad";
```

## Security Considerations
- **Path Traversal**: Prevent access outside project directory
- **File Size Limits**: Prevent memory exhaustion
- **Infinite Recursion**: Detect circular includes
- **Permission Checks**: Validate file access rights

## File Resolution Rules
1. **Local files**: Relative to current file
2. **Library files**: System library directories
3. **User libraries**: User-defined library paths
4. **Built-in**: Default OpenSCAD libraries

## Priority: MEDIUM
- **Implementation Time**: 2-3 days
- **Impact**: Medium (modularity, code reuse)
- **Complexity**: Medium (file system, security)
- **Dependencies**: File system API access