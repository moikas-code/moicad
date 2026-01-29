# @moicad/cli

Command-line interface for moicad - Modern JavaScript CAD Platform

## Installation

```bash
# Global installation (recommended)
npm install -g @moicad/cli

# Or with bun
bun install -g @moicad/cli
```

## Usage

```bash
# Launch web UI
moicad

# Open a specific file
moicad design.scad

# Development mode (hot reload)
moicad --dev

# Specify port
moicad --port 3001

# Disable auto-open browser
moicad --no-open

# Update to latest version
moicad --update

# Show version
moicad --version

# Show help
moicad --help
```

## Development

### Building the CLI

The CLI bundles the entire web app for standalone distribution:

```bash
# Full build (includes app bundling)
bun run build

# Quick build (CLI only, no app bundling)
bun run build:quick

# Development (no bundling)
bun run dev
```

### How it Works

**Production Mode** (after `npm install -g @moicad/cli`):
- CLI is installed to `node_modules/@moicad/cli/`
- Contains bundled app in `app-bundle/` directory
- Runs pre-built Next.js app (`bun run start`)

**Development Mode** (in monorepo):
- Auto-detects monorepo structure
- Uses live app from `packages/app/`
- Runs Next.js dev server (`bun run dev`)

### Publishing to npm

1. **Build the package** (this bundles the app):
   ```bash
   cd packages/cli
   bun run build
   ```

2. **Test locally** before publishing:
   ```bash
   # Link locally
   npm link

   # Test the command
   moicad

   # Unlink when done testing
   npm unlink -g @moicad/cli
   ```

3. **Publish to npm**:
   ```bash
   npm version patch  # or minor/major
   npm publish
   ```

### Package Contents

When published, the package includes:
- `dist/` - Compiled CLI code
- `app-bundle/` - Pre-built Next.js app
  - `.next/` - Next.js build output
  - `public/` - Static assets
  - `node_modules/` - Production dependencies
  - `package.json`, `next.config.js` - App configuration

Total package size: ~50-100 MB (includes Next.js + Three.js + Monaco)

## Architecture

```
@moicad/cli (when installed globally)
├── dist/
│   └── index.js          # CLI entry point (bun executable)
├── app-bundle/
│   ├── .next/            # Pre-built Next.js app
│   ├── public/           # Static assets
│   ├── node_modules/     # App dependencies
│   └── package.json      # App config
└── package.json          # CLI config
```

The CLI detects whether to use:
- **Bundled app** (`app-bundle/`) - when installed via npm
- **Monorepo app** (`../app/`) - when running in development

## License

MIT
