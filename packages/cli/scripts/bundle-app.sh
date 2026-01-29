#!/bin/bash
set -e

echo "📦 Bundling app for CLI distribution..."

# Get directory paths
CLI_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$CLI_DIR/../app"
BUNDLE_DIR="$CLI_DIR/app-bundle"

# Clean previous bundle
rm -rf "$BUNDLE_DIR"
mkdir -p "$BUNDLE_DIR"

echo "🏗️  Building app..."
cd "$APP_DIR"

# Build the Next.js app
bun run build

echo "📋 Copying built app to CLI bundle..."
# Copy essential files for Next.js standalone operation
cp -r .next "$BUNDLE_DIR/"
#cp -r public "$BUNDLE_DIR/"
cp package.json "$BUNDLE_DIR/"
cp next.config.js "$BUNDLE_DIR/"

# Copy node_modules (only production dependencies)
echo "📚 Copying production dependencies..."
mkdir -p "$BUNDLE_DIR/node_modules"
cd "$APP_DIR"
bun install --production --cwd "$BUNDLE_DIR"

echo "✅ App bundled successfully at: $BUNDLE_DIR"
echo "📊 Bundle size:"
du -sh "$BUNDLE_DIR"
