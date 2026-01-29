# Publishing @moicad/cli to npm

## Pre-publish Checklist

- [ ] All tests passing in monorepo
- [ ] SDK package is published at correct version
- [ ] App builds successfully
- [ ] CLI tested locally with `npm link`
- [ ] Version bumped appropriately

## Publishing Steps

### 1. Prepare the SDK

The CLI depends on `@moicad/sdk`, so publish that first if needed:

```bash
cd packages/sdk
npm version patch  # or minor/major
bun run build
npm publish
```

### 2. Update CLI Dependencies

If you published a new SDK version, update the CLI's package.json:

```bash
cd packages/cli
# Change "@moicad/sdk": "workspace:*" to "@moicad/sdk": "^0.1.x"
```

**Important**: Before publishing, replace workspace protocol:

```json
// Before (for monorepo dev)
{
  "dependencies": {
    "@moicad/sdk": "workspace:*"
  }
}

// After (for npm)
{
  "dependencies": {
    "@moicad/sdk": "^0.1.10"  // Match published SDK version
  }
}
```

### 3. Build the Package

This will:
1. Build the app (`prebuild` script)
2. Bundle app into `app-bundle/`
3. Build the CLI code

```bash
cd packages/cli
bun run build
```

**Expected output:**
```
📦 Bundling app for CLI distribution...
🏗️  Building app...
📋 Copying built app to CLI bundle...
📚 Copying production dependencies...
✅ App bundled successfully at: app-bundle/
📊 Bundle size: ~XX MB
```

### 4. Test Locally

Before publishing, test with `npm link`:

```bash
# Link the package globally
npm link

# Test it
moicad --help
moicad --version

# Try launching (Ctrl+C to stop)
moicad

# Test with a file
echo 'cube(10);' > test.scad
moicad test.scad

# Unlink when done
npm unlink -g @moicad/cli
```

### 5. Verify Package Contents

Check what will be published:

```bash
npm pack --dry-run
```

Should include:
- `dist/index.js` - CLI executable
- `app-bundle/` - Bundled Next.js app
- `package.json`, `README.md`

Should NOT include:
- `src/` - Source files
- `node_modules/` (CLI's dev deps)
- `*.log`, `.DS_Store`

### 6. Version Bump

```bash
# Patch: 0.1.0 -> 0.1.1 (bug fixes)
npm version patch

# Minor: 0.1.0 -> 0.2.0 (new features)
npm version minor

# Major: 0.1.0 -> 1.0.0 (breaking changes)
npm version major
```

This will:
- Update `package.json` version
- Create a git tag
- Commit the change

### 7. Publish

```bash
# Dry run first (see what would be published)
npm publish --dry-run

# Actual publish
npm publish

# Or with public access if scoped package
npm publish --access public
```

### 8. Verify Publication

```bash
# Install globally from npm
npm install -g @moicad/cli

# Test it works
moicad --version
moicad --help

# Try launching
moicad
```

### 9. Tag and Push

```bash
git push
git push --tags
```

## Troubleshooting

### "Cannot find app-bundle"

**Problem**: CLI can't locate the bundled app after install.

**Solution**:
- Verify `app-bundle/` is in the published package: `npm pack` and extract
- Check `files` field in package.json includes `"app-bundle"`
- Ensure `.npmignore` doesn't exclude `app-bundle/`

### "Package size too large"

**Problem**: npm complains about package size (>100 MB warning).

**Solution**:
- This is expected (Next.js + Three.js + Monaco)
- Optimize by removing unused dependencies from app
- Consider using external CDN for large assets
- Or split into multiple packages (not recommended for simplicity)

### "Module not found: @moicad/sdk"

**Problem**: SDK not found after global install.

**Solution**:
- Ensure SDK is published to npm first
- Change `"@moicad/sdk": "workspace:*"` to actual version like `"^0.1.10"`
- Rebuild and republish

### "Port already in use"

**Problem**: User has something on port 3000.

**Solution**: User can use `moicad --port 3001`

## Rollback a Bad Publish

If you published a broken version:

```bash
# Deprecate the bad version
npm deprecate @moicad/cli@0.1.5 "Broken release, use 0.1.6 instead"

# Or unpublish within 24 hours
npm unpublish @moicad/cli@0.1.5
```

## Update Strategy

For users to update:

```bash
# Check current version
moicad --version

# Update via CLI
moicad --update

# Or manually
npm update -g @moicad/cli
```

## Size Optimization Tips

To reduce package size in future:

1. **Use Next.js standalone output**:
   ```js
   // next.config.js
   output: 'standalone'
   ```

2. **Externalize large deps**:
   - Use CDN for Three.js, Monaco
   - Lazy load Monaco editor

3. **Remove unused locales**:
   - Strip unused i18n from dependencies

4. **Optimize images**:
   - Compress images in `public/`
   - Use WebP format

5. **Tree-shake dependencies**:
   - Ensure proper ESM imports
   - Use webpack bundle analyzer

## CI/CD Publishing

For automated publishing:

```yaml
# .github/workflows/publish-cli.yml
name: Publish CLI
on:
  push:
    tags:
      - 'cli-v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd packages/cli && bun run build
      - run: cd packages/cli && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Version Strategy

Recommended versioning:

- **0.1.x** - Alpha releases (current)
- **0.2.x** - Beta releases (feature complete)
- **1.0.0** - First stable release
- **1.x.x** - Stable with backwards compatibility
- **2.0.0** - Breaking changes

## Post-Publish Checklist

- [ ] Test global install: `npm install -g @moicad/cli`
- [ ] Verify npm page: https://www.npmjs.com/package/@moicad/cli
- [ ] Update main README with install instructions
- [ ] Announce on Discord/Twitter/etc.
- [ ] Create GitHub release with changelog
- [ ] Update documentation site

---

**Note**: After first successful publish, consider automating with CI/CD.
