import { parseOpenSCAD } from './backend/scad-parser.ts';
import { evaluateAST, initWasm } from './backend/scad-evaluator.ts';

async function testEvaluation() {
  console.log('Testing children() evaluation...');
  
  try {
    // Initialize WASM (assuming it can be imported)
    await initWasm(null);
    
    const result = parseOpenSCAD('module test() { children(); } test() cube(5);');
    console.log('Parse success:', result.success);
    
    if (result.success && result.ast) {
      const evalResult = await evaluateAST(result.ast);
      console.log('Evaluation success:', evalResult.success);
      console.log('Errors:', evalResult.errors);
      console.log('Has geometry:', !!evalResult.geometry);
    }
  } catch (error) {
    console.log('Error:', (error as Error).message);
    console.log('Stack:', (error as Error).stack);
  }
}

testEvaluation();