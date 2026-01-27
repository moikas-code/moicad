/**
 * Manifold WASM Engine Initialization
 *
 * This module initializes the manifold-3d WASM module and provides
 * a centralized access point for the Manifold constructor and utilities.
 */

import Module from 'manifold-3d';

// Singleton instance
let manifoldWasm: any = null;
let Manifold: any = null;

/**
 * Initialize the manifold WASM module.
 * This function is idempotent - calling it multiple times returns the same instance.
 *
 * @returns Object containing the WASM module and Manifold constructor
 */
export async function initManifold() {
  if (!manifoldWasm) {
    console.log('[Manifold] Initializing WASM module...');
    const startTime = performance.now();

    manifoldWasm = await Module();
    manifoldWasm.setup();
    Manifold = manifoldWasm.Manifold;

    const endTime = performance.now();
    console.log(`[Manifold] Initialized in ${(endTime - startTime).toFixed(2)}ms`);
  }

  return { manifoldWasm, Manifold };
}

/**
 * Get the initialized Manifold constructor.
 * Throws if manifold has not been initialized yet.
 */
export function getManifold() {
  if (!Manifold) {
    throw new Error('Manifold not initialized. Call initManifold() first.');
  }
  return Manifold;
}

/**
 * Get the initialized WASM module.
 * Throws if manifold has not been initialized yet.
 */
export function getManifoldWasm() {
  if (!manifoldWasm) {
    throw new Error('Manifold WASM not initialized. Call initManifold() first.');
  }
  return manifoldWasm;
}

/**
 * Check if manifold has been initialized.
 */
export function isManifoldInitialized(): boolean {
  return manifoldWasm !== null && Manifold !== null;
}

// Export for direct use (after initialization)
export { Manifold, manifoldWasm };
