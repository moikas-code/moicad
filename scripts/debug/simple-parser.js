#!/usr/bin/env node

/**
 * moicad Debug Utility - Simple Parser
 * 
 * Purpose: Quick, focused testing of specific parsing scenarios
 * Ideal for rapid debugging of individual syntax elements
 * 
 * Usage: node scripts/debug/simple-parser.js
 * 
 * Test Cases:
 * - Basic array range parsing
 * - Variable assignment with arrays
 * - Simple list comprehensions
 * 
 * Author: moicad debug system
 * Updated: 2026-01-26
 */

import { parseOpenSCAD } from '../../backend/scad-parser.js';

/**
 * Test simple parsing scenarios
 */
function debugSimpleParser() {
  console.log('🔍 moicad Debug: Simple Parser Testing');
  console.log('=' .repeat(40));
  
  const simpleTests = [
    {
      name: 'Basic Array Range',
      code: '[0:5]',
      description: 'Simple range from 0 to 5'
    },
    {
      name: 'Variable Range Assignment',
      code: 'numbers = [0:9]',
      description: 'Assign range to variable'
    },
    {
      name: 'Empty Array',
      code: '[]',
      description: 'Empty array literal'
    },
    {
      name: 'Single Element Array',
      code: '[42]',
      description: 'Array with single number'
    },
    {
      name: 'Multiple Elements',
      code: '[1, 2, 3, 4, 5]',
      description: 'Array with multiple elements'
    }
  ];
  
  simpleTests.forEach(test => {
    console.log(`\n📋 Test: ${test.name}`);
    console.log(`📝 Code: ${test.code}`);
    console.log(`💡 ${test.description}`);
    console.log('-'.repeat(30));
    
    try {
      const startTime = performance.now();
      const result = parseOpenSCAD(test.code);
      const endTime = performance.now();
      
      console.log(`⏱️  Parse Time: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📊 Success: ${result.success ? '✅' : '❌'}`);
      
      if (result.success) {
        console.log('🌳 AST:');
        console.log(JSON.stringify(result.ast, null, 2));
      } else {
        console.log('🚨 Errors:');
        if (result.errors) {
          result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error.message || error}`);
          });
        }
      }
    } catch (error) {
      console.log('💥 Exception:', error.message);
    }
  });
  
  console.log('\n🎯 Simple Parser Debug Complete!');
  console.log('💡 Tip: Use for quick syntax validation before complex testing');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debugSimpleParser();
}

export { debugSimpleParser };
