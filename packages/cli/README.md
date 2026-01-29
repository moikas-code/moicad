# @moicad/cli

Command-line interface for moicad - Modern JavaScript CAD Platform.

Provides a local web UI, headless build tools, and API server for CAD operations.

## Installation

### Global Install (Recommended)

```bash
npm install -g @moicad/cli
# or
bun add -g @moicad/cli
```

### Local Install

```bash
npm install @moicad/cli
# or
bun add @moicad/cli
```

## Quick Start

```bash
# Launch web UI (opens browser at localhost:42069)
moicad

# Start server without opening browser
moicad serve

# Compile a file to JSON
moicad build model.scad

# Export to STL
moicad export model.scad -f stl

# Initialize new project
moicad init my-project
```

## Commands

### `moicad` or `moicad launch [file]`

Starts the local web server and opens the browser.

```bash
# Launch with default file
moicad

# Open specific file
moicad launch cube.scad

# Custom port
moicad launch --port 3000
```

**Options:**
- `--port, -p <number>` - Server port (default: 42069)
- `--host <string>` - Bind host (default: localhost)
- `--no-open` - Don't open browser automatically

### `moicad serve`

Starts the API server without opening a browser. Useful for:
- Running as a background service
- Using with external tools
- API-only mode

```bash
# Start server on default port
moicad serve

# Custom port and host
moicad serve --port 8080 --host 0.0.0.0
```

**Options:**
- `--port, -p <number>` - Server port (default: 42069)
- `--host <string>` - Bind host (default: localhost)

### `moicad build <file> [options]`

Compiles OpenSCAD or JavaScript code to geometry JSON (headless).

```bash
# Build to stdout
moicad build model.scad

# Save to file
moicad build model.scad -o output.json

# JavaScript file
moicad build model.js

# With animation (specify time value)
moicad build animation.scad -t 0.5
```

**Options:**
- `-o, --output <file>` - Output file path
- `-t, --time <number>` - Animation time value (0-1)
- `--pretty` - Pretty-print JSON output
- `--stats` - Include geometry statistics

**Output Format:**
```json
{
  "geometry": {
    "vertices": [...],
    "indices": [...],
    "normals": [...],
    "bounds": { "min": [x,y,z], "max": [x,y,z] },
    "stats": {
      "vertexCount": 1234,
      "faceCount": 567,
      "volume": 1000.5
    }
  },
  "success": true,
  "executionTime": 45.2
}
```

### `moicad export <file> [options]`

Exports geometry to STL, OBJ, or other formats.

```bash
# Export to STL
moicad export model.scad -f stl

# Custom output filename
moicad export model.scad -f stl -o custom-name.stl

# Export to OBJ
moicad export model.js -f obj

# Animation frame export
moicad export animation.scad -f stl -t 0.5 -o frame-50.stl
```

**Options:**
- `-f, --format <format>` - Output format (stl, obj) [required]
- `-o, --output <file>` - Output filename
- `-t, --time <number>` - Animation time value (0-1)
- `--ascii` - Use ASCII STL format (default: binary)

### `moicad init [name]`

Creates a new moicad project with starter files.

```bash
# Create project in current directory
moicad init

# Create project in new directory
moicad init my-cad-project

# With template
moicad init my-project --template javascript
```

**Options:**
- `--template <name>` - Project template (openscad, javascript, typescript)
- `--no-install` - Skip dependency installation

**Generated Structure:**
```
my-project/
├── package.json
├── README.md
├── models/
│   ├── example.scad
│   └── example.js
└── .gitignore
```

### `moicad --version`

Shows version information.

```bash
moicad --version
# moicad CLI v0.1.0
# SDK v0.1.10
```

### `moicad --update`

Updates moicad to the latest version.

```bash
moicad --update
```

## API Server

When running `moicad launch` or `moicad serve`, a local API server starts with these endpoints:

### `POST /api/evaluate`

