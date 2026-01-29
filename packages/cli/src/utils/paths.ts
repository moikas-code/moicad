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

  // In production (installed via npm): try to find @moicad/gui
  const installedAppPath = resolve(currentDir, '../../../@moicad/gui');

  if (existsSync(installedAppPath)) {
    return installedAppPath;
  }

  // In development: use monorepo structure
  const monorepoRoot = getMonorepoRoot();
  const devAppPath = resolve(monorepoRoot, 'packages/app');

  if (existsSync(devAppPath)) {
    return devAppPath;
  }

  throw new Error('Could not locate app directory. Run "moicad --install" to install @moicad/gui.');
}

export function isDevMode(): boolean {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const installedAppPath = resolve(currentDir, '../../../@moicad/gui');
  const monorepoRoot = getMonorepoRoot();
  const devAppPath = resolve(monorepoRoot, 'packages/app');

  // If neither installed app nor dev app exists, we're in dev mode (or need install)
  return !(existsSync(installedAppPath) || existsSync(devAppPath));
}
