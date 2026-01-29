#!/usr/bin/env bun

import { parseArgs } from 'util';
import { launch } from './commands/launch';
import { update } from './commands/update';
import { version } from './commands/version';

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    dev: { type: 'boolean', short: 'd' },
    update: { type: 'boolean', short: 'u' },
    version: { type: 'boolean', short: 'v' },
    help: { type: 'boolean', short: 'h' },
    port: { type: 'string', short: 'p' },
    open: { type: 'boolean', short: 'o' }
  }
});

// Show help
if (values.help) {
  console.log(`
moicad - Modern JavaScript CAD Platform

Usage:
  moicad                   Launch web UI
  moicad [file]            Launch web UI and open file
  moicad --dev             Launch in development mode (for plugin testing)
  moicad --update          Update moicad to latest version
  moicad --version         Show version info
  moicad --help            Show this help

Options:
  -d, --dev                Development mode with hot reload
  -u, --update             Update to latest version
  -p, --port <port>        Port number (default: 3000)
  -o, --open               Auto-open browser
  -v, --version            Show version
  -h, --help               Show help

Examples:
  moicad                   # Start web UI at http://localhost:3000
  moicad design.scad       # Open design.scad in web UI
  moicad --dev             # Start in dev mode for plugin development
  moicad --update          # Update to latest version
  `);
  process.exit(0);
}

// Show version
if (values.version) {
  version();
  process.exit(0);
}

// Update
if (values.update) {
  await update();
  process.exit(0);
}

// Get file path from positionals (if provided)
const filePath = positionals[0];

// Launch web UI (default behavior)
await launch({
  filePath,
  devMode: values.dev || false,
  port: values.port,
  open: values.open
});