Evaluates OpenSCAD or JavaScript code to geometry.

**Request:**
```json
{
  "code": "cube(10);",
  "language": "openscad",
  "t": 0.5  // Optional: animation time (0-1)
}
```

**Response:**
```json
{
  "geometry": { /* ... */ },
  "success": true,
  "errors": [],
  "executionTime": 45.2
}
```

### `POST /api/parse`

Parses OpenSCAD code to AST.

**Request:**
```json
{
  "code": "sphere(5);"
}
```

**Response:**
```json
{
  "ast": [ /* ... */ ],
  "success": true,
  "errors": []
}
```

### `POST /api/export`

Exports geometry to STL/OBJ format.

**Request:**
```json
{
  "geometry": { /* ... */ },
  "format": "stl"
}
```

**Response:** Binary file (application/octet-stream)

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

## Configuration

### Environment Variables

```bash
# Server port
MOICAD_PORT=42069

# Server host
MOICAD_HOST=localhost

# Log level
MOICAD_LOG_LEVEL=info
```

### Config File

Create `.moicadrc.json` in your project:

```json
{
  "port": 42069,
  "host": "localhost",
  "autoOpen": true,
  "editor": {
    "defaultLanguage": "openscad",
    "theme": "vs-dark"
  }
}
```

## Programmatic Usage

Use the CLI as a library in your Node/Bun scripts:

```typescript
import { createServer, evaluateFile, exportFile } from '@moicad/cli';

// Start server programmatically
const server = createServer({ port: 42069 });

// Evaluate file
const result = await evaluateFile('model.scad');
console.log(result.geometry);

// Export file
await exportFile('model.scad', 'output.stl', { format: 'stl' });
```

## Integration

### VS Code

Add to `.vscode/tasks.json`:

```json
{
  "label": "moicad: Build",
  "type": "shell",
  "command": "moicad build ${file}",
  "problemMatcher": []
}
```

### GitHub Actions

```yaml
- name: Install moicad
  run: npm install -g @moicad/cli

- name: Build models
  run: moicad build models/*.scad
```

### Docker

```dockerfile
FROM oven/bun:latest
RUN bun add -g @moicad/cli
EXPOSE 42069
CMD ["moicad", "serve", "--host", "0.0.0.0"]
```

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
moicad launch --port 3000
```

### Permission Denied (Global Install)

```bash
# Use sudo (macOS/Linux)
sudo npm install -g @moicad/cli

# Or use local install
npm install @moicad/cli
npx moicad launch
```

### GUI Not Loading

The CLI uses a minimal static HTML placeholder. For full GUI features:

```bash
# Use the web app (development mode)
cd apps/landing
bun run dev
```

Or visit the hosted version at [moicad.moikas.com](https://moicad.moikas.com)

## Development

```bash
# Clone repository
git clone https://github.com/moikas/moicad.git
cd moicad

# Install dependencies
bun install

# Build CLI
cd packages/cli
bun run build

# Link for local development
bun link

# Test CLI
moicad --version
```

## System Requirements

- **Node.js**: >= 18.0.0 (or Bun >= 1.0.0)
- **OS**: macOS, Linux, Windows
- **Memory**: 512MB+ recommended
- **Disk**: 50MB for installation

## License

MIT

## Links

- [GitHub Repository](https://github.com/moikas/moicad)
- [Documentation](https://moicad.moikas.com/docs)
- [Web App](https://moicad.moikas.com/app)
- [@moicad/sdk](https://www.npmjs.com/package/@moicad/sdk) - Core CAD engine
- [@moicad/gui](https://www.npmjs.com/package/@moicad/gui) - React components
- [Report Issues](https://github.com/moikas/moicad/issues)

## Related

- **OpenSCAD**: Compatible with OpenSCAD syntax
- **manifold-3d**: CSG engine used internally
- **Three.js**: 3D rendering library
