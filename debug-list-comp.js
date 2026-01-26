// Debug script for list comprehension parsing
import { parseOpenSCAD } from './backend/scad-parser.ts';

function debugParsing(code) {
  console.log(`=== Parsing: "${code}" ===`);
  try {
    const result = parseOpenSCAD(code);
    console.log('Success:', result.success);
    console.log('Errors:', result.errors);
    console.log('AST:', JSON.stringify(result.ast, null, 2));
  } catch (error) {
    console.log('Exception:', error.message);
  }
}

// Test simple cases first
debugParsing('[1, 2, 3]');
debugParsing('[for]');
console.log('About to test list comprehension...');

// Set a timeout to prevent hanging
const timeout = setTimeout(() => {
  console.log('TIMEOUT - List comprehension parsing hangs!');
  process.exit(1);
}, 5000);

try {
  debugParsing('[ for (i = [0:5]) i ]');
  clearTimeout(timeout);
} catch (error) {
  clearTimeout(timeout);
  console.log('Exception during parsing:', error.message);
}
