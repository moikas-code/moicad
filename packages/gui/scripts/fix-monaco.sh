#!/bin/bash
# Fix broken Bun symlinks for monaco-editor packages
# This is needed because Bun caches incomplete packages

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUI_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$GUI_DIR")")"

echo "Fixing monaco-editor symlinks..."

# Remove broken symlinks
rm -rf "$GUI_DIR/node_modules/@monaco-editor"
rm -f "$GUI_DIR/node_modules/monaco-editor"
rm -f "$GUI_DIR/node_modules/state-local"

# Create directories
mkdir -p "$GUI_DIR/node_modules/@monaco-editor"

# Create symlinks to root node_modules
ln -sf "$ROOT_DIR/node_modules/@monaco-editor/react" "$GUI_DIR/node_modules/@monaco-editor/react"
ln -sf "$ROOT_DIR/node_modules/@monaco-editor/loader" "$GUI_DIR/node_modules/@monaco-editor/loader"
ln -sf "$ROOT_DIR/node_modules/monaco-editor" "$GUI_DIR/node_modules/monaco-editor"
ln -sf "$ROOT_DIR/node_modules/state-local" "$GUI_DIR/node_modules/state-local"

echo "Monaco symlinks fixed!"
