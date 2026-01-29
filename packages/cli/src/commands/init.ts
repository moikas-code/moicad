/**
 * Init command - Initialize a new moicad project
 *
 * Usage: moicad init [name]
 */

import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { logger } from '../utils/logger';

interface InitOptions {
  name?: string;
}

export async function init(options: InitOptions) {
  const projectName = options.name || 'my-moicad-project';
  const projectDir = resolve(process.cwd(), projectName);

  if (existsSync(projectDir)) {
    logger.error(`Directory already exists: ${projectName}`);
    process.exit(1);
  }

  logger.info(`Creating new moicad project: ${projectName}`);

  try {
    // Create directory
    mkdirSync(projectDir, { recursive: true });

    // Create package.json
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'moicad',
        build: 'moicad build src/main.scad -O dist/model.json',
        export: 'moicad export src/main.scad -f stl -O dist/model.stl',
      },
      dependencies: {
        '@moicad/sdk': '^0.1.0',
      },
      devDependencies: {
        '@moicad/cli': '^0.1.0',
      },
    };

    writeFileSync(
      resolve(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create src directory
    mkdirSync(resolve(projectDir, 'src'), { recursive: true });

    // Create main.scad
    const mainScad = `// ${projectName}
// Created with moicad

// A simple example
cube(10);

// Try rotating it:
// rotate([45, 0, 0]) cube(10);

// Or make it more interesting:
// difference() {
//   cube(20, center=true);
//   sphere(12);
// }
`;

    writeFileSync(resolve(projectDir, 'src/main.scad'), mainScad);

    // Create main.js (JavaScript alternative)
    const mainJs = `// ${projectName}
// Created with moicad (JavaScript version)

import { Shape } from '@moicad/sdk';

// A simple cube
export default Shape.cube(10);

// Try the fluent API:
// export default Shape.cube(20)
//   .subtract(Shape.sphere(12))
//   .translate([0, 0, 5]);

// Or create an animation:
// export default function(t) {
//   return Shape.cube(10).rotate([t * 360, 0, 0]);
// }
`;

    writeFileSync(resolve(projectDir, 'src/main.js'), mainJs);

    // Create dist directory
    mkdirSync(resolve(projectDir, 'dist'), { recursive: true });

    // Create .gitignore
    const gitignore = `node_modules/
dist/
.next/
*.log
`;

    writeFileSync(resolve(projectDir, '.gitignore'), gitignore);

    // Create README.md
    const readme = `# ${projectName}

A moicad CAD project.

## Getting Started

\`\`\`bash
# Install dependencies
bun install

# Start the GUI
bun run dev

# Build to JSON
bun run build

# Export to STL
bun run export
\`\`\`

## Files

- \`src/main.scad\` - OpenSCAD source file
- \`src/main.js\` - JavaScript source file (alternative)
- \`dist/\` - Output directory for builds and exports

## Resources

- [moicad Documentation](https://moicad.moikas.com/docs)
- [OpenSCAD Cheat Sheet](https://openscad.org/cheatsheet/)
- [@moicad/sdk API](https://www.npmjs.com/package/@moicad/sdk)
`;

    writeFileSync(resolve(projectDir, 'README.md'), readme);

    logger.success(`Project created: ${projectName}`);
    logger.info('');
    logger.info('Next steps:');
    logger.info(`  cd ${projectName}`);
    logger.info('  bun install');
    logger.info('  bun run dev');

  } catch (error) {
    logger.error(`Failed to create project: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
