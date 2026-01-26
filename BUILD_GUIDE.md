# Build Guide - moicad

Complete guide for building and running moicad CAD engine.

## Prerequisites

- **Bun** v1.0+ ([install](https://bun.sh))
- **Node.js** v18+ (for frontend)
- **Git** (for cloning)

Optional:
- **Rust** + **Cargo** (for Tauri desktop app)

## Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/moicad.git
cd moicad

# Install dependencies
bun install
cd frontend && npm install && cd ..

# Start development servers
bun run dev:all

# Backend: http://localhost:42069
# Frontend: http://localhost:3002
```

## Development Mode

### Backend Server (Bun)

```bash
# Start with hot reload
bun run dev

# Server runs at http://localhost:42069
# Auto-reloads on file changes
# Exposes garbage collection for memory management
```

**API Endpoints**:
- POST `/api/parse` - Parse OpenSCAD code
- POST `/api/evaluate` - Evaluate to 3D geometry
- POST `/api/export` - Export STL/OBJ
- WS `/ws` - Real-time WebSocket
- WS `/ws/mcp` - MCP server for AI integration
- GET `/health` - Health check

### Frontend (Next.js)

```bash
# Start Next.js dev server
bun run dev:frontend

# Frontend runs at http://localhost:3002
# Auto-reloads on file changes
# Hot module replacement enabled
```

### Run Both Concurrently

```bash
# Starts backend + frontend together
bun run dev:all
```

## Production Build

### Build Frontend

```bash
# Build optimized frontend bundle
bun run build

# Output: frontend/.next/
```

### Start Production Server

```bash
# Start backend in production mode
bun run start

# Serves at http://localhost:42069
# Frontend can be served via static file server or Vercel
```

## Testing

### Quick Test

```bash
# Run smoke tests (~30 seconds)
bun run test:quick
```

### Comprehensive Tests

```bash
# All test suites
bun run test:all

# Individual suites
bun run test:unit          # Unit tests
bun run test:integration   # API tests
bun run test:performance   # Benchmarks
bun run test:validation    # OpenSCAD compatibility
```

### Test Organization

```
tests/
├── unit/               # Unit tests by feature
│   ├── primitives/    # Cube, sphere, cylinder
│   ├── transformations/ # Translate, rotate, scale
│   ├── boolean-ops/   # Union, difference, intersection
│   └── language/      # Variables, functions, modules
├── integration/       # API endpoint tests
├── performance/       # Benchmarks
└── validation/        # OpenSCAD compatibility
```

## Tauri Desktop App (Optional)

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add targets (if cross-compiling)
rustup target add aarch64-apple-darwin      # macOS ARM
rustup target add x86_64-pc-windows-msvc    # Windows
rustup target add x86_64-unknown-linux-gnu  # Linux
```

### Development

```bash
# Start Tauri dev mode (opens native window)
bun run tauri:dev
```

### Build Executables

```bash
# Build for current platform
bun run tauri:build

# Cross-platform builds
bun run tauri:build:mac     # macOS (ARM/Intel)
bun run tauri:build:win     # Windows
bun run tauri:build:linux   # Linux

# Output: src-tauri/target/release/
```

## MCP Server (AI Integration)

### Setup for Claude Desktop

1. **Start moicad backend**:
```bash
bun run dev
```

2. **Configure Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "moicad": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moicad/backend/index.ts"],
      "env": {
        "MCP_ENABLED": "true"
      }
    }
  }
}
```

3. **Restart Claude Desktop**

4. **Test MCP connection**:
   - Ask Claude: "Can you evaluate this OpenSCAD code: cube(10);"
   - Claude will use moicad MCP server to generate geometry

### MCP Tools Available

- `evaluate_scad`: Evaluate OpenSCAD code → geometry
- `parse_scad`: Parse code → AST
- `export_geometry`: Export to STL/OBJ
- `list_examples`: Get example files
- `get_documentation`: OpenSCAD docs

## API Usage Examples

### Parse OpenSCAD Code

```bash
curl -X POST http://localhost:42069/api/parse \
  -H "Content-Type: application/json" \
  -d '{"code":"translate([5,0,0]) sphere(10);"}'
