#!/usr/bin/env node

/**
 * moicad Debug Utility - Tokenizer
 * 
 * Purpose: Debug and test OpenSCAD lexical tokenization
 * Tests tokenizer output for various language constructs and edge cases
 * 
 * Usage: node scripts/debug/tokenizer.js
 * 
 * Features tested:
 * - List comprehension tokenization
 * - Array syntax parsing
 * - Operator recognition
 * - Comment handling
 * - String literal parsing
 * 
 * Author: moicad debug system
 * Updated: 2026-01-26
 */

import { Tokenizer } from '../../backend/scad-parser.js';

/**
 * Test tokenizer with specific code snippet
 * @param {string} code - OpenSCAD code to tokenize
 * @param {string} description - Description of what's being tested
 */
function debugTokenization(code, description) {
  console.log(`\n🔍 Tokenizing: "${code}"`);
  console.log(`💡 Purpose: ${description}`);
  console.log('-'.repeat(60));
  
  try {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    
    console.log(`📊 Token Count: ${tokens.length}`);
    console.log('\n📝 Token Breakdown:');
    
    tokens.forEach((token, index) => {
      const location = `${token.line}:${token.column}`;
      const value = token.value.length > 20 
        ? token.value.substring(0, 17) + '...' 
        : token.value;
      console.log(`${index.toString().padStart(2)}: ${token.type.padEnd(12)} "${value.padEnd(20)} at ${location}`);
    });
    
    // Token analysis
    const tokenTypes = {};
    tokens.forEach(token => {
      tokenTypes[token.type] = (tokenTypes[token.type] || 0) + 1;
    });
    
    console.log('\n📈 Token Type Summary:');
    Object.entries(tokenTypes).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(15)}: ${count}`);
    });
    
  } catch (error) {
    console.log('💥 Tokenization Error:', error.message);
  }
  
  console.log('='.repeat(60));
}

/**
 * Run comprehensive tokenizer tests
 */
function runTokenizerTests() {
  console.log('🛠️  moicad Debug: Tokenizer Testing');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      code: '[ for (i=[0:10]) i*i ]',
      description: 'List comprehension with range and multiplication'
    },
    {
      code: '[i*i for i=[0:10]]',
      description: 'List comprehension with syntax error (extra bracket)'
    },
    {
      code: 'cube(10); // A comment',
      description: 'Simple function call with comment'
    },
    {
      code: 'text = "Hello, World!"; echo(text);',
      description: 'String assignment and echo function'
    },
    {
      code: 'module box(w=10,h=20,d=5) { cube([w,h,d]); }',
      description: 'Module definition with default parameters'
    },
    {
      code: 'function area(r) = PI * r * r;',
      description: 'Mathematical function with constants'
    },
    {
      code: 'if (x > 5) { sphere(10); } else { cube(5); }',
      description: 'Conditional statement with different shapes'
    },
    {
      code: 'translate([10, 0, 0]) rotate([0, 45, 0]) cube(8);',
      description: 'Chained transformations'
    }
  ];
  
  testCases.forEach(test => {
    debugTokenization(test.code, test.description);
  });
  
  console.log('\n🎯 Tokenizer Debug Complete!');
  console.log('💡 Tip: Use these results to verify parser token recognition');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTokenizerTests();
}

// Export for use in other debug scripts
export { debugTokenization, runTokenizerTests };