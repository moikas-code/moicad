import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getMonorepoRoot } from '../utils/paths';

export function version() {
  try {
    const root = getMonorepoRoot();
    const pkgPath = resolve(root, 'packages/cli/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    console.log(`moicad v${pkg.version}`);
    console.log('Modern JavaScript CAD Platform');
  } catch (error) {
    console.log('moicad v0.1.0');
  }
}
