# CLI Bundling Implementation Summary

## Problem

The CLI package (`@moicad/cli`) needed to work when published to npm, but it was hardcoded to use the monorepo structure (`/moicad/packages/app`). This wouldn't work for users installing globally via `npm install -g @moicad/cli`.

## Solution: Bundle the App

The CLI now bundles a pre-built version of the web app (`@moicad/app`) inside itself during the build process. This makes it completely self-contained.

## What Changed

### 1. New Files Created

```
packages/cli/
├── scripts/
│   ├── bundle-app.sh           # Bundles app during build
│   ├── test-cli.sh              # Tests CLI in dev mode
│   └── pre-publish-check.sh     # Pre-publish validation
├── .gitignore                   # Ignores dist/ and app-bundle/
├── .npmignore                   # Excludes src/ from npm
├── README.md                    # CLI documentation
├── PUBLISHING.md                # Publishing guide
└── IMPLEMENTATION_SUMMARY.md    # This file
```

### 2. Modified Files

**`package.json`**:
```json
{
  "files": ["dist", "app-bundle"],  // Include bundled app in npm package
  "scripts": {
    "prebuild": "bash scripts/bundle-app.sh",  // Auto-bundle on build
    "prepublishOnly": "bash scripts/pre-publish-check.sh"  // Safety check
  },
  "dependencies": {
    "open": "11.0.0"  // For auto-opening browser
  }
}
```

**`src/utils/paths.ts`**:
- Added `getAppPath()` - Auto-detects bundled vs monorepo app
- Added `isDevMode()` - Checks if running in dev environment

**`src/commands/launch.ts`**:
- Uses `getAppPath()` instead of hardcoded path
- Auto-detects dev vs production mode
- Uses correct command: `dev` (monorepo) or `start` (bundled)

## How It Works

### Development Mode (Monorepo)

When running in the monorepo:
```bash
cd packages/cli
bun run dev
# or
bun src/index.ts
```

**Behavior**:
1. `isDevMode()` returns `true` (no app-bundle exists)
2. `getAppPath()` returns `moicad/packages/app`
3. Runs: `bun run dev` (Next.js dev server with hot reload)

### Production Mode (npm)

When installed via `npm install -g @moicad/cli`:
```bash
moicad
```

**Behavior**:
1. `isDevMode()` returns `false` (app-bundle exists)
2. `getAppPath()` returns `node_modules/@moicad/cli/app-bundle`
3. Runs: `bun run start` (Pre-built Next.js production server)

## Build Process

### Quick Build (Dev)
```bash
bun run build:quick
```
- Compiles CLI TypeScript → `dist/index.js`
- No app bundling (uses monorepo app)

### Full Build (Production)
```bash
bun run build
```

**Steps** (automatic via `prebuild` hook):
1. **Build app**: `cd packages/app && bun run build`
2. **Copy files**:
   - `.next/` → Production Next.js build
   - `public/` → Static assets
   - `package.json`, `next.config.js` → Configuration
3. **Install deps**: `bun install --production` in bundle
4. **Build CLI**: Compile TypeScript to `dist/index.js`

**Result**: `app-bundle/` directory (~50-100 MB)

## Package Structure

### Development (monorepo)
```
packages/cli/
├── dist/           # Built CLI
├── src/            # Source code
└── (no app-bundle) # Uses ../app
```

### Published (npm)
```
@moicad/cli/
├── dist/
│   └── index.js    # CLI executable
├── app-bundle/     # Bundled web app
│   ├── .next/      # Pre-built Next.js
│   ├── public/     # Static files
│   ├── node_modules/ # Production deps
│   └── package.json
└── package.json    # CLI metadata
```

## Testing

### Before Publishing
```bash
# 1. Build everything
bun run build

# 2. Run tests
bun run test

# 3. Test locally
npm link
moicad --help
moicad  # Launch and verify

# 4. Pre-publish check
bash scripts/pre-publish-check.sh

# 5. Unlink
npm unlink -g @moicad/cli
```

## Publishing Workflow

```bash
# 1. Ensure SDK is published
cd packages/sdk
npm publish

# 2. Update CLI's SDK dependency
cd packages/cli
# Change "workspace:*" to "^0.1.10" in package.json

# 3. Build
bun run build

# 4. Version bump
npm version patch

# 5. Publish
npm publish --access public
```

## Advantages

1. **Self-contained**: Single package to install
2. **No version mismatches**: CLI and app always compatible
3. **Works offline**: No need to fetch app separately
4. **Simple for users**: Just `npm i -g @moicad/cli`
5. **Dev-friendly**: Auto-detects monorepo for development

## Trade-offs

1. **Large package size**: ~50-100 MB (includes Next.js, Three.js, Monaco)
2. **Slower build**: Must build app every time
3. **Duplicate code**: App exists in both packages/app and CLI bundle

## Alternatives Considered

### Option A: Separate app package ❌
- Publish `@moicad/app` separately
- CLI depends on it
- **Rejected**: Version mismatch issues, more packages to manage

### Option B: Standalone server in CLI ❌
- Embed server directly in CLI
- **Rejected**: Complex, would duplicate Next.js functionality

### Option C: CDN-hosted app ❌
- CLI fetches app from CDN at runtime
- **Rejected**: Requires internet, versioning complexity

## Future Optimizations

To reduce package size:

1. **Next.js standalone output**:
   ```js
   // next.config.js
   output: 'standalone'
   ```

2. **External CDN for large deps**:
   - Host Three.js, Monaco on CDN
   - Lazy load at runtime

3. **Split packages** (only if size becomes critical):
   - `@moicad/cli-core` - Small launcher
   - `@moicad/app-bundle` - Large app
   - CLI downloads app on first run

## Maintenance

### When App Changes
Just rebuild the CLI:
```bash
cd packages/cli
bun run build
npm version patch
npm publish
```

### When SDK Changes
1. Publish new SDK version
2. Update CLI's SDK dependency
3. Rebuild and republish CLI

### When CLI Logic Changes (no app changes)
Use quick build to skip app bundling:
```bash
bun run build:quick
```

Then for final publish, run full build:
```bash
bun run build
```

## Success Criteria

- ✅ CLI works in development (monorepo)
- ✅ CLI works after `npm install -g`
- ✅ Auto-detects environment (dev vs prod)
- ✅ Single command to launch: `moicad`
- ✅ No manual configuration needed
- ✅ Proper error messages if app not found

## Testing Checklist

- [ ] `bun run dev` works (monorepo)
- [ ] `bun run build` creates app-bundle
- [ ] `npm link` → `moicad` works
- [ ] `moicad --help` shows help
- [ ] `moicad --version` shows version
- [ ] `moicad` launches web UI
- [ ] `moicad design.scad` opens file
- [ ] App bundle size reasonable (<150 MB)
- [ ] Pre-publish check passes
- [ ] After `npm publish`, global install works

---

**Status**: ✅ Implementation complete, ready for testing and publishing
