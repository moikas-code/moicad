// Test just imports
import { parseOpenSCAD } from './backend/scad-parser.ts';

async function testImports() {
  console.log('=== Testing Import Statements ===');
  
  const tests = [
    'import "shapes.scad";',
    'include "utils.scad";',
    'use "modules.scad";',
    'import <system/shapes.scad>;'
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

testImports();