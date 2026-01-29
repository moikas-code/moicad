import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export function getMonorepoRoot(): string {
  // Get the directory of the current module
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Assuming CLI is at packages/cli/src/utils, root is four levels up
  return resolve(currentDir, '../../../..');
}
