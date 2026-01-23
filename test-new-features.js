// Test script for new features
import { parseOpenSCAD } from './backend/scad-parser.ts';

async function testListComprehensions() {
  console.log('=== Testing List Comprehensions ===');
  
  // Start with a simpler test
  const tests = [
    '[ for (i = [0:5]) i ]'
  ];
  
  for (const test of tests) {
    console.log(`\nParsing: ${test}`);
    try {
      const result = parseOpenSCAD(test);
      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Errors:', result.errors);
      } else {
        console.log('AST:', JSON.stringify(result.ast, null, 2));
      }
    } catch (error) {
      console.log('Exception:', error.message);
    }
  }
}

async function testImportStatements() {
  console.log('\n=== Testing Import Statements ===');
  
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

async function main() {
  try {
    await testListComprehensions();
    await testImportStatements();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();