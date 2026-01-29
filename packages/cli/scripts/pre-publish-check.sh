#!/bin/bash
set -e

echo "🔍 Pre-publish Checklist for @moicad/cli"
echo "========================================="
echo ""

CLI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$CLI_DIR"

ERRORS=0

# Check 1: SDK dependency
echo "1️⃣  Checking SDK dependency..."
SDK_DEP=$(cat package.json | grep -A1 '"dependencies"' | grep '@moicad/sdk' | cut -d'"' -f4)
if [[ "$SDK_DEP" == "workspace:*" ]]; then
  echo "   ⚠️  WARNING: SDK still uses workspace protocol"
  echo "   Action: Update to published version like '@moicad/sdk': '^0.1.10'"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ SDK dependency: $SDK_DEP"
fi
echo ""

# Check 2: App-bundle should NOT exist (new architecture)
echo "2️⃣  Checking app-bundle removed..."
if [ ! -d "app-bundle" ]; then
  echo "   ✅ app-bundle correctly removed (separate packages architecture)"
else
  echo "   ❌ ERROR: app-bundle still exists"
  echo "   Action: Remove app-bundle directory (CLI now uses separate @moicad/gui)"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 3: Dist exists
echo "3️⃣  Checking dist build..."
if [ -f "dist/index.js" ]; then
  echo "   ✅ dist/index.js exists"
else
  echo "   ❌ ERROR: dist/index.js not found"
  echo "   Action: Run 'bun run build' to create dist"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Files field in package.json
echo "4️⃣  Checking package.json files field..."
if grep -q '"files"' package.json && grep -q '"dist"' package.json && ! grep -q '"app-bundle"' package.json; then
  echo "   ✅ 'files' field includes dist only (correct for separate packages)"
else
  echo "   ❌ ERROR: 'files' field incorrect"
  echo "   Action: Ensure package.json has: \"files\": [\"dist\"]"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 5: Version
echo "5️⃣  Checking version..."
VERSION=$(cat package.json | grep '"version"' | cut -d'"' -f4)
echo "   Current version: $VERSION"
echo "   ℹ️  Remember to bump version before publishing"
echo ""

# Check 6: Test CLI
echo "6️⃣  Testing CLI executable..."
if ./dist/index.js --version > /dev/null 2>&1; then
  echo "   ✅ CLI runs successfully"
else
  echo "   ❌ ERROR: CLI fails to run"
  echo "   Action: Test with './dist/index.js --version'"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 7: README exists
echo "7️⃣  Checking documentation..."
if [ -f "README.md" ]; then
  echo "   ✅ README.md exists"
else
  echo "   ⚠️  WARNING: README.md missing"
fi
echo ""

# Summary
echo "========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed! Ready to publish."
  echo ""
  echo "Next steps:"
  echo "  1. Review version: npm version patch|minor|major"
  echo "  2. Test locally: npm link"
  echo "  3. Publish: npm publish --access public"
  exit 0
else
  echo "❌ $ERRORS error(s) found. Fix them before publishing."
  exit 1
fi
