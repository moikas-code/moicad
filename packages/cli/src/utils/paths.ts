import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

/**
 * Get the monorepo root directory
 */
export function getMonorepoRoot(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // CLI is at packages/cli/src/utils, root is four levels up
  return resolve(currentDir, '../../../..');
}

/**
 * Get the GUI package path
 *
 * Checks multiple locations:
 * 1. Production: installed @moicad/gui in node_modules
 * 2. Development: packages/gui in monorepo
 */
export function getGuiPath(): string | null {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  // In production (installed via npm): look for @moicad/gui in node_modules
  const possibleProductionPaths = [
    resolve(currentDir, '../../../@moicad/gui'),           // Sibling in node_modules
    resolve(currentDir, '../../../../@moicad/gui'),        // Global install
    resolve(process.cwd(), 'node_modules/@moicad/gui'),    // Local project
  ];

  for (const path of possibleProductionPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // In development: use monorepo structure
  const monorepoRoot = getMonorepoRoot();
  const devGuiPath = resolve(monorepoRoot, 'packages/gui');

  if (existsSync(devGuiPath)) {
    return devGuiPath;
  }

  return null;
}

/**
 * Check if we're running in development mode
 *
 * Returns true ONLY if:
 * - Explicitly enabled via MOICAD_DEV=1 environment variable
 *
 * Default is always production mode for simplicity.
 */
export function isDevMode(): boolean {
  // Only enable dev mode if explicitly requested
  return process.env.MOICAD_DEV === '1';
}

/**
 * Get the SDK package path
 */
export function getSdkPath(): string | null {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  // Production paths
  const possibleProductionPaths = [
    resolve(currentDir, '../../../@moicad/sdk'),
    resolve(process.cwd(), 'node_modules/@moicad/sdk'),
  ];

  for (const path of possibleProductionPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Development path
  const monorepoRoot = getMonorepoRoot();
  const devSdkPath = resolve(monorepoRoot, 'packages/sdk');

  if (existsSync(devSdkPath)) {
    return devSdkPath;
  }

  return null;
}
