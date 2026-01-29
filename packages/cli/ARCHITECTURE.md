# CLI Architecture

## Overview

The CLI is a self-contained launcher that bundles the entire web app for distribution via npm.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         @moicad/cli                             │
│                                                                 │
│  ┌──────────────┐                                              │
│  │ dist/        │  ← CLI executable (Bun/TypeScript)           │
│  │ index.js     │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         │ spawns                                               │
│         ↓                                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ app-bundle/                                              │ │
│  │                                                          │ │
│  │  ┌────────┐  ┌────────┐  ┌──────────────┐             │ │
│  │  │ .next/ │  │ public/│  │ node_modules/│             │ │
│  │  │        │  │        │  │              │             │ │
│  │  │ Build  │  │ Assets │  │ Dependencies │             │ │
│  │  └────────┘  └────────┘  └──────────────┘             │ │
│  │                                                          │ │
│  │  Next.js Production Server (port 3000)                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Path Resolution Flow

```
CLI Entry (dist/index.js)
         │
         ↓
    getAppPath()
         │
         ├─── Check: Does app-bundle/ exist?
         │
         ├─── YES (Production)
         │    └─→ Return: <cli-root>/app-bundle
         │        Command: bun run start
         │
         └─── NO (Development)
              └─→ Return: <monorepo-root>/moicad/packages/app
                   Command: bun run dev
```

## Build Pipeline

```
User runs: bun run build
         │
         ↓
┌────────────────────────────────────────────────────┐
│ prebuild hook: scripts/bundle-app.sh              │
├────────────────────────────────────────────────────┤
│                                                    │
│  1. cd packages/app                                │
│  2. bun run build       → Creates .next/          │
│  3. Copy files:                                    │
│     - .next/            → app-bundle/.next/        │
│     - public/           → app-bundle/public/       │
│     - package.json      → app-bundle/package.json  │
│     - next.config.js    → app-bundle/next.config.js│
│  4. bun install --production --cwd app-bundle/    │
│                                                    │
└────────────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────┐
│ build script: bun build src/index.ts              │
├────────────────────────────────────────────────────┤
│                                                    │
│  - Compile TypeScript                             │
│  - Output: dist/index.js                          │
│  - Make executable: chmod +x                      │
│                                                    │
└────────────────────────────────────────────────────┘
         │
         ↓
    ✅ Ready to publish
```

## Runtime Execution

### Development Mode

```
$ bun run dev
      │
      ↓
src/index.ts
      │
      ↓
launch.ts
      │
      ├─→ getAppPath() → moicad/packages/app
      ├─→ isDevMode() → true
      └─→ spawn(['bun', 'run', 'dev'], {
            cwd: moicad/packages/app,
            env: { NODE_ENV: 'development' }
          })
      │
      ↓
Next.js Dev Server (with hot reload)
Port: 3000 (or custom)
Opens: http://localhost:3000
```

### Production Mode (after npm install -g)

```
$ moicad
      │
      ↓
/usr/local/bin/moicad (symlink)
      │
      ↓
node_modules/@moicad/cli/dist/index.js
      │
      ↓
launch.ts
      │
      ├─→ getAppPath() → node_modules/@moicad/cli/app-bundle
      ├─→ isDevMode() → false
      └─→ spawn(['bun', 'run', 'start'], {
            cwd: node_modules/@moicad/cli/app-bundle,
            env: { NODE_ENV: 'production' }
          })
      │
      ↓
Next.js Production Server (pre-built)
Port: 3000 (or custom)
Opens: http://localhost:3000
```

## File Structure

### In Monorepo (Development)

```
moicad/
├── packages/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── commands/
│   │   │   │   └── launch.ts
│   │   │   └── utils/
│   │   │       └── paths.ts      ← Environment detection
│   │   ├── dist/                 ← Built CLI
│   │   ├── scripts/
│   │   │   └── bundle-app.sh     ← App bundling
│   │   └── package.json
│   │
│   └── app/                      ← Used in dev mode
│       ├── app/
│       ├── components/
│       ├── .next/                ← Generated on build
│       └── package.json
│
└── (CLI uses ../app in dev mode)
```

### After Global Install (Production)

