import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

export function getMonorepoRoot(): string {
  // Get the directory of the current module
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Assuming CLI is at packages/cli/src/utils, root is four levels up
  return resolve(currentDir, '../../../..');
}

export function getAppPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));

  // In production (installed via npm): app-bundle is next to dist/
  // CLI structure: node_modules/@moicad/cli/dist/index.js
  const bundledAppPath = resolve(currentDir, '../../app-bundle');

  if (existsSync(bundledAppPath)) {
    return bundledAppPath;
  }

  // In development: use monorepo structure
  const monorepoRoot = getMonorepoRoot();
  const devAppPath = resolve(monorepoRoot, 'moicad/packages/app');

  if (existsSync(devAppPath)) {
    return devAppPath;
  }

  throw new Error('Could not locate app directory. Neither bundled nor development paths exist.');
}

export function isDevMode(): boolean {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const bundledAppPath = resolve(currentDir, '../../app-bundle');

  // If app-bundle doesn't exist, we're in dev mode
  return !existsSync(bundledAppPath);
}
