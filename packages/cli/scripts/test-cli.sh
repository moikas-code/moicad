#!/bin/bash
set -e

echo "🧪 Testing CLI in different modes..."
echo ""

CLI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$CLI_DIR"

# Test 1: Dev mode (should auto-detect monorepo)
echo "1️⃣  Testing dev mode (monorepo detection)..."
echo "   Running: bun src/index.ts --help"
bun src/index.ts --help
echo "   ✅ Dev mode help works"
echo ""

# Test 2: Built CLI (should still use monorepo in dev env)
echo "2️⃣  Testing built CLI (no app-bundle yet)..."
echo "   Running: ./dist/index.js --help"
./dist/index.js --help
echo "   ✅ Built CLI help works"
echo ""

# Test 3: Version check
echo "3️⃣  Testing version command..."
echo "   Running: ./dist/index.js --version"
./dist/index.js --version
echo "   ✅ Version command works"
echo ""

echo "✅ All tests passed!"
echo ""
echo "📝 Next steps:"
echo "   1. Run 'bun run build' to create production bundle with app"
echo "   2. Test with 'npm link' before publishing"
echo "   3. Publish with 'npm publish'"
