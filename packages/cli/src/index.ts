#!/usr/bin/env bun

import { parseArgs } from 'util';
import { launch } from './commands/launch';
import { update } from './commands/update';
import { install } from './commands/install';
import { version } from './commands/version';
import { serve } from './commands/serve';

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    dev: { type: 'boolean', short: 'd' },
    update: { type: 'boolean', short: 'u' },
    install: { type: 'boolean', short: 'i' },
    version: { type: 'boolean', short: 'v' },
    help: { type: 'boolean', short: 'h' },
    port: { type: 'string', short: 'p' },
    open: { type: 'boolean', short: 'o' },
    format: { type: 'string', short: 'f' },
    output: { type: 'string', short: 'O' },
  }
});

// Get command from first positional
const command = positionals[0];

// Show help
if (values.help || command === 'help') {
  console.log(`
moicad - Modern JavaScript CAD Platform

Usage:
  moicad                       Launch web UI (alias for 'moicad launch')
  moicad launch [file]         Launch web UI and optionally open file
  moicad serve                 Start server without opening browser
  moicad build <file>          Compile file to geometry JSON
  moicad export <file>         Export file to STL/OBJ
  moicad init [name]           Initialize a new project
  moicad --update              Update moicad to latest version
  moicad --version             Show version info

Commands:
  launch [file]                Start GUI and optionally open a file
  serve                        Start API server without browser
  build <file>                 Compile OpenSCAD/JS to geometry JSON
  export <file>                Export to STL or OBJ format
  init [name]                  Create a new moicad project

Options:
  -d, --dev                    Development mode with hot reload
  -i, --install                Install @moicad/gui for standalone use
  -u, --update                 Update to latest version
  -p, --port <port>            Port number (default: 42069)
  -o, --open                   Auto-open browser (default: true for launch)
  -f, --format <format>        Export format: stl, obj (default: stl)
  -O, --output <file>          Output file path
  -v, --version                Show version
  -h, --help                   Show help

Examples:
  moicad                       # Start web UI at http://localhost:42069
  moicad launch design.scad    # Open design.scad in web UI
  moicad serve --port 8080     # Start server on port 8080
  moicad build model.scad      # Compile to JSON
  moicad export model.scad -f stl -O model.stl
  moicad init my-project       # Create new project
  `);
  process.exit(0);
}

// Show version
if (values.version || command === 'version') {
  version();
  process.exit(0);
}

// Install
if (values.install) {
  await install();
  process.exit(0);
}

// Update
if (values.update || command === 'update') {
  await update();
  process.exit(0);
}

// Handle commands
switch (command) {
  case 'serve':
    await serve({
      port: values.port,
      dev: values.dev || false,
    });
    break;

  case 'build':
    const buildFile = positionals[1];
    if (!buildFile) {
      console.error('Error: build requires a file path');
      console.error('Usage: moicad build <file>');
      process.exit(1);
    }
    const { build } = await import('./commands/build');
    await build({
      filePath: buildFile,
      output: values.output,
    });
    break;

  case 'export':
    const exportFile = positionals[1];
    if (!exportFile) {
      console.error('Error: export requires a file path');
      console.error('Usage: moicad export <file> -f stl|obj');
      process.exit(1);
    }
    const { exportCommand } = await import('./commands/export');
    await exportCommand({
      filePath: exportFile,
      format: (values.format as 'stl' | 'obj') || 'stl',
      output: values.output,
    });
    break;

  case 'init':
    const projectName = positionals[1];
    const { init } = await import('./commands/init');
    await init({ name: projectName });
    break;

  case 'launch':
  default:
    // Default: launch web UI
    const filePath = command === 'launch' ? positionals[1] : positionals[0];
    await launch({
      filePath,
      devMode: values.dev || false,
      port: values.port,
      open: values.open,
    });
    break;
}
