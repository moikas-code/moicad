# Vercel Deployment Guide

## Issue: Bun Workspace Installation Bug

Bun v1.3.7 has a bug where it creates symlinks to cached packages that are missing `package.json` files. This breaks Next.js Turbopack's module resolution for PostCSS plugins.

## Solution

We've implemented an automatic fix that runs after installation:

### 1. Postinstall Script

`packages/landing/scripts/fix-bun-modules.sh` automatically:
- Detects if Bun's installation is broken (missing package.json files)
- Uses npm to install critical dependencies properly
- Copies them to the correct location

### 2. Vercel Configuration

`packages/landing/vercel.json` tells Vercel to:
- Use **npm** instead of Bun for installation (more reliable)
- Run the SDK build before the landing build
- Use Next.js framework detection

## Vercel Setup Instructions

1. **Import the repository** to Vercel
2. **Set Root Directory** to `packages/landing`
3. **Framework Preset**: Next.js (should auto-detect)
4. **Build Settings** (should be auto-configured via vercel.json):
   - Install Command: `npm install`
   - Build Command: `cd ../sdk && npm run build && cd ../landing && npm run build`

## Testing the Fix Locally

```bash
# Clean install
cd packages/landing
rm -rf node_modules
bun install

# The postinstall script should run automatically and fix modules

# Verify build works
bun run build
```

## Alternative: Force npm on Vercel

If you prefer to explicitly use npm instead of auto-detection:

1. In Vercel Project Settings → General
2. Set "Package Manager" to "npm"
3. Vercel will use npm for all installations

## What Gets Fixed

The postinstall script ensures these critical packages have proper package.json files:
- `tailwindcss` - CSS framework
- `autoprefixer` - PostCSS plugin
- `postcss` - CSS processor
- `@types/node` - TypeScript types for Node.js
- `@types/react` - TypeScript types for React
- `@types/react-dom` - TypeScript types for React DOM
- `@monaco-editor/react` - Code editor component
- `monaco-editor` - Code editor core

## Monitoring

If the build fails on Vercel with "Cannot find module 'tailwindcss'":
1. Check that `postinstall` script ran in build logs
2. Verify vercel.json is being read
3. Confirm npm is being used (not bun)

## Future: When Bun Fixes This

Once Bun fixes the workspace symlink bug, you can:
1. Remove `vercel.json` (to use Bun)
2. Remove the `postinstall` script from package.json
3. Delete `scripts/fix-bun-modules.sh`