```
/usr/local/lib/node_modules/@moicad/cli/
├── dist/
│   └── index.js                  ← CLI entry point
├── app-bundle/                   ← Bundled app
│   ├── .next/                    ← Pre-built Next.js
│   ├── public/                   ← Static files
│   ├── node_modules/             ← Production deps
│   │   ├── next/
│   │   ├── react/
│   │   ├── three/
│   │   └── @moicad/sdk/
│   └── package.json
├── package.json
└── README.md

/usr/local/bin/moicad → symlink to dist/index.js
```

## Key Files and Their Roles

| File | Role | Used In |
|------|------|---------|
| `src/index.ts` | CLI entry point, arg parsing | Dev & Prod |
| `src/commands/launch.ts` | Spawns web server | Dev & Prod |
| `src/utils/paths.ts` | Detects environment, resolves paths | Dev & Prod |
| `scripts/bundle-app.sh` | Bundles app during build | Build time |
| `scripts/pre-publish-check.sh` | Validates before publish | Pre-publish |
| `app-bundle/` | Bundled Next.js app | Prod only |

## Data Flow

```
User Command
     │
     ↓
CLI (dist/index.js)
     │
     ├─→ Parse args (--dev, --port, --open, etc.)
     │
     ↓
launch.ts
     │
     ├─→ Validate file path (if provided)
     ├─→ Detect environment (dev vs prod)
     ├─→ Get app path
     │
     ↓
Spawn Process
     │
     ├─→ Command: bun run dev|start
     ├─→ CWD: app-path
     ├─→ ENV: PORT, NODE_ENV, MOICAD_FILE
     │
     ↓
Next.js Server
     │
     ├─→ Start HTTP server
     ├─→ Load @moicad/sdk
     ├─→ Render React app
     │
     ↓
Auto-open Browser
     │
     └─→ http://localhost:<port>
```

## Environment Variables

| Variable | Set By | Used By | Purpose |
|----------|--------|---------|---------|
| `PORT` | CLI | Next.js | HTTP server port |
| `NODE_ENV` | CLI | Next.js | development or production |
| `MOICAD_FILE` | CLI | App | File to open on launch |

## Size Breakdown

| Component | Size | Notes |
|-----------|------|-------|
| `dist/index.js` | ~30 KB | CLI executable |
| `app-bundle/.next/` | ~5-10 MB | Next.js build output |
| `app-bundle/node_modules/` | ~40-80 MB | Dependencies (Next.js, Three.js, Monaco) |
| `app-bundle/public/` | ~1-5 MB | Static assets |
| **Total** | **~50-100 MB** | Self-contained package |

## Dependency Graph

```
@moicad/cli
    │
    ├─→ @moicad/sdk (from npm)
    ├─→ open (for browser launching)
    │
    └─→ app-bundle/
            │
            ├─→ next
            ├─→ react
            ├─→ react-dom
            ├─→ three
            ├─→ monaco-editor
            ├─→ @moicad/sdk
            └─→ [other app dependencies]
```

## Security Considerations

1. **Sandboxing**: CLI spawns separate process for app
2. **File access**: User files read from CWD, not CLI directory
3. **Network**: Only listens on localhost (not 0.0.0.0)
4. **Dependencies**: Production deps only in bundle (no dev tools)

## Performance

| Metric | Development | Production |
|--------|-------------|------------|
| Startup time | 3-5 seconds | 1-2 seconds |
| Hot reload | ✅ Yes | ❌ No |
| Memory usage | ~200-300 MB | ~150-200 MB |
| First render | Slower (compiling) | Faster (pre-built) |

## Error Handling

```
CLI Error Flow:

getAppPath()
    │
    ├─→ app-bundle exists? → Use it
    ├─→ monorepo app exists? → Use it
    └─→ Neither exists? → throw Error("Could not locate app")
             │
             ↓
        Error displayed to user
        Exit code: 1
```

## Future Enhancements

1. **Standalone output**: Use Next.js standalone mode to reduce size
2. **CDN assets**: Host large deps (Three.js, Monaco) on CDN
3. **Lazy loading**: Download app on first run (if size becomes issue)
4. **Caching**: Cache app bundle in user directory for faster updates
5. **Auto-update**: Check for updates and prompt user

---

**Status**: Architecture implemented and documented
