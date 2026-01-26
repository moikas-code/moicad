import { parseOpenSCAD } from './backend/scad-parser.js';

// Simple test to check if parsing works without infinite loops
console.log('Testing simple children() parsing...');

try {
  const result = parseOpenSCAD('children();');
  console.log('Success:', result.success);
  if (!result.success) {
    console.log('Errors:', result.errors);
  } else {
    console.log('AST nodes:', result.ast.length);
    console.log('First node type:', result.ast[0]?.type);
  }
} catch (error) {
  console.log('Error during parsing:', error.message);
}

try {
  const result2 = parseOpenSCAD('module test() { children(); }');
  console.log('\nModule test success:', result2.success);
  if (!result2.success) {
    console.log('Module errors:', result2.errors);
  } else {
    console.log('Module AST nodes:', result2.ast.length);
  }
} catch (error) {
  console.log('Error during module parsing:', error.message);
}