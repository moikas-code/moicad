#!/usr/bin/env node
/**
 * Copy required files to dist folder for npm distribution
 * - manifold.wasm (CSG engine)
 * - csg-worker.js (Web Worker for non-blocking CSG)
 */

import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');
const staticDir = join(projectRoot, 'static');

// Ensure dist directory exists
import { mkdirSync } from 'fs';
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Find and copy manifold.wasm
const wasmPaths = [
  join(projectRoot, 'node_modules', 'manifold-3d', 'manifold.wasm'),
  join(projectRoot, '..', 'node_modules', 'manifold-3d', 'manifold.wasm'),
];

let sourceWasm = null;
for (const path of wasmPaths) {
  if (existsSync(path)) {
    sourceWasm = path;
    break;
  }
}

if (sourceWasm) {
  const destWasm = join(distDir, 'manifold.wasm');
  try {
    copyFileSync(sourceWasm, destWasm);
    console.log(`✓ Copied manifold.wasm to dist/`);
  } catch (error) {
    console.error(`❌ Failed to copy WASM: ${error.message}`);
    process.exit(1);
  }
} else {
  console.error('❌ manifold.wasm not found');
  process.exit(1);
}

// Find and copy csg-worker.js
const workerPaths = [
  // SDK in node_modules
  join(projectRoot, 'node_modules', '@moicad', 'sdk', 'dist', 'workers', 'csg-worker.js'),
  join(projectRoot, '..', 'node_modules', '@moicad', 'sdk', 'dist', 'workers', 'csg-worker.js'),
  // Local SDK build (monorepo)
  join(projectRoot, '..', '..', 'packages', 'sdk', 'dist', 'workers', 'csg-worker.js'),
];

let sourceWorker = null;
for (const path of workerPaths) {
  if (existsSync(path)) {
    sourceWorker = path;
    break;
  }
}

if (sourceWorker) {
  const destWorker = join(distDir, 'csg-worker.js');
  const destStaticWorker = join(staticDir, 'csg-worker.js');
  try {
    copyFileSync(sourceWorker, destWorker);
    console.log(`✓ Copied csg-worker.js to dist/`);
    
    // Also copy to static for dev mode
    if (existsSync(staticDir)) {
      copyFileSync(sourceWorker, destStaticWorker);
      console.log(`✓ Copied csg-worker.js to static/`);
    }
  } catch (error) {
    console.error(`❌ Failed to copy worker: ${error.message}`);
    process.exit(1);
  }
} else {
  console.error('⚠️  csg-worker.js not found - Web Worker support may not work');
  console.error('Searched:', workerPaths.join('\n  '));
  // Don't exit with error, as worker is optional (falls back to main thread)
}

console.log('\n✅ All files copied successfully');
