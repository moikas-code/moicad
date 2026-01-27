/**
 * Test setup for @moicad/sdk
 */

// Set up test environment
globalThis.console = console;

// Mock browser APIs if not available
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ style: {} }),
    body: { appendChild: () => {} }
  } as any;
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis as any;
}

// Initialize test environment
console.log('🧪 Test environment initialized');