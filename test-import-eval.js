// Test import evaluation functionality
import { parseOpenSCAD } from './backend/scad-parser.ts';
import { evaluateAST, initWasm } from './backend/scad-evaluator.ts';

async function testImportEvaluation() {
  console.log('=== Testing Import Evaluation ===');
  
  // Test import parsing only first (avoid WASM issues for now)
  console.log('\n1. Testing import parsing:');
  const importCode = 'use "modules.scad";\nbox(10, 20, 5);';
  const importParse = parseOpenSCAD(importCode);
  if (importParse.success) {
    console.log('Import parse SUCCESS!');
    console.log('AST:', JSON.stringify(importParse.ast, null, 2));
  } else {
    console.log('Import parse FAILED:', importParse.errors);
  }
}

testImportEvaluation();