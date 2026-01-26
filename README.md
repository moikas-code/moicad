# moicad - Modern OpenSCAD CAD Engine

A high-performance, web-based OpenSCAD clone built with modern JavaScript technologies and powered by manifold-3d for guaranteed manifold geometry.

## 🚀 Architecture

**Clean Bun Monorepo**

```
moicad/
├── backend/              # Bun server (REST API + WebSocket + MCP)
│   ├── index.ts         # Main server entry point
│   ├── scad-parser.ts   # OpenSCAD parser (tokenizer + AST)
│   ├── scad-evaluator.ts # AST evaluator
│   ├── manifold-*.ts    # Manifold-3d CSG engine integration
│   └── mcp-server.ts    # MCP server for AI integration
├── frontend/            # Next.js React app
│   ├── app/            # Next.js 16 app directory
│   ├── components/     # React components
│   ├── lib/            # Three.js viewport, API client
│   └── hooks/          # Custom React hooks
├── shared/             # Shared TypeScript types
├── src-tauri/          # Tauri desktop app (optional)
└── tests/              # Comprehensive test suite

Tech Stack:
- Runtime: Bun (TypeScript/JavaScript)
- CSG Engine: manifold-3d (WebAssembly)
- Backend: REST API + WebSocket + MCP
- Frontend: Next.js 16 + React + Three.js
- Desktop: Tauri (optional)
```

## ✨ Features

### OpenSCAD Compatibility (98-99%)

**Primitives**
- ✅ cube, sphere, cylinder, cone
- ✅ circle, square, polygon, polyhedron
- ✅ text (ASCII characters, basic Latin)
- ✅ surface (heightmap import)

**Transformations**
- ✅ translate, rotate, scale, mirror
- ✅ multmatrix (4x4 custom transforms)

**CSG Operations**
- ✅ union, difference, intersection
- ✅ hull (convex hull)
- ✅ minkowski (Minkowski sum)

**2D Operations**
- ✅ linear_extrude, rotate_extrude
- ✅ offset (expand/contract polygons)
- ✅ projection (3D → 2D)

**Language Features**
- ✅ Variables, functions, modules
- ✅ Conditionals (if/else), loops (for)
- ✅ Expressions, operators (arithmetic, logical, ternary)
- ✅ List comprehensions
- ✅ Built-in functions (math, array, string)
- ✅ File imports (include, use)
- ✅ Special variables ($fn, $fa, $fs, $t, $vpr, $vpt, $preview, etc.)
- ✅ OpenSCAD modifiers (#, %, !, *)

**Interactive Features**
- ✅ Real-time hover highlighting
- ✅ Click selection, multi-select
- ✅ Code-to-geometry mapping
- ✅ Professional Blender-style UI

### AI Integration (MCP Server)

**Model Context Protocol (MCP)**
- Expose moicad as an MCP server for Claude Desktop
- AI agents can evaluate OpenSCAD code
- Real-time geometry generation from natural language
- Integration with other AI tools

## 🛠️ Quick Start

### Prerequisites
- [Bun](https://bun.sh) v1.0+
- Node.js v18+ (for frontend)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/moicad.git
cd moicad

# Install dependencies
bun install
cd frontend && npm install && cd ..
```

### Development

```bash
# Start backend server (http://localhost:42069)
bun run dev

# Start frontend (http://localhost:3002) - in another terminal
bun run dev:frontend

# Or run both concurrently
bun run dev:all
```

### Build for Production

```bash
# Build frontend
bun run build

# Start production server
bun run start
```

### Testing

```bash
# Quick test
bun run test:quick

# Run all tests
bun run test:all

# Unit tests only
bun run test:unit

# Integration tests
bun run test:integration

# Performance benchmarks
bun run test:performance
```

## 📡 API Endpoints

### REST API

**POST /api/parse**
Parse OpenSCAD code to AST.
```json
Request: { "code": "cube(10);" }
Response: { "ast": [...], "errors": [], "success": true }
```

**POST /api/evaluate**
Parse and evaluate to 3D geometry.
```json
Request: { "code": "sphere(10);" }
Response: {
  "geometry": {
    "vertices": [...],
    "indices": [...],
    "normals": [...],
    "bounds": { "min": [...], "max": [...] },
    "stats": { "vertexCount": N, "faceCount": N, "volume": V }
  },
  "errors": [],
  "success": true,
  "executionTime": 45.2
}
```

**POST /api/export**
Export geometry to STL or OBJ.
```json
Request: { "geometry": {...}, "format": "stl" }
Response: Binary STL file
```

### WebSocket

**WS /ws**
Real-time code evaluation.
```json
Client → Server: { "type": "evaluate", "code": "cube(10);", "requestId": "abc123" }
Server → Client: { "type": "evaluate_response", "requestId": "abc123", "geometry": {...} }
```

### MCP Server

**WS /ws/mcp**
Model Context Protocol for AI integration.

Claude Desktop can connect to moicad as an MCP server to evaluate OpenSCAD code and generate geometry.

## 🔧 Configuration

### MCP Server Setup (Claude Desktop)

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "moicad": {
      "command": "bun",
      "args": ["run", "/path/to/moicad/backend/index.ts"],
      "env": {
        "MCP_ENABLED": "true"
      }
    }
  }
}
```

Now Claude can generate 3D models by writing OpenSCAD code!

### Tauri Desktop App (Optional)

```bash
# Start Tauri development mode
bun run tauri:dev

# Build desktop executable
bun run tauri:build
```

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Developer guide for AI agents
- [BUILD_GUIDE.md](./BUILD_GUIDE.md) - Detailed build instructions
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Feature implementation status
- [MANIFOLD_MIGRATION_COMPLETE.md](./MANIFOLD_MIGRATION_COMPLETE.md) - Manifold-3d migration details

## 🎯 Key Design Decisions

**Why manifold-3d?**
- Guaranteed manifold output (no topology errors)
- Robust Boolean operations (replaces custom BSP tree)
- High performance with parallel processing
- Clean geometry eliminates rendering artifacts

**Why Bun?**
- Fast TypeScript/JavaScript runtime
- Built-in package manager
- Native WebSocket support
- Hot module reloading

**Why Three.js (not custom WebGL)?**
- Manifold-3d provides clean geometry
- No BSP artifacts = no custom renderer needed
- Standard Three.js works perfectly
- Better ecosystem and community support

**Why MCP server?**
- AI-assisted CAD design
- Natural language → 3D models
- Integration with Claude Desktop and other AI tools
- Future: Multi-agent collaborative design

## 🧪 Testing

Comprehensive test suite with 98-99% OpenSCAD compatibility:

- **Unit tests**: Primitives, transformations, CSG operations, language features
- **Integration tests**: API endpoints, WebSocket, file imports
- **Performance benchmarks**: Rendering speed, memory usage
- **Validation tests**: OpenSCAD compatibility verification

## 🤝 Contributing

Contributions welcome! Please read [COLLABORATION_GUIDE.md](./COLLABORATION_GUIDE.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- [OpenSCAD](https://openscad.org/) - The original inspiration
- [manifold-3d](https://github.com/elalish/manifold) - Robust CSG geometry engine
- [Three.js](https://threejs.org/) - 3D rendering library
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Model Context Protocol](https://modelcontextprotocol.io/) - AI integration standard

---

**Built with ❤️ using modern JavaScript technologies**
