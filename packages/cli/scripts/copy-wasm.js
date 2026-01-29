#!/usr/bin/env node
/**
 * Copy manifold.wasm to dist folder for npm distribution
 * Ensures WASM is available when CLI is installed globally
 */

import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');

// Find manifold.wasm in node_modules
const possiblePaths = [
  join(projectRoot, 'node_modules', 'manifold-3d', 'manifold.wasm'),
  join(projectRoot, '..', '..', 'node_modules', 'manifold-3d', 'manifold.wasm'),
];

let sourceWasm = null;
for (const path of possiblePaths) {
  if (existsSync(path)) {
    sourceWasm = path;
    break;
  }
}

if (!sourceWasm) {
  console.error('❌ manifold.wasm not found in any expected location');
  console.error('Searched:', possiblePaths.join('\n  '));
  process.exit(1);
}

const destWasm = join(projectRoot, 'dist', 'manifold.wasm');

try {
  copyFileSync(sourceWasm, destWasm);
  console.log(`✓ Copied manifold.wasm to dist/`);
  console.log(`  Source: ${sourceWasm}`);
  console.log(`  Dest:   ${destWasm}`);
} catch (error) {
  console.error(`❌ Failed to copy WASM: ${error.message}`);
  process.exit(1);
}
