// Test just the range parsing
import { parseOpenSCAD } from './backend/scad-parser.ts';

console.log('Testing simple array with range-like syntax:');
const result = parseOpenSCAD('[0:5]');
console.log('Success:', result.success);
console.log('AST:', JSON.stringify(result.ast, null, 2));
