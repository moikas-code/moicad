# CLI Quick Reference

## Development

```bash
# Run in dev mode (uses monorepo app with hot reload)
bun run dev

# Build CLI only (no app bundling)
bun run build:quick

# Full build (bundles app)
bun run build

# Run tests
bun run test
```

## Publishing

```bash
# Pre-publish checklist
bash scripts/pre-publish-check.sh

# Full publish workflow
bun run build               # Build with app bundle
npm version patch           # Bump version
npm publish --access public # Publish to npm
```

## Testing Locally

```bash
# Test before publishing
npm link                    # Link globally
moicad --help               # Test help
moicad                      # Test launch
npm unlink -g @moicad/cli   # Unlink
```

## User Commands (after install)

```bash
# Install
npm install -g @moicad/cli

# Usage
moicad                      # Launch web UI
moicad design.scad          # Open file
moicad --dev                # Dev mode
moicad --port 3001          # Custom port
moicad --no-open            # Don't auto-open browser
moicad --update             # Update to latest
moicad --version            # Show version
moicad --help               # Show help
```

## Important Files

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point |
| `src/commands/launch.ts` | Launch logic |
| `src/utils/paths.ts` | Path detection (dev vs prod) |
| `scripts/bundle-app.sh` | App bundling script |
| `scripts/pre-publish-check.sh` | Pre-publish validation |
| `app-bundle/` | Bundled web app (created on build) |

## Environment Detection

| Environment | Detection | App Path | Command |
|-------------|-----------|----------|---------|
| Dev (monorepo) | No `app-bundle/` exists | `moicad/packages/app` | `bun run dev` |
| Prod (npm) | `app-bundle/` exists | `app-bundle/` | `bun run start` |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find app" | Run `bun run build` to create app-bundle |
| "workspace:* in deps" | Change to published version before `npm publish` |
| "Port in use" | Use `moicad --port <other-port>` |
| Large package size | Expected (~50-100 MB with Next.js + Three.js) |

## Before Publishing Checklist

- [ ] SDK published at correct version
- [ ] Update SDK dependency from `workspace:*` to `^0.1.x`
- [ ] Run `bun run build` (creates app-bundle)
- [ ] Run `bash scripts/pre-publish-check.sh`
- [ ] Test with `npm link`
- [ ] Bump version with `npm version`
- [ ] Publish with `npm publish --access public`
- [ ] Test global install: `npm i -g @moicad/cli`

## Package Contents (when published)

```
@moicad/cli/
├── dist/index.js           # CLI executable (30 KB)
├── app-bundle/             # Bundled app (~50-100 MB)
│   ├── .next/              # Next.js build
│   ├── public/             # Static assets
│   ├── node_modules/       # Production deps
│   └── package.json        # App config
├── package.json            # CLI metadata
└── README.md               # Documentation
```

Total: ~50-100 MB (acceptable for a full-featured CAD platform)
