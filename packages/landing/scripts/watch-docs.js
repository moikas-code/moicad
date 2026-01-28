#!/usr/bin/env node

const { spawn } = require('child_process');
const { watch } = require('fs');
const path = require('path');

console.log('🚀 Starting documentation auto-update mode...');
console.log('📚 Watching SDK source for changes...');
console.log('🔧 TypeDoc will regenerate on file changes');
console.log('⏸️ Press Ctrl+C to stop watching');

// Watch SDK source files
const sdkPath = path.resolve(__dirname, '../../packages/sdk/src');
const docsPath = path.resolve(__dirname, 'app/docs/docs-data.json');

console.log(`📁 SDK Path: ${sdkPath}`);
console.log(`📄 Docs Data Path: ${docsPath}`);

let isRegenerating = false;

function regenerateDocs() {
  if (isRegenerating) {
    console.log('⏳ Documentation generation already in progress...');
    return;
  }

  isRegenerating = true;
  console.log('🔄 Regenerating documentation...');
  
  const typedoc = spawn('bun', ['run', 'docs:json'], {
    cwd: path.resolve(__dirname, '../sdk'),
    stdio: 'inherit'
  });

  typedoc.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Documentation regenerated successfully!');
      console.log('🔄 Restarting Next.js development server...');
      
      // Trigger Next.js hot reload by touching the docs page
      const { execSync } = require('child_process');
      execSync(`touch "${path.resolve(__dirname, 'app/docs/page.tsx')}"`);
      
      isRegenerating = false;
    } else {
      console.error(`❌ Documentation generation failed with code ${code}`);
      isRegenerating = false;
    }
  });
}

// Initial generation
regenerateDocs();

// Watch for changes in SDK source
watch(sdkPath, { recursive: true }, (eventType, filename) => {
  if (filename.endsWith('.ts') || filename.endsWith('.tsx')) {
    console.log(`📝 SDK file changed: ${filename}`);
    setTimeout(regenerateDocs, 500); // Small delay to avoid multiple rebuilds
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\\n👋 Stopping documentation watcher...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n👋 Stopping documentation watcher...');
  process.exit(0);
});