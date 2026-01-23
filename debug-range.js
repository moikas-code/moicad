// Test script for debugging
import { parseOpenSCAD } from './backend/scad-parser.ts';

function testRangeParsing() {
  console.log('=== Testing Range Parsing ===');
  
  const tests = [
    '[0:10]',
    'i = [0:10]',
    'for (i = [0:10])'
  ];
  
  for (const test of tests) {
    console.log(`\nParsing: ${test}`);
    const result = parseOpenSCAD(test);
    console.log('Success:', result.success);
    if (!result.success) {
      console.log('Errors:', result.errors);
    } else {
      console.log('AST:', JSON.stringify(result.ast, null, 2));
    }
  }
}

testRangeParsing();