```

Response:
```json
{
  "ast": [
    {
      "type": "transform",
      "name": "translate",
      "params": {"v": [5, 0, 0]},
      "children": [...]
    }
  ],
  "errors": [],
  "success": true
}
```

### Evaluate to Geometry

```bash
curl -X POST http://localhost:42069/api/evaluate \
  -H "Content-Type": application/json" \
  -d '{"code":"cube(10);"}'
```

Response:
```json
{
  "geometry": {
    "vertices": [0, 0, 0, ...],
    "indices": [0, 1, 2, ...],
    "normals": [0, 0, 1, ...],
    "bounds": {
      "min": [0, 0, 0],
      "max": [10, 10, 10]
    },
    "stats": {
      "vertexCount": 8,
      "faceCount": 12,
      "volume": 1000
    }
  },
  "errors": [],
  "success": true,
  "executionTime": 15.2
}
```

### Export STL

```bash
curl -X POST http://localhost:42069/api/export \
  -H "Content-Type: application/json" \
  -d '{
    "geometry": {...},
    "format": "stl"
  }' \
  --output model.stl
```

### WebSocket Real-Time Evaluation

```javascript
const ws = new WebSocket('ws://localhost:42069/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'evaluate',
    code: 'cube(10);',
    requestId: 'test-1'
  }));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log('Geometry:', response.geometry);
};
```

## Environment Variables

```bash
# Backend Port (default: 42069)
PORT=42069

# Enable MCP server (default: false)
MCP_ENABLED=true

# Log level (default: info)
LOG_LEVEL=debug

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3002
```

## Troubleshooting

### Backend won't start

```bash
# Check if port is already in use
lsof -i :42069

# Kill existing process
pkill -f "bun.*backend/index.ts"

# Restart
bun run dev
```

### Frontend build fails

```bash
# Clear Next.js cache
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### Manifold-3d WASM errors

```bash
# Check manifold-3d installation
bun pm ls manifold-3d

# Reinstall if needed
bun remove manifold-3d
bun add manifold-3d@latest
```

### Tests failing

```bash
# Run with verbose output
bun test --verbose

# Run specific test file
bun test tests/unit/primitives/cube.test.ts
```

## Performance Optimization

### Backend

- **Garbage collection**: Enabled with `--expose-gc` flag
- **Memory limits**: 1GB default, increase if needed
- **Job queue**: Single-threaded for consistency
- **Caching**: Primitive geometry cached

### Frontend

- **Code splitting**: Automatic via Next.js
- **Three.js**: Uses BufferGeometry for efficiency
- **WebSocket**: Batches updates to reduce overhead
- **Monaco editor**: Lazy-loaded

## Debugging

### Backend Logs

```bash
# Check backend logs
tail -f backend.log

# Enable debug logging
LOG_LEVEL=debug bun run dev
```

### Frontend Logs

- Open browser console (F12)
- Check Network tab for API calls
- Check Console tab for errors

### Three.js Rendering

- Open browser console
- Type: `sceneRef.current.mesh` to inspect geometry
- Check vertex count, face count, bounds

## Project Structure

```
moicad/
├── backend/              # Bun server
│   ├── index.ts         # Main entry point
│   ├── scad-parser.ts   # OpenSCAD parser
│   ├── scad-evaluator.ts # AST evaluator
│   ├── manifold-*.ts    # Manifold-3d integration
│   └── mcp-server.ts    # MCP server
├── frontend/            # Next.js app
│   ├── app/            # Next.js 16 app directory
│   ├── components/     # React components
│   ├── lib/            # Three.js, API client
│   └── hooks/          # Custom hooks
├── shared/             # Shared TypeScript types
├── tests/              # Test suite
├── src-tauri/          # Tauri desktop app (optional)
├── package.json        # Root dependencies
├── bun.lockb           # Bun lock file
└── bunfig.toml         # Bun configuration
```

## Next Steps

- ✅ **Development ready** - Start coding!
- ✅ **Tests passing** - 98-99% OpenSCAD compatible
- ✅ **MCP integrated** - Claude Desktop can use moicad
- 🚀 **Build Tauri app** - Native desktop executable
- 🎨 **Custom features** - Extend OpenSCAD syntax

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [manifold-3d GitHub](https://github.com/elalish/manifold)
- [Three.js Documentation](https://threejs.org/docs/)
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [OpenSCAD Documentation](https://en.wikibooks.org/wiki/OpenSCAD_User_Manual)

---

**Happy Building! 🚀**
