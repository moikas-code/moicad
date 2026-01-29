# 📚 Auto-Updating Documentation System

## Overview

The moicad landing page now features a comprehensive auto-updating documentation system that automatically generates API documentation from the SDK source code.

## Features

✅ **Auto-Generated Documentation** - TypeDoc extracts API documentation directly from SDK source  
✅ **Live Updates** - Documentation automatically updates when SDK source changes  
✅ **Search Functionality** - Real-time search across all API methods  
✅ **Multi-API Support** - Fluent API, Functional API, Viewport, and OpenSCAD  
✅ **Consistent Design** - Matches landing page styling and UX  
✅ **Type Safe** - Full TypeScript support with proper types  

## Usage

### Development Mode (Auto-Updating)

Start the development server with automatic documentation updates:

```bash
npm run dev:docs
```

This will:
1. **Watch SDK Source** - Monitor `../sdk/src/` for changes
2. **Auto-Regenerate Docs** - Run TypeDoc on any file changes  
3. **Update Documentation** - Refresh docs page with new API data
4. **Hot Reload** - Automatically update the web interface

### Manual Documentation Generation

Generate documentation manually without watching:

```bash
# Generate JSON data for React components
npm run docs:generate

# Watch for changes only
npm run docs:watch
```

### Regular Development

Start regular development server without auto-updating docs:

```bash
npm run dev
```

## Documentation Structure

The `/docs` page provides comprehensive API documentation organized into:

### 📚 Overview
- Quick start guide with installation and basic usage
- Feature highlights and benefits
- Code examples for both APIs

### 🎨 Shape API (Fluent Interface)
- **Static Methods** - Factory functions (`Shape.cube()`, `Shape.sphere()`, etc.)
- **Instance Methods** - Chainable operations (`.union()`, `.translate()`, etc.)
- **Parameter Documentation** - Complete parameter types and descriptions
- **Code Examples** - Usage examples for each method

### ⚡ Functional API
- Pure function alternatives to fluent API
- `cube()`, `sphere()`, `union()`, `translate()`, etc.
- Function composition patterns
- Type-safe function signatures

### 🖼️ Viewport API  
- Three.js integration for 3D visualization
- `Viewport` class methods and configuration
- Interactive rendering options
- Performance monitoring

### 📐 OpenSCAD Support
- `parse()` and `evaluate()` functions
- OpenSCAD language compatibility (98-99%)
- AST manipulation and conversion
- Migration from existing OpenSCAD projects

## 🔄 Auto-Update Process

1. **File Detection** - File system watcher monitors SDK source
2. **TypeDoc Generation** - Runs `bun run docs:json` in SDK directory
3. **JSON Processing** - Converts TypeDoc output to React-compatible data
4. **Hot Reload** - Updates documentation page without full restart

## 🛠 Technical Implementation

### SDK Configuration
- **TypeDoc**: Installed with markdown plugin support
- **Entry Points**: Multiple entry points for all SDK modules
- **Output Format**: JSON for React component consumption
- **Source Links**: GitHub source code references in documentation

### Landing Page Integration
- **Dynamic Imports**: JSON data imported into React components
- **Type Safety**: TypeScript interfaces for TypeDoc data structure
- **Responsive Design**: Mobile-friendly navigation and content
- **Search**: Real-time filtering of API methods

### Build System
- **Development**: `npm run dev:docs` for auto-updating docs
- **Production**: Regular `npm run build` includes static documentation
- **CI/CD Ready**: Can be integrated with GitHub Actions

## 📁 File Structure

```
packages/landing/
├── app/
│   └── docs/
│       ├── page.tsx           # Main documentation page
│       ├── docs-data.json       # Generated TypeDoc data
│       └── json.d.ts          # TypeScript declaration
├── scripts/
│   ├── watch-docs.js          # SDK file watcher
│   └── dev-with-docs.js      # Dev server with docs
└── package.json               # Added documentation scripts
```

## 🎯 Benefits

### For Developers
- **Always Current** - Documentation never goes out of sync
- **Instant Updates** - See API changes immediately in development
- **Searchable** - Find methods quickly with live search
- **Type Safe** - Full TypeScript IntelliSense support
- **Consistent** - Single source of truth for API behavior

### For Users
- **Comprehensive** - Complete API reference with examples
- **User Friendly** - Organized by API type with clear navigation
- **Interactive** - Search, filtering, and responsive design
- **Accurate** - Generated directly from source code

### For Maintainers  
- **Automated** - No manual documentation updates needed
- **Versioned** - Can generate docs for different SDK versions
- **Integrated** - Part of standard development workflow
- **Reliable** - Reduces documentation drift and errors

## 🚀 Future Enhancements

- **[ ] Live Code Playground** - Interactive examples with actual SDK
- **[ ] API Versioning** - Show documentation for different versions
- **[ ] Enhanced Search** - Full-text search with highlighting
- **[ ] Dark/Light Theme** - Theme switching for documentation
- **[ ] Offline Support** - Downloadable documentation for offline use
- **[ ] CI/CD Integration** - Auto-deploy docs on SDK changes

---

This system represents **best practices** for documentation management in modern JavaScript/TypeScript projects.