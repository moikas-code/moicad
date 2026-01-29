#!/bin/bash
# Fix Bun's broken symlinks by copying critical dependencies
# This runs after bun install to ensure package.json files exist

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LANDING_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_MODULES="$LANDING_DIR/node_modules"

echo "Checking for critical dependencies..."

# Check if tailwindcss has package.json
if [ ! -f "$NODE_MODULES/tailwindcss/package.json" ]; then
  echo "Bun installation is broken (missing package.json files)"
  echo "Installing critical dependencies with npm..."

  # Create temp directory
  TEMP_DIR=$(mktemp -d)
  cd "$TEMP_DIR"

  # Install with npm
  npm init -y > /dev/null 2>&1
  npm install \
    tailwindcss@3.4.19 \
    autoprefixer@10.4.23 \
    postcss@8.5.6 \
    @types/node@20.19.30 \
    @types/react@19.2.10 \
    @types/react-dom@19.2.3 \
    @types/three@0.160.0 \
    @monaco-editor/react@4.7.0 \
    monaco-editor@0.55.1 \
    three@0.160.0 \
    --no-save --loglevel=error

  # Copy to landing node_modules
  echo "Copying modules to $NODE_MODULES..."
  rm -rf "$NODE_MODULES/tailwindcss" "$NODE_MODULES/autoprefixer" "$NODE_MODULES/postcss"
  rm -rf "$NODE_MODULES/@types/node" "$NODE_MODULES/@types/react" "$NODE_MODULES/@types/react-dom" "$NODE_MODULES/@types/three"
  rm -rf "$NODE_MODULES/@monaco-editor" "$NODE_MODULES/monaco-editor" "$NODE_MODULES/three"

  # Sync all dependencies
  rsync -a node_modules/ "$NODE_MODULES/"

  # Cleanup
  cd - > /dev/null
  rm -rf "$TEMP_DIR"

  echo "✓ Critical dependencies fixed"
else
  echo "✓ Critical dependencies OK"
fi
