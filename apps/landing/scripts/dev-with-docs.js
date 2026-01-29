#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting development environment with auto-updating documentation...');
console.log('');

// Start the documentation watcher
const watcher = spawn('node', ['scripts/watch-docs.js'], {
  stdio: 'inherit'
});

// Start Next.js dev server
const devServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit'
});

// Handle cleanup
function cleanup() {
  console.log('\\n👋 Shutting down development servers...');
  watcher.kill();
  devServer.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle process exits
watcher.on('close', (code) => {
  console.log(`\\n📚 Documentation watcher exited with code ${code}`);
  devServer.kill();
  process.exit(code || 0);
});

devServer.on('close', (code) => {
  console.log(`\\n🌐 Development server exited with code ${code}`);
  watcher.kill();
  process.exit(code || 0);
